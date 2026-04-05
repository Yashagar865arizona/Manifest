import { db } from "@/lib/db";
import { format, subDays } from "date-fns";
import { signOAuthState } from "@/lib/oauth-state";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function getGoogleOAuthUrl(workspaceId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email openid",
    access_type: "offline",
    prompt: "consent",
    state: signOAuthState(workspaceId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google OAuth error: ${data.error_description}`);
  return data;
}

export class GoogleTokenRevokedError extends Error {
  constructor() {
    super("Google refresh token has been revoked");
    this.name = "GoogleTokenRevokedError";
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) {
    // invalid_grant means the token was revoked or expired permanently
    if (data.error === "invalid_grant") throw new GoogleTokenRevokedError();
    throw new Error(`Google token refresh error: ${data.error_description}`);
  }
  return data;
}

interface CalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; responseStatus: string; self?: boolean }>;
  organizer?: { email: string; self?: boolean };
}

async function getValidToken(credential: {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  workspaceId: string;
}): Promise<string> {
  const accessToken = decryptToken(credential.accessToken);
  if (credential.tokenExpiresAt && credential.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return accessToken;
  }
  if (!credential.refreshToken) throw new Error("Google token expired and no refresh token available");

  let refreshed: { access_token: string; expires_in: number };
  try {
    refreshed = await refreshGoogleToken(decryptToken(credential.refreshToken));
  } catch (err) {
    if (err instanceof GoogleTokenRevokedError) {
      // Mark connector as ERROR so syncs stop and UI shows reconnect prompt
      await db.connectorCredential.update({
        where: { workspaceId_connectorType: { workspaceId: credential.workspaceId, connectorType: "GOOGLE_CALENDAR" } },
        data: { status: "ERROR" },
      });
    }
    throw err;
  }

  await db.connectorCredential.update({
    where: { workspaceId_connectorType: { workspaceId: credential.workspaceId, connectorType: "GOOGLE_CALENDAR" } },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/**
 * Compute meeting hours, focus time, and 1:1 count from calendar events.
 * A "focus block" is any gap of 90+ minutes without a meeting.
 * A "1:1" is a meeting with exactly 2 attendees.
 */
function analyzeEvents(events: CalendarEvent[], userEmail: string): {
  meetingHours: number;
  focusTimeHours: number;
  eventCount: number;
  oneOnOneCount: number;
} {
  const WORK_START = 9 * 60; // 9am in minutes
  const WORK_END = 18 * 60;  // 6pm in minutes
  const WORK_MINUTES = WORK_END - WORK_START;

  let meetingMinutes = 0;
  let oneOnOneCount = 0;
  const meetingSlots: Array<[number, number]> = [];

  for (const event of events) {
    if (!event.start.dateTime || !event.end.dateTime) continue;
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const durationMin = (end.getTime() - start.getTime()) / 60000;
    if (durationMin <= 0 || durationMin > 480) continue;

    // Check if user accepted
    const userAttendee = event.attendees?.find((a) => a.email === userEmail);
    if (event.attendees && event.attendees.length > 0 && userAttendee?.responseStatus === "declined") continue;

    meetingMinutes += durationMin;
    meetingSlots.push([
      start.getHours() * 60 + start.getMinutes(),
      end.getHours() * 60 + end.getMinutes(),
    ]);

    // 1:1 detection
    const acceptedAttendees = (event.attendees ?? []).filter(
      (a) => a.responseStatus !== "declined"
    );
    if (acceptedAttendees.length === 2) oneOnOneCount++;
  }

  // Compute focus time = work hours minus meeting slots, only counting 90+ min blocks
  const occupiedMinutes = new Set<number>();
  for (const [s, e] of meetingSlots) {
    const clampedStart = Math.max(s, WORK_START);
    const clampedEnd = Math.min(e, WORK_END);
    for (let m = clampedStart; m < clampedEnd; m++) occupiedMinutes.add(m);
  }

  let focusMinutes = 0;
  let blockStart: number | null = null;
  for (let m = WORK_START; m <= WORK_END; m++) {
    if (!occupiedMinutes.has(m)) {
      if (blockStart === null) blockStart = m;
    } else {
      if (blockStart !== null) {
        const blockLen = m - blockStart;
        if (blockLen >= 90) focusMinutes += blockLen;
        blockStart = null;
      }
    }
  }
  if (blockStart !== null) {
    const blockLen = WORK_END - blockStart;
    if (blockLen >= 90) focusMinutes += blockLen;
  }

  return {
    meetingHours: Math.round((meetingMinutes / 60) * 10) / 10,
    focusTimeHours: Math.round((focusMinutes / 60) * 10) / 10,
    eventCount: events.length,
    oneOnOneCount,
  };
}

export async function syncGoogleCalendarSignalsForDate(workspaceId: string, date: string): Promise<void> {
  const credential = await db.connectorCredential.findUnique({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "GOOGLE_CALENDAR" } },
  });
  if (!credential || credential.status !== "ACTIVE") return;

  const accessToken = await getValidToken({
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    tokenExpiresAt: credential.tokenExpiresAt,
    workspaceId,
  });

  const timeMin = new Date(date + "T00:00:00Z").toISOString();
  const timeMax = new Date(date + "T23:59:59Z").toISOString();

  const workspaceMembers = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, email: true } } },
  });

  const upserts = [];

  for (const member of workspaceMembers) {
    if (!member.user?.email) continue;
    const email = member.user.email;
    const userId = member.user.id;

    try {
      const events = await fetchCalendarEvents(accessToken, email, timeMin, timeMax);
      const stats = analyzeEvents(events, email);

      upserts.push(
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId, signalType: "MEETING_HOURS", signalDate: date } },
          create: { workspaceId, userId, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: stats.meetingHours, signalDate: date },
          update: { value: stats.meetingHours },
        }),
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId, signalType: "FOCUS_TIME_HOURS", signalDate: date } },
          create: { workspaceId, userId, connectorType: "GOOGLE_CALENDAR", signalType: "FOCUS_TIME_HOURS", value: stats.focusTimeHours, signalDate: date },
          update: { value: stats.focusTimeHours },
        }),
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId, signalType: "CALENDAR_EVENTS_COUNT", signalDate: date } },
          create: { workspaceId, userId, connectorType: "GOOGLE_CALENDAR", signalType: "CALENDAR_EVENTS_COUNT", value: stats.eventCount, signalDate: date },
          update: { value: stats.eventCount },
        }),
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId, signalType: "ONEONONE_COUNT", signalDate: date } },
          create: { workspaceId, userId, connectorType: "GOOGLE_CALENDAR", signalType: "ONEONONE_COUNT", value: stats.oneOnOneCount, signalDate: date },
          update: { value: stats.oneOnOneCount },
        })
      );
    } catch {
      // Non-fatal: user may not have calendar access delegated
    }
  }

  await Promise.all(upserts);

  await db.connectorCredential.update({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "GOOGLE_CALENDAR" } },
    data: { lastSyncAt: new Date() },
  });
}

export async function backfillGoogleCalendarSignals(workspaceId: string, days = 30): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  for (let i = 1; i <= days; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    await syncGoogleCalendarSignalsForDate(workspaceId, date);
  }
  await syncGoogleCalendarSignalsForDate(workspaceId, today);
}
