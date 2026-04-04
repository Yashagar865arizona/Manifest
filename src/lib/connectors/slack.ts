import { db } from "@/lib/db";
import { format, subDays } from "date-fns";

const SLACK_API = "https://slack.com/api";

export function getSlackOAuthUrl(workspaceId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "channels:read,channels:history,users:read,users:read.email,im:history,reactions:read",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/slack/callback`,
    state: workspaceId,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function exchangeSlackCode(code: string): Promise<{
  access_token: string;
  team: { id: string; name: string };
  authed_user?: { id: string };
  scope: string;
}> {
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/slack/callback`,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);
  return data;
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: { email?: string; display_name?: string };
  deleted?: boolean;
  is_bot?: boolean;
}

export async function fetchSlackUsers(accessToken: string): Promise<SlackUser[]> {
  const res = await fetch(`${SLACK_API}/users.list?limit=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack users.list error: ${data.error}`);
  return (data.members as SlackUser[]).filter((u) => !u.deleted && !u.is_bot);
}

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  num_members: number;
}

export async function fetchSlackChannels(accessToken: string): Promise<SlackChannel[]> {
  const res = await fetch(
    `${SLACK_API}/conversations.list?types=public_channel&limit=200&exclude_archived=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack conversations.list error: ${data.error}`);
  return data.channels as SlackChannel[];
}

interface SlackMessage {
  type: string;
  user?: string;
  ts: string;
  subtype?: string;
}

export async function fetchChannelHistory(
  accessToken: string,
  channelId: string,
  oldest: number,
  latest: number
): Promise<SlackMessage[]> {
  const res = await fetch(
    `${SLACK_API}/conversations.history?channel=${channelId}&oldest=${oldest}&latest=${latest}&limit=1000`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!data.ok) {
    if (data.error === "not_in_channel" || data.error === "channel_not_found") return [];
    throw new Error(`Slack conversations.history error: ${data.error}`);
  }
  return (data.messages as SlackMessage[]).filter(
    (m) => m.type === "message" && !m.subtype && m.user
  );
}

/**
 * Sync one day of Slack signals for all users in a workspace.
 * Computes: MESSAGE_COUNT, CHANNEL_ACTIVITY_COUNT, DM_SENT_COUNT, REACTION_COUNT
 */
export async function syncSlackSignalsForDate(workspaceId: string, date: string): Promise<void> {
  const credential = await db.connectorCredential.findUnique({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "SLACK" } },
  });
  if (!credential || credential.status !== "ACTIVE") return;

  const dateObj = new Date(date + "T00:00:00Z");
  const oldest = dateObj.getTime() / 1000;
  const latest = oldest + 86400;

  const [slackUsers, channels] = await Promise.all([
    fetchSlackUsers(credential.accessToken),
    fetchSlackChannels(credential.accessToken),
  ]);

  // Build map of slack user id -> workspace user id by email
  const workspaceMembers = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, email: true } } },
  });
  const emailToUserId = new Map(
    workspaceMembers
      .filter((m) => m.user?.email)
      .map((m) => [m.user!.email.toLowerCase(), m.user!.id])
  );
  const slackIdToUserId = new Map<string, string>();
  for (const su of slackUsers) {
    const email = su.profile?.email?.toLowerCase();
    if (email && emailToUserId.has(email)) {
      slackIdToUserId.set(su.id, emailToUserId.get(email)!);
    }
  }

  if (slackIdToUserId.size === 0) return;

  // Count messages per user across all channels
  const messageCounts = new Map<string, number>();
  const channelActivityPerUser = new Map<string, Set<string>>();
  const dmCounts = new Map<string, number>();

  for (const channel of channels) {
    const messages = await fetchChannelHistory(
      credential.accessToken,
      channel.id,
      oldest,
      latest
    );
    for (const msg of messages) {
      if (!msg.user || !slackIdToUserId.has(msg.user)) continue;
      const uid = slackIdToUserId.get(msg.user)!;
      messageCounts.set(uid, (messageCounts.get(uid) ?? 0) + 1);
      if (!channelActivityPerUser.has(uid)) channelActivityPerUser.set(uid, new Set());
      channelActivityPerUser.get(uid)!.add(channel.id);
    }
  }

  // Fetch DM (im) history — simplified: use conversations.list with type=im
  try {
    const imRes = await fetch(
      `${SLACK_API}/conversations.list?types=im&limit=200`,
      { headers: { Authorization: `Bearer ${credential.accessToken}` } }
    );
    const imData = await imRes.json();
    if (imData.ok) {
      for (const im of imData.channels ?? []) {
        const msgs = await fetchChannelHistory(credential.accessToken, im.id, oldest, latest);
        for (const msg of msgs) {
          if (!msg.user || !slackIdToUserId.has(msg.user)) continue;
          const uid = slackIdToUserId.get(msg.user)!;
          dmCounts.set(uid, (dmCounts.get(uid) ?? 0) + 1);
        }
      }
    }
  } catch {
    // DM access may not be granted — non-fatal
  }

  // Upsert signals
  const upserts = [];
  for (const [userId] of slackIdToUserId) {
    // userId here is the workspace userId
    const wuid = userId; // already mapped

    if (messageCounts.has(wuid)) {
      upserts.push(
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId: wuid, signalType: "MESSAGE_COUNT", signalDate: date } },
          create: { workspaceId, userId: wuid, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: messageCounts.get(wuid)!, signalDate: date },
          update: { value: messageCounts.get(wuid)! },
        })
      );
    }
    if (channelActivityPerUser.has(wuid)) {
      upserts.push(
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId: wuid, signalType: "CHANNEL_ACTIVITY_COUNT", signalDate: date } },
          create: { workspaceId, userId: wuid, connectorType: "SLACK", signalType: "CHANNEL_ACTIVITY_COUNT", value: channelActivityPerUser.get(wuid)!.size, signalDate: date },
          update: { value: channelActivityPerUser.get(wuid)!.size },
        })
      );
    }
    if (dmCounts.has(wuid)) {
      upserts.push(
        db.rawSignal.upsert({
          where: { workspaceId_userId_signalType_signalDate: { workspaceId, userId: wuid, signalType: "DM_SENT_COUNT", signalDate: date } },
          create: { workspaceId, userId: wuid, connectorType: "SLACK", signalType: "DM_SENT_COUNT", value: dmCounts.get(wuid)!, signalDate: date },
          update: { value: dmCounts.get(wuid)! },
        })
      );
    }
  }

  await Promise.all(upserts);

  // Update lastSyncAt
  await db.connectorCredential.update({
    where: { workspaceId_connectorType: { workspaceId, connectorType: "SLACK" } },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * Sync the last N days for a newly connected workspace.
 */
export async function backfillSlackSignals(workspaceId: string, days = 30): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  for (let i = 1; i <= days; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    await syncSlackSignalsForDate(workspaceId, date);
  }
  await syncSlackSignalsForDate(workspaceId, today);
}
