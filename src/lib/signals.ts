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
 * Creates AnomalyAlert records. Resolves previously open alerts if signal normalized.
 */
export async function detectAnomalies(workspaceId: string, date: string): Promise<void> {
  const signals = await db.rawSignal.findMany({
    where: { workspaceId, signalDate: date },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (signals.length === 0) return;

  const baselines = await db.userBaseline.findMany({
    where: { workspaceId },
  });
  const baselineMap = new Map(
    baselines.map((b) => [`${b.userId}:${b.signalType}`, b])
  );

  // Ghost detection: look for users with 0 messages AND 0 commits for 3+ consecutive days
  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Check ghost: last 3 days of MESSAGE_COUNT and COMMITS_COUNT all zero or missing
  for (const member of members) {
    if (!member.user) continue;
    const userId = member.user.id;

    const last3Days = [1, 2, 3].map((i) => format(subDays(new Date(date), i), "yyyy-MM-dd"));
    const recentActivity = await db.rawSignal.findMany({
      where: {
        workspaceId,
        userId,
        signalType: { in: ["MESSAGE_COUNT", "COMMITS_COUNT"] },
        signalDate: { in: last3Days },
      },
    });

    const totalActivity = recentActivity.reduce((sum, s) => sum + s.value, 0);
    const hasBaseline = baselines.some(
      (b) => b.userId === userId && (b.signalType === "MESSAGE_COUNT" || b.signalType === "COMMITS_COUNT") && b.baselineValue > 0
    );

    if (hasBaseline && totalActivity === 0) {
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
            title: `${member.user.name ?? member.user.email} has gone quiet`,
            detail: `No messages or commits detected for the last 3 days. Baseline shows regular activity.`,
            detectedAt: new Date(date),
          },
        });
      }
    }
  }

  // Signal-based anomaly detection using z-scores
  for (const signal of signals) {
    const key = `${signal.userId}:${signal.signalType}`;
    const baseline = baselineMap.get(key);
    if (!baseline || baseline.sampleCount < 5) continue; // not enough data

    let anomalyType: AnomalyType | null = null;
    let direction: "below" | "above" = "below";
    let detail = "";

    switch (signal.signalType) {
      case "MESSAGE_COUNT":
      case "COMMITS_COUNT":
        direction = "below";
        anomalyType = signal.signalType === "MESSAGE_COUNT" ? "GHOST_DETECTION" : "GHOST_DETECTION";
        detail = `Activity dropped to ${signal.value} (baseline: ${baseline.baselineValue.toFixed(1)})`;
        break;
      case "MEETING_HOURS":
        direction = "above";
        anomalyType = "OVERLOAD";
        detail = `${signal.value}h of meetings (baseline: ${baseline.baselineValue.toFixed(1)}h)`;
        break;
      case "FOCUS_TIME_HOURS":
        direction = "below";
        anomalyType = "OVERLOAD";
        detail = `Only ${signal.value}h focus time (baseline: ${baseline.baselineValue.toFixed(1)}h)`;
        break;
    }

    if (!anomalyType) continue;

    const z = zscore(signal.value, baseline.baselineValue, baseline.stdDev);
    const severity = severityFromZscore(z, direction);
    if (!severity) continue;

    // Check for existing open anomaly of same type for this user
    const existing = await db.anomalyAlert.findFirst({
      where: { workspaceId, userId: signal.userId, anomalyType, resolvedAt: null },
      orderBy: { detectedAt: "desc" },
    });

    if (!existing) {
      const userName = signal.user.name ?? signal.user.email;
      await db.anomalyAlert.create({
        data: {
          workspaceId,
          userId: signal.userId,
          anomalyType,
          severity,
          title: getAnomalyTitle(anomalyType, userName),
          detail,
          signalType: signal.signalType,
          currentValue: signal.value,
          baselineValue: baseline.baselineValue,
          detectedAt: new Date(date),
        },
      });
    }
  }

  // Resolve anomalies where signal has normalized
  const openAlerts = await db.anomalyAlert.findMany({
    where: { workspaceId, resolvedAt: null },
  });

  for (const alert of openAlerts) {
    if (alert.signalType) {
      const todaySignal = signals.find(
        (s) => s.userId === alert.userId && s.signalType === alert.signalType
      );
      if (!todaySignal) continue;
      const baseline = baselineMap.get(`${alert.userId}:${alert.signalType}`);
      if (!baseline) continue;
      const z = zscore(todaySignal.value, baseline.baselineValue, baseline.stdDev);
      const direction: "below" | "above" = alert.anomalyType === "OVERLOAD" ? "above" : "below";
      const severity = severityFromZscore(z, direction);
      if (!severity) {
        await db.anomalyAlert.update({
          where: { id: alert.id },
          data: { resolvedAt: new Date() },
        });
      }
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
