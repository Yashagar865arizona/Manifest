import { db } from "@/lib/db";
import { format, subDays } from "date-fns";
import type { SignalType, AnomalyType, SignalSeverity } from "@prisma/client";

// ─────────────────────────────────────────────
// BASELINE COMPUTATION
// ─────────────────────────────────────────────

/**
 * Compute and upsert rolling 30-day baselines for every user in a workspace.
 * Runs after daily signal sync.
 */
export async function computeBaselines(workspaceId: string): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  const windowStart = format(subDays(new Date(), 30), "yyyy-MM-dd");

  // Get all unique (userId, signalType) pairs in the window
  const rawData = await db.rawSignal.groupBy({
    by: ["userId", "signalType"],
    where: {
      workspaceId,
      signalDate: { gte: windowStart, lte: today },
    },
    _avg: { value: true },
    _count: { value: true },
  });

  // Also compute std dev per group
  const upserts = [];
  for (const row of rawData) {
    if (!row._avg.value) continue;

    // Fetch all values for std dev calculation
    const signals = await db.rawSignal.findMany({
      where: {
        workspaceId,
        userId: row.userId,
        signalType: row.signalType,
        signalDate: { gte: windowStart, lte: today },
      },
      select: { value: true },
    });

    const values = signals.map((s) => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    upserts.push(
      db.userBaseline.upsert({
        where: {
          workspaceId_userId_signalType: {
            workspaceId,
            userId: row.userId,
            signalType: row.signalType,
          },
        },
        create: {
          workspaceId,
          userId: row.userId,
          signalType: row.signalType,
          baselineValue: mean,
          stdDev,
          sampleCount: values.length,
          windowDays: 30,
          computedAt: new Date(),
        },
        update: {
          baselineValue: mean,
          stdDev,
          sampleCount: values.length,
          computedAt: new Date(),
        },
      })
    );
  }

  await Promise.all(upserts);
}

// ─────────────────────────────────────────────
// ANOMALY DETECTION
// ─────────────────────────────────────────────

function zscore(value: number, baseline: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - baseline) / stdDev;
}

function severityFromZscore(z: number, direction: "below" | "above"): SignalSeverity | null {
  const abs = Math.abs(z);
  if (direction === "below" && z > -1) return null;
  if (direction === "above" && z < 1) return null;
  if (abs >= 3) return "CRITICAL";
  if (abs >= 2) return "HIGH";
  if (abs >= 1.5) return "MEDIUM";
  return "LOW";
}

/**
 * Detect anomalies for all users in a workspace for a given date.
 *
 * The 5 core signals detected:
 *   1. GHOST_DETECTION  — >2 std dev below 30-day baseline for 5+ consecutive days
 *   2. OVERLOAD         — 6+ hours of meetings/day for 5+ consecutive days
 *   3. ATTRITION_RISK   — reduced Slack + reduced GitHub + tenure < 18 months (all three)
 *   4. MEETING_DEBT     — >40% of working hours (3.2h/day) in meetings over the past week
 *   5. STALLED_WORK     — 0 commits for 7+ consecutive calendar days (≈ 5 business days)
 *
 * Creates AnomalyAlert records. Auto-resolves previously open alerts when signal normalizes.
 */
export async function detectAnomalies(workspaceId: string, date: string): Promise<void> {
  const todaySignals = await db.rawSignal.findMany({
    where: { workspaceId, signalDate: date },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (todaySignals.length === 0) return;

  const baselines = await db.userBaseline.findMany({ where: { workspaceId } });
  const baselineMap = new Map(
    baselines.map((b) => [`${b.userId}:${b.signalType}`, b])
  );

  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // ═══════════════════════════════════════════
  // Signal 1: Ghost Detection
  // Rule: user with established activity baseline drops >2 standard deviations below their
  // rolling 30-day average for MESSAGE_COUNT or COMMITS_COUNT for 5+ consecutive days.
  // Severity: HIGH — going quiet for a week is a meaningful disengagement signal.
  // ═══════════════════════════════════════════
  for (const member of members) {
    if (!member.user) continue;
    const { id: userId, name, email } = member.user;

    let ghostConfirmed = false;
    for (const signalType of ["MESSAGE_COUNT", "COMMITS_COUNT"] as const) {
      const baseline = baselineMap.get(`${userId}:${signalType}`);
      // Require an established positive baseline with enough samples to trust std dev
      if (!baseline || baseline.baselineValue <= 0 || baseline.sampleCount < 7) continue;

      const last5Days = Array.from({ length: 5 }, (_, i) =>
        format(subDays(new Date(date), i), "yyyy-MM-dd")
      );
      const recentSignals = await db.rawSignal.findMany({
        where: { workspaceId, userId, signalType, signalDate: { in: last5Days } },
        select: { value: true },
      });
      // All 5 days must be synced — if data is missing we cannot confirm the pattern
      if (recentSignals.length < 5) continue;

      // Every day's value must be more than 2 standard deviations below the baseline
      const allQuiet = recentSignals.every(
        (s) => zscore(s.value, baseline.baselineValue, baseline.stdDev) < -2
      );
      if (allQuiet) {
        ghostConfirmed = true;
        break;
      }
    }

    if (ghostConfirmed) {
      const existing = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "GHOST_DETECTION", resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (!existing) {
        await db.anomalyAlert.create({
          data: {
            workspaceId,
            userId,
            anomalyType: "GHOST_DETECTION",
            severity: "HIGH",
            title: `${name ?? email} has gone quiet`,
            detail: `Activity dropped >2 std deviations below 30-day baseline on Slack/GitHub for 5+ consecutive days.`,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // Signal 2: Overload
  // Rule: 6+ hours of calendar meetings per day for 5+ consecutive days.
  // Severity: MEDIUM — calendar overload is urgent but not immediately critical.
  // ═══════════════════════════════════════════
  const OVERLOAD_HOURS_THRESHOLD = 6;
  const OVERLOAD_CONSECUTIVE_DAYS = 5;

  for (const member of members) {
    if (!member.user) continue;
    const { id: userId, name, email } = member.user;

    const last5Days = Array.from({ length: OVERLOAD_CONSECUTIVE_DAYS }, (_, i) =>
      format(subDays(new Date(date), i), "yyyy-MM-dd")
    );
    const meetingSignals = await db.rawSignal.findMany({
      where: { workspaceId, userId, signalType: "MEETING_HOURS", signalDate: { in: last5Days } },
      select: { value: true, signalDate: true },
    });

    // Need all 5 days synced with meeting data, each day at/above the absolute threshold
    if (
      meetingSignals.length >= OVERLOAD_CONSECUTIVE_DAYS &&
      meetingSignals.every((s) => s.value >= OVERLOAD_HOURS_THRESHOLD)
    ) {
      const existing = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "OVERLOAD", resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (!existing) {
        const avgHours = meetingSignals.reduce((s, r) => s + r.value, 0) / meetingSignals.length;
        await db.anomalyAlert.create({
          data: {
            workspaceId,
            userId,
            anomalyType: "OVERLOAD",
            severity: "MEDIUM",
            title: `${name ?? email} may be overloaded`,
            detail: `${avgHours.toFixed(1)}h/day in meetings for ${meetingSignals.length} consecutive days (threshold: ${OVERLOAD_HOURS_THRESHOLD}h/day).`,
            signalType: "MEETING_HOURS",
            currentValue: avgHours,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // Signal 3: Attrition Risk
  // Rule: Combination of three conditions — ALL must be present:
  //   (a) Reduced Slack communication: MESSAGE_COUNT z-score < -1 (7-day avg vs baseline)
  //   (b) Reduced GitHub output: COMMITS_COUNT z-score < -1 (7-day avg vs baseline)
  //   (c) Member tenure under 18 months (joinedAt)
  // Severity: CRITICAL — early attrition signal in at-risk window.
  // ═══════════════════════════════════════════
  for (const member of members) {
    if (!member.user) continue;
    const { id: userId, name, email } = member.user;

    // (c) Tenure gate: joinedAt must exist and be < 18 months ago
    if (!member.joinedAt) continue;
    const tenureMonths = Math.floor(
      (new Date(date).getTime() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    if (tenureMonths >= 18) continue;

    const msgBaseline = baselineMap.get(`${userId}:MESSAGE_COUNT`);
    const commitsBaseline = baselineMap.get(`${userId}:COMMITS_COUNT`);
    // Both baselines must be established with sufficient samples
    if (!msgBaseline || !commitsBaseline) continue;
    if (msgBaseline.sampleCount < 5 || commitsBaseline.sampleCount < 5) continue;

    // Use 7-day rolling average to avoid single-day noise
    const last7Days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(date), i), "yyyy-MM-dd")
    );
    const msgSignals = await db.rawSignal.findMany({
      where: { workspaceId, userId, signalType: "MESSAGE_COUNT", signalDate: { in: last7Days } },
      select: { value: true },
    });
    const commitSignals = await db.rawSignal.findMany({
      where: { workspaceId, userId, signalType: "COMMITS_COUNT", signalDate: { in: last7Days } },
      select: { value: true },
    });
    // Need at least 3 data points for each to compute a meaningful average
    if (msgSignals.length < 3 || commitSignals.length < 3) continue;

    const avgMsg = msgSignals.reduce((s, r) => s + r.value, 0) / msgSignals.length;
    const avgCommits = commitSignals.reduce((s, r) => s + r.value, 0) / commitSignals.length;
    const msgZ = zscore(avgMsg, msgBaseline.baselineValue, msgBaseline.stdDev);
    const commitsZ = zscore(avgCommits, commitsBaseline.baselineValue, commitsBaseline.stdDev);

    // (a) + (b): Both signals must be down — partial reduction is not enough
    if (msgZ < -1 && commitsZ < -1) {
      const existing = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "ATTRITION_RISK", resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (!existing) {
        await db.anomalyAlert.create({
          data: {
            workspaceId,
            userId,
            anomalyType: "ATTRITION_RISK",
            severity: "CRITICAL",
            title: `Attrition risk signal for ${name ?? email}`,
            detail: `Slack: ${avgMsg.toFixed(1)} msg/day (baseline: ${msgBaseline.baselineValue.toFixed(1)}), commits: ${avgCommits.toFixed(1)}/day (baseline: ${commitsBaseline.baselineValue.toFixed(1)}). Tenure: ${tenureMonths} months.`,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // Signal 4: Meeting Debt
  // Rule: Average MEETING_HOURS > 40% of an 8-hour workday (3.2h/day) over the past 7 days.
  // Severity: MEDIUM — unsustainable meeting load that erodes focus time.
  // ═══════════════════════════════════════════
  const WORKDAY_HOURS = 8;
  const MEETING_DEBT_THRESHOLD = WORKDAY_HOURS * 0.4; // 3.2 hours

  for (const member of members) {
    if (!member.user) continue;
    const { id: userId, name, email } = member.user;

    const last7Days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(date), i), "yyyy-MM-dd")
    );
    const meetingSignals = await db.rawSignal.findMany({
      where: { workspaceId, userId, signalType: "MEETING_HOURS", signalDate: { in: last7Days } },
      select: { value: true },
    });
    // Require at least 3 days to avoid false positives from a single heavy day
    if (meetingSignals.length < 3) continue;

    const avgHours = meetingSignals.reduce((s, r) => s + r.value, 0) / meetingSignals.length;

    if (avgHours > MEETING_DEBT_THRESHOLD) {
      const existing = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "MEETING_DEBT", resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (!existing) {
        const pct = Math.round((avgHours / WORKDAY_HOURS) * 100);
        await db.anomalyAlert.create({
          data: {
            workspaceId,
            userId,
            anomalyType: "MEETING_DEBT",
            severity: "MEDIUM",
            title: `${name ?? email} has excessive meeting load`,
            detail: `${avgHours.toFixed(1)}h/day in meetings over the past 7 days (${pct}% of ${WORKDAY_HOURS}hr workday). Threshold: 40%.`,
            signalType: "MEETING_HOURS",
            currentValue: avgHours,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // Signal 5: Stalled Work
  // Rule: User with an established commit baseline has 0 commits for 7+ consecutive calendar
  // days (approximately 5 business days, accounting for weekends in the raw signal stream).
  // Severity: LOW — work slowdown is an awareness signal; manager should investigate.
  // ═══════════════════════════════════════════
  for (const member of members) {
    if (!member.user) continue;
    const { id: userId, name, email } = member.user;

    const commitsBaseline = baselineMap.get(`${userId}:COMMITS_COUNT`);
    // Only flag users who normally commit — no baseline means this is expected
    if (!commitsBaseline || commitsBaseline.baselineValue <= 0 || commitsBaseline.sampleCount < 5) continue;

    const last7Days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(date), i), "yyyy-MM-dd")
    );
    const commitSignals = await db.rawSignal.findMany({
      where: { workspaceId, userId, signalType: "COMMITS_COUNT", signalDate: { in: last7Days } },
      select: { value: true },
    });
    // Require at least 5 synced days to confirm the pattern (handles weekends)
    if (commitSignals.length < 5) continue;

    const allZero = commitSignals.every((s) => s.value === 0);
    if (allZero) {
      const existing = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "STALLED_WORK", resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (!existing) {
        await db.anomalyAlert.create({
          data: {
            workspaceId,
            userId,
            anomalyType: "STALLED_WORK",
            severity: "LOW",
            title: `Work stalled for ${name ?? email}`,
            detail: `No commits for ${commitSignals.length} consecutive days. Expected baseline: ${commitsBaseline.baselineValue.toFixed(1)} commits/day.`,
            signalType: "COMMITS_COUNT",
            currentValue: 0,
            baselineValue: commitsBaseline.baselineValue,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // Auto-resolve: close open alerts whose signal has normalized
  // ═══════════════════════════════════════════
  const openAlerts = await db.anomalyAlert.findMany({
    where: { workspaceId, resolvedAt: null },
  });

  for (const alert of openAlerts) {
    let shouldResolve = false;

    switch (alert.anomalyType) {
      case "GHOST_DETECTION": {
        // Resolve when user shows any activity today on Slack or GitHub
        const activityToday = todaySignals.find(
          (s) =>
            s.userId === alert.userId &&
            (s.signalType === "MESSAGE_COUNT" || s.signalType === "COMMITS_COUNT") &&
            s.value > 0
        );
        shouldResolve = !!activityToday;
        break;
      }
      case "OVERLOAD": {
        // Resolve when today's meetings drop below the 6h threshold
        const todayMeetings = todaySignals.find(
          (s) => s.userId === alert.userId && s.signalType === "MEETING_HOURS"
        );
        shouldResolve = !!todayMeetings && todayMeetings.value < OVERLOAD_HOURS_THRESHOLD;
        break;
      }
      case "ATTRITION_RISK": {
        // Resolve when either Slack OR GitHub activity recovers above -1 z-score
        const msgSig = todaySignals.find(
          (s) => s.userId === alert.userId && s.signalType === "MESSAGE_COUNT"
        );
        const commitSig = todaySignals.find(
          (s) => s.userId === alert.userId && s.signalType === "COMMITS_COUNT"
        );
        const msgB = baselineMap.get(`${alert.userId}:MESSAGE_COUNT`);
        const commitB = baselineMap.get(`${alert.userId}:COMMITS_COUNT`);
        if (msgSig && msgB && zscore(msgSig.value, msgB.baselineValue, msgB.stdDev) > -1)
          shouldResolve = true;
        if (commitSig && commitB && zscore(commitSig.value, commitB.baselineValue, commitB.stdDev) > -1)
          shouldResolve = true;
        break;
      }
      case "MEETING_DEBT": {
        // Resolve when today's meeting hours fall below the debt threshold
        const todayMeetings = todaySignals.find(
          (s) => s.userId === alert.userId && s.signalType === "MEETING_HOURS"
        );
        shouldResolve = !!todayMeetings && todayMeetings.value < MEETING_DEBT_THRESHOLD;
        break;
      }
      case "STALLED_WORK": {
        // Resolve when any commits appear today
        const commitToday = todaySignals.find(
          (s) => s.userId === alert.userId && s.signalType === "COMMITS_COUNT" && s.value > 0
        );
        shouldResolve = !!commitToday;
        break;
      }
    }

    if (shouldResolve) {
      await db.anomalyAlert.update({
        where: { id: alert.id },
        data: { resolvedAt: new Date() },
      });
    }
  }
}

function getAnomalyTitle(type: AnomalyType, userName: string): string {
  switch (type) {
    case "GHOST_DETECTION": return `${userName} has gone quiet`;
    case "OVERLOAD": return `${userName} may be overloaded`;
    case "ATTRITION_RISK": return `Attrition risk signal for ${userName}`;
    case "MEETING_DEBT": return `${userName} has excessive meeting load`;
    case "STALLED_WORK": return `Work stalled for ${userName}`;
  }
}

// ─────────────────────────────────────────────
// DASHBOARD DATA HELPERS
// ─────────────────────────────────────────────

export interface UserSignalSnapshot {
  userId: string;
  userName: string;
  userEmail: string;
  leadershipRole: string;
  signals: Partial<Record<SignalType, number>>;
  baselines: Partial<Record<SignalType, number>>;
  openAlerts: Array<{
    id: string;
    anomalyType: AnomalyType;
    severity: SignalSeverity;
    title: string;
    detail: string;
    detectedAt: Date;
  }>;
}

export async function getWorkspaceSignalSnapshots(
  workspaceId: string,
  date: string
): Promise<UserSignalSnapshot[]> {
  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const signals = await db.rawSignal.findMany({
    where: { workspaceId, signalDate: date },
  });
  const baselines = await db.userBaseline.findMany({ where: { workspaceId } });
  const openAlerts = await db.anomalyAlert.findMany({
    where: { workspaceId, resolvedAt: null },
    orderBy: { detectedAt: "desc" },
  });

  const signalsByUser = new Map<string, Partial<Record<SignalType, number>>>();
  for (const s of signals) {
    if (!signalsByUser.has(s.userId)) signalsByUser.set(s.userId, {});
    signalsByUser.get(s.userId)![s.signalType] = s.value;
  }

  const baselinesByUser = new Map<string, Partial<Record<SignalType, number>>>();
  for (const b of baselines) {
    if (!baselinesByUser.has(b.userId)) baselinesByUser.set(b.userId, {});
    baselinesByUser.get(b.userId)![b.signalType] = b.baselineValue;
  }

  const alertsByUser = new Map<string, typeof openAlerts>();
  for (const a of openAlerts) {
    if (!alertsByUser.has(a.userId)) alertsByUser.set(a.userId, []);
    alertsByUser.get(a.userId)!.push(a);
  }

  return members
    .filter((m) => m.user)
    .map((m) => ({
      userId: m.user!.id,
      userName: m.user!.name ?? m.user!.email,
      userEmail: m.user!.email,
      leadershipRole: m.leadershipRole,
      signals: signalsByUser.get(m.user!.id) ?? {},
      baselines: baselinesByUser.get(m.user!.id) ?? {},
      openAlerts: alertsByUser.get(m.user!.id) ?? [],
    }));
}

/** Compute a simple 0-100 "pulse score" for a user based on signal deviation from baseline */
export function computePulseScore(snapshot: UserSignalSnapshot): number {
  const weights: Partial<Record<SignalType, number>> = {
    MESSAGE_COUNT: 0.3,
    COMMITS_COUNT: 0.3,
    MEETING_HOURS: 0.2,
    FOCUS_TIME_HOURS: 0.2,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const [signalType, weight] of Object.entries(weights)) {
    const current = snapshot.signals[signalType as SignalType];
    const baseline = snapshot.baselines[signalType as SignalType];
    if (current === undefined || baseline === undefined || baseline === 0) continue;

    const ratio = current / baseline;
    // Map ratio to 0-100: 0.0 -> 0, 1.0 -> 80, 1.5 -> 100
    let score: number;
    if (signalType === "MEETING_HOURS") {
      // Inverse: more meetings = lower score
      score = Math.max(0, Math.min(100, 100 - (ratio - 1) * 50));
    } else {
      score = Math.max(0, Math.min(100, ratio * 80));
    }

    weightedScore += score * weight!;
    totalWeight += weight!;
  }

  if (totalWeight === 0) return 50; // no data: neutral
  const raw = weightedScore / totalWeight;

  // Penalize open critical/high alerts
  const criticalAlerts = snapshot.openAlerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length;
  return Math.max(0, Math.min(100, Math.round(raw - criticalAlerts * 15)));
}

// Keep getAnomalyTitle exported for callers that generate titles outside detectAnomalies
export { getAnomalyTitle };
