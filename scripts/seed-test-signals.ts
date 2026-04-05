/**
 * Seed script: synthetic signal pipeline for smoke testing
 *
 * Creates a self-contained test workspace with 5 users whose synthetic
 * RawSignal data covers all 5 anomaly types, then runs baseline computation
 * and anomaly detection so the full pipeline can be verified without OAuth.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/seed-test-signals.ts
 *
 * Optionally pass --clean to delete the workspace before re-seeding:
 *   DATABASE_URL=... npx tsx scripts/seed-test-signals.ts --clean
 *
 * After the script completes, log in as:
 *   ceo@radar-test.local    / password: RadarTest2024!
 *   manager@radar-test.local / password: RadarTest2024!
 *   hr@radar-test.local      / password: RadarTest2024!
 * to verify dashboards show real signal data.
 */

import { PrismaClient } from "@prisma/client";
import { format, subDays } from "date-fns";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const clean = process.argv.includes("--clean");
const TEST_SLUG = "radar-smoke-test";
const PASSWORD_HASH = bcrypt.hashSync("RadarTest2024!", 10);
const TODAY = format(new Date(), "yyyy-MM-dd");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  return format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
}

async function upsertUser(email: string, name: string) {
  return db.user.upsert({
    where: { email },
    create: { email, name, passwordHash: PASSWORD_HASH },
    update: { name },
  });
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱  Radar smoke-test seed starting…");

  // ── 0. Optionally clean previous run ─────────
  if (clean) {
    const existing = await db.workspace.findUnique({ where: { slug: TEST_SLUG } });
    if (existing) {
      await db.workspace.delete({ where: { id: existing.id } });
      console.log("🗑   Deleted previous test workspace.");
    }
  }

  // ── 1. Create workspace ───────────────────────
  const ws = await db.workspace.upsert({
    where: { slug: TEST_SLUG },
    create: {
      name: "Radar Smoke Test",
      slug: TEST_SLUG,
      timezone: "America/New_York",
    },
    update: { name: "Radar Smoke Test" },
  });
  console.log(`✅  Workspace: ${ws.id} (${ws.slug})`);

  // ── 2. Create users ───────────────────────────
  const ceo = await upsertUser("ceo@radar-test.local", "Alex CEO");
  const manager = await upsertUser("manager@radar-test.local", "Jamie Manager");
  const hr = await upsertUser("hr@radar-test.local", "Sam HR");
  const ghost = await upsertUser("ghost@radar-test.local", "Chris Ghost"); // GHOST_DETECTION
  const overloaded = await upsertUser("overloaded@radar-test.local", "Dana Overloaded"); // OVERLOAD
  const atRisk = await upsertUser("atrisk@radar-test.local", "Jordan AtRisk"); // ATTRITION_RISK
  const stalled = await upsertUser("stalled@radar-test.local", "Riley Stalled"); // STALLED_WORK
  // meetingDebt user shares overloaded for MEETING_DEBT (3.5h vs 6h threshold)
  const meetingDebt = await upsertUser("meetingdebt@radar-test.local", "Morgan MeetingDebt");

  console.log("✅  Users created");

  // ── 3. Create workspace members ───────────────
  const membersToCreate = [
    { user: ceo, role: "MANAGER" as const, leadershipRole: "CEO" as const, joinedAt: subDays(new Date(), 400) },
    { user: manager, role: "MANAGER" as const, leadershipRole: "MANAGER" as const, joinedAt: subDays(new Date(), 300) },
    { user: hr, role: "MANAGER" as const, leadershipRole: "HR" as const, joinedAt: subDays(new Date(), 250) },
    { user: ghost, role: "MEMBER" as const, leadershipRole: "IC" as const, joinedAt: subDays(new Date(), 200) },
    { user: overloaded, role: "MEMBER" as const, leadershipRole: "IC" as const, joinedAt: subDays(new Date(), 180) },
    { user: atRisk, role: "MEMBER" as const, leadershipRole: "IC" as const, joinedAt: subDays(new Date(), 8 * 30) }, // ~8 months — inside 18-mo tenure window
    { user: stalled, role: "MEMBER" as const, leadershipRole: "IC" as const, joinedAt: subDays(new Date(), 150) },
    { user: meetingDebt, role: "MEMBER" as const, leadershipRole: "IC" as const, joinedAt: subDays(new Date(), 120) },
  ];

  for (const m of membersToCreate) {
    await db.workspaceMember.upsert({
      where: { workspaceId_invitedEmail: { workspaceId: ws.id, invitedEmail: m.user.email } },
      create: {
        workspaceId: ws.id,
        userId: m.user.id,
        invitedEmail: m.user.email,
        role: m.role,
        leadershipRole: m.leadershipRole,
        status: "ACCEPTED",
        joinedAt: m.joinedAt,
      },
      update: {
        userId: m.user.id,
        role: m.role,
        leadershipRole: m.leadershipRole,
        status: "ACCEPTED",
        joinedAt: m.joinedAt,
      },
    });
  }
  console.log("✅  Workspace members created");

  // ── 4. Insert raw signals ─────────────────────
  // Strategy: 30 days of normal data for all users first,
  // then override the last N days to trigger each anomaly.

  const allUsers = [ceo, manager, hr, ghost, overloaded, atRisk, stalled, meetingDebt];

  // 4a. Baseline period: days 30-6 (normal activity for everyone)
  const baselineSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (const user of allUsers) {
    for (let d = 30; d >= 6; d--) {
      const date = dateStr(d);
      // Slack messages: normal ~20/day
      baselineSignals.push({ workspaceId: ws.id, userId: user.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 18 + Math.round(Math.random() * 6), signalDate: date });
      // GitHub commits: normal ~3/day
      baselineSignals.push({ workspaceId: ws.id, userId: user.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 2 + Math.round(Math.random() * 3), signalDate: date });
      // Meeting hours: normal ~1.5h/day
      baselineSignals.push({ workspaceId: ws.id, userId: user.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 1 + Math.random() * 1.5, signalDate: date });
      // Focus time: ~4h/day
      baselineSignals.push({ workspaceId: ws.id, userId: user.id, connectorType: "GOOGLE_CALENDAR", signalType: "FOCUS_TIME_HOURS", value: 3.5 + Math.random(), signalDate: date });
    }
  }

  // Batch upsert baseline — use skipDuplicates so re-runs are idempotent
  await db.rawSignal.createMany({ data: baselineSignals, skipDuplicates: true });
  console.log(`✅  Baseline signals inserted (${baselineSignals.length} rows)`);

  // 4b. Anomaly signals: last 5-7 days

  // GHOST_DETECTION: Chris went completely dark on Slack + GitHub for 5 days
  const ghostSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (let d = 5; d >= 0; d--) {
    const date = dateStr(d);
    ghostSignals.push({ workspaceId: ws.id, userId: ghost.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 0, signalDate: date });
    ghostSignals.push({ workspaceId: ws.id, userId: ghost.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 0, signalDate: date });
    ghostSignals.push({ workspaceId: ws.id, userId: ghost.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 0, signalDate: date });
  }
  await db.rawSignal.createMany({ data: ghostSignals, skipDuplicates: true });
  console.log("✅  GHOST_DETECTION signals inserted (Chris)");

  // OVERLOAD: Dana has 7+ hours of meetings every day for 5 days
  const overloadSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (let d = 5; d >= 0; d--) {
    const date = dateStr(d);
    overloadSignals.push({ workspaceId: ws.id, userId: overloaded.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 7 + Math.random(), signalDate: date });
    overloadSignals.push({ workspaceId: ws.id, userId: overloaded.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 5, signalDate: date });
    overloadSignals.push({ workspaceId: ws.id, userId: overloaded.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 0, signalDate: date });
  }
  await db.rawSignal.createMany({ data: overloadSignals, skipDuplicates: true });
  console.log("✅  OVERLOAD signals inserted (Dana)");

  // ATTRITION_RISK: Jordan (8-month tenure) has both Slack + GitHub drop > 1 std dev
  // Baseline ~20 msgs/day, ~3 commits/day — drop to 5 and 0 for the last 7 days
  const atRiskSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (let d = 7; d >= 0; d--) {
    const date = dateStr(d);
    atRiskSignals.push({ workspaceId: ws.id, userId: atRisk.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 3 + Math.round(Math.random() * 3), signalDate: date });
    atRiskSignals.push({ workspaceId: ws.id, userId: atRisk.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 0, signalDate: date });
    atRiskSignals.push({ workspaceId: ws.id, userId: atRisk.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 0.5, signalDate: date });
  }
  await db.rawSignal.createMany({ data: atRiskSignals, skipDuplicates: true });
  console.log("✅  ATTRITION_RISK signals inserted (Jordan)");

  // STALLED_WORK: Riley — 0 commits for 7 days (Slack still normal)
  const stalledSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (let d = 7; d >= 0; d--) {
    const date = dateStr(d);
    stalledSignals.push({ workspaceId: ws.id, userId: stalled.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 0, signalDate: date });
    stalledSignals.push({ workspaceId: ws.id, userId: stalled.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 15 + Math.round(Math.random() * 5), signalDate: date });
    stalledSignals.push({ workspaceId: ws.id, userId: stalled.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 1.5, signalDate: date });
  }
  await db.rawSignal.createMany({ data: stalledSignals, skipDuplicates: true });
  console.log("✅  STALLED_WORK signals inserted (Riley)");

  // MEETING_DEBT: Morgan — 3.5-4h/day meetings for 7 days (above 3.2h threshold)
  const meetingDebtSignals: Parameters<typeof db.rawSignal.createMany>[0]["data"] = [];
  for (let d = 7; d >= 0; d--) {
    const date = dateStr(d);
    meetingDebtSignals.push({ workspaceId: ws.id, userId: meetingDebt.id, connectorType: "GOOGLE_CALENDAR", signalType: "MEETING_HOURS", value: 3.5 + Math.random() * 0.8, signalDate: date });
    meetingDebtSignals.push({ workspaceId: ws.id, userId: meetingDebt.id, connectorType: "SLACK", signalType: "MESSAGE_COUNT", value: 12, signalDate: date });
    meetingDebtSignals.push({ workspaceId: ws.id, userId: meetingDebt.id, connectorType: "GITHUB", signalType: "COMMITS_COUNT", value: 1, signalDate: date });
  }
  await db.rawSignal.createMany({ data: meetingDebtSignals, skipDuplicates: true });
  console.log("✅  MEETING_DEBT signals inserted (Morgan)");

  // ── 5. Run baseline computation ───────────────
  console.log("⏳  Computing baselines…");
  const { computeBaselines } = await import("../src/lib/signals");
  await computeBaselines(ws.id);
  const baselineCount = await db.userBaseline.count({ where: { workspaceId: ws.id } });
  console.log(`✅  Baselines computed (${baselineCount} rows)`);

  // ── 6. Run anomaly detection ──────────────────
  console.log("⏳  Running anomaly detection…");
  const { detectAnomalies } = await import("../src/lib/signals");
  await detectAnomalies(ws.id, TODAY);
  const anomalyCount = await db.anomalyAlert.count({ where: { workspaceId: ws.id, resolvedAt: null } });
  console.log(`✅  Anomaly detection complete (${anomalyCount} open alerts)`);

  // List detected anomalies
  const alerts = await db.anomalyAlert.findMany({
    where: { workspaceId: ws.id, resolvedAt: null },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { detectedAt: "desc" },
  });
  for (const a of alerts) {
    console.log(`   [${a.severity}] ${a.anomalyType} → ${a.user.name ?? a.user.email}: ${a.title}`);
  }

  // ── 7. Expected coverage check ────────────────
  const expectedTypes = ["GHOST_DETECTION", "OVERLOAD", "ATTRITION_RISK", "STALLED_WORK", "MEETING_DEBT"];
  const detectedTypes = new Set(alerts.map((a) => a.anomalyType));
  const missing = expectedTypes.filter((t) => !detectedTypes.has(t as never));
  if (missing.length > 0) {
    console.warn(`⚠️  Expected anomaly types NOT detected: ${missing.join(", ")}`);
    console.warn("   Check that baseline data has enough samples (≥5 days) and signal values are far enough from baseline.");
  } else {
    console.log("✅  All 5 anomaly types detected successfully");
  }

  // ── 8. Summary ────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║           SEED COMPLETE — Radar Smoke Test           ║
╠══════════════════════════════════════════════════════╣
║  Workspace ID : ${ws.id.padEnd(36)} ║
║  Workspace    : ${TEST_SLUG.padEnd(36)} ║
╠══════════════════════════════════════════════════════╣
║  Login credentials (password: RadarTest2024!)        ║
║   ceo@radar-test.local      → CEO dashboard          ║
║   manager@radar-test.local  → Manager Pulse          ║
║   hr@radar-test.local       → HR Signals             ║
╠══════════════════════════════════════════════════════╣
║  To clean and re-seed:                               ║
║   npx tsx scripts/seed-test-signals.ts --clean       ║
╚══════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
