/**
 * Signal Detection Test Harness
 *
 * Creates a synthetic workspace with test users, seeds RawSignal records that
 * should trigger each of the 5 core anomaly signals, and verifies that
 * detectAnomalies produces the correct AnomalyAlert records with correct severity.
 *
 * Also runs a "neutral" pass to confirm no false positives on normal data.
 *
 * Usage:
 *   npx tsx src/scripts/test-signals.ts
 *
 * Requires a live DATABASE_URL in .env.local (reads via dotenv).
 */

import { PrismaClient } from "@prisma/client";
import { format, subDays } from "date-fns";
import { detectAnomalies, computeBaselines } from "@/lib/signals";

const db = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function cleanup(workspaceId: string): Promise<void> {
  await db.anomalyAlert.deleteMany({ where: { workspaceId } });
  await db.userBaseline.deleteMany({ where: { workspaceId } });
  await db.rawSignal.deleteMany({ where: { workspaceId } });
  await db.workspaceMember.deleteMany({ where: { workspaceId } });
  await db.workspace.deleteMany({ where: { id: workspaceId } });
}

async function createTestWorkspace(): Promise<string> {
  const ws = await db.workspace.create({
    data: {
      name: "Signal Test Workspace",
      slug: `signal-test-${Date.now()}`,
    },
  });
  return ws.id;
}

async function createTestUser(suffix: string): Promise<string> {
  const u = await db.user.create({
    data: {
      email: `test-signal-${suffix}-${Date.now()}@example.com`,
      name: `Test User ${suffix}`,
    },
  });
  return u.id;
}

async function seedSignals(
  workspaceId: string,
  userId: string,
  signalType: string,
  entries: Array<{ daysAgo: number; value: number }>
): Promise<void> {
  for (const entry of entries) {
    const signalDate = format(subDays(new Date(), entry.daysAgo), "yyyy-MM-dd");
    await db.rawSignal.upsert({
      where: {
        workspaceId_userId_signalType_signalDate: {
          workspaceId,
          userId,
          signalType: signalType as any,
          signalDate,
        },
      },
      create: {
        workspaceId,
        userId,
        connectorType: "SLACK",
        signalType: signalType as any,
        value: entry.value,
        signalDate,
      },
      update: { value: entry.value },
    });
  }
}

// ─── main test runner ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  const workspaceId = await createTestWorkspace();

  try {
    console.log("\n══════════════════════════════════════════");
    console.log("  Signal Detection Test Harness");
    console.log("══════════════════════════════════════════\n");

    // ═══════════════════════════════════════
    // Test 1: Ghost Detection
    // ═══════════════════════════════════════
    console.log("[ Signal 1 ] Ghost Detection");
    {
      const userId = await createTestUser("ghost");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `ghost-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 90),
        },
      });

      // Establish a strong 30-day baseline: 20 messages/day for days 6-35
      await seedSignals(workspaceId, userId, "MESSAGE_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 6, value: 20 })),
      ]);
      // Last 5 days: complete silence (well below -2 std dev)
      await seedSignals(workspaceId, userId, "MESSAGE_COUNT", [
        { daysAgo: 0, value: 0 },
        { daysAgo: 1, value: 0 },
        { daysAgo: 2, value: 0 },
        { daysAgo: 3, value: 0 },
        { daysAgo: 4, value: 0 },
      ]);

      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);

      const alert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "GHOST_DETECTION" },
      });
      assert(!!alert, "GHOST_DETECTION alert was created");
      assert(alert?.severity === "HIGH", `severity is HIGH (got ${alert?.severity})`);
    }

    // ═══════════════════════════════════════
    // Test 2: Overload
    // ═══════════════════════════════════════
    console.log("\n[ Signal 2 ] Overload");
    {
      const userId = await createTestUser("overload");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `overload-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 365),
        },
      });

      // 5 consecutive days of 7-hour meeting days
      await seedSignals(workspaceId, userId, "MEETING_HOURS", [
        { daysAgo: 0, value: 7.5 },
        { daysAgo: 1, value: 7.0 },
        { daysAgo: 2, value: 6.5 },
        { daysAgo: 3, value: 7.0 },
        { daysAgo: 4, value: 6.0 },
      ]);

      await detectAnomalies(workspaceId, today);

      const alert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "OVERLOAD" },
      });
      assert(!!alert, "OVERLOAD alert was created");
      assert(alert?.severity === "MEDIUM", `severity is MEDIUM (got ${alert?.severity})`);
    }

    // ═══════════════════════════════════════
    // Test 3: Attrition Risk
    // ═══════════════════════════════════════
    console.log("\n[ Signal 3 ] Attrition Risk");
    {
      const userId = await createTestUser("attrition");
      // Tenure: 12 months (within the 18-month at-risk window)
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `attrition-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 365),
        },
      });

      // Normal baseline: 15 msg/day, 5 commits/day for past 30 days
      await seedSignals(workspaceId, userId, "MESSAGE_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 8, value: 15 })),
      ]);
      await seedSignals(workspaceId, userId, "COMMITS_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 8, value: 5 })),
      ]);
      // Last 7 days: both signals have dropped significantly (z < -1)
      await seedSignals(workspaceId, userId, "MESSAGE_COUNT", [
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 2 })),
      ]);
      await seedSignals(workspaceId, userId, "COMMITS_COUNT", [
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 0 })),
      ]);

      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);

      const alert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "ATTRITION_RISK" },
      });
      assert(!!alert, "ATTRITION_RISK alert was created");
      assert(alert?.severity === "CRITICAL", `severity is CRITICAL (got ${alert?.severity})`);

      // Verify attrition does NOT fire when tenure >= 18 months
      const veteranId = await createTestUser("attrition-veteran");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId: veteranId,
          invitedEmail: `veteran-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 600), // ~20 months — over the threshold
        },
      });
      await seedSignals(workspaceId, veteranId, "MESSAGE_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 8, value: 15 })),
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 1 })),
      ]);
      await seedSignals(workspaceId, veteranId, "COMMITS_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 8, value: 5 })),
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 0 })),
      ]);

      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);

      const veteranAlert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId: veteranId, anomalyType: "ATTRITION_RISK" },
      });
      assert(!veteranAlert, "ATTRITION_RISK does NOT fire for 20-month tenure");
    }

    // ═══════════════════════════════════════
    // Test 4: Meeting Debt
    // ═══════════════════════════════════════
    console.log("\n[ Signal 4 ] Meeting Debt");
    {
      const userId = await createTestUser("meeting-debt");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `meetingdebt-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 200),
        },
      });

      // 7 days averaging 4.5h/day (56% of 8hr day — above 40% threshold)
      await seedSignals(workspaceId, userId, "MEETING_HOURS", [
        { daysAgo: 0, value: 5.0 },
        { daysAgo: 1, value: 4.5 },
        { daysAgo: 2, value: 4.0 },
        { daysAgo: 3, value: 5.0 },
        { daysAgo: 4, value: 4.0 },
        { daysAgo: 5, value: 4.5 },
        { daysAgo: 6, value: 4.5 },
      ]);

      await detectAnomalies(workspaceId, today);

      const alert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "MEETING_DEBT" },
      });
      assert(!!alert, "MEETING_DEBT alert was created");
      assert(alert?.severity === "MEDIUM", `severity is MEDIUM (got ${alert?.severity})`);

      // Verify does NOT fire at 2h/day (25% of workday — under threshold)
      const okUserId = await createTestUser("meeting-ok");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId: okUserId,
          invitedEmail: `meetingok-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 200),
        },
      });
      await seedSignals(workspaceId, okUserId, "MEETING_HOURS", [
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 2.0 })),
      ]);
      await detectAnomalies(workspaceId, today);
      const okAlert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId: okUserId, anomalyType: "MEETING_DEBT" },
      });
      assert(!okAlert, "MEETING_DEBT does NOT fire for 2h/day (25%) meeting load");
    }

    // ═══════════════════════════════════════
    // Test 5: Stalled Work
    // ═══════════════════════════════════════
    console.log("\n[ Signal 5 ] Stalled Work");
    {
      const userId = await createTestUser("stalled");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `stalled-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 180),
        },
      });

      // Establish commit baseline: 3 commits/day for 30 days
      await seedSignals(workspaceId, userId, "COMMITS_COUNT", [
        ...Array.from({ length: 30 }, (_, i) => ({ daysAgo: i + 8, value: 3 })),
      ]);
      // Last 7 days: 0 commits (stalled)
      await seedSignals(workspaceId, userId, "COMMITS_COUNT", [
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 0 })),
      ]);

      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);

      const alert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId, anomalyType: "STALLED_WORK" },
      });
      assert(!!alert, "STALLED_WORK alert was created");
      assert(alert?.severity === "LOW", `severity is LOW (got ${alert?.severity})`);

      // No false positive: user with no baseline should not be flagged
      const newUserId = await createTestUser("stalled-new");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId: newUserId,
          invitedEmail: `stalled-new-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 10),
        },
      });
      // Only 5 days of data, all zero — but no positive baseline to compare against
      await seedSignals(workspaceId, newUserId, "COMMITS_COUNT", [
        ...Array.from({ length: 5 }, (_, i) => ({ daysAgo: i, value: 0 })),
      ]);
      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);
      const noBaselineAlert = await db.anomalyAlert.findFirst({
        where: { workspaceId, userId: newUserId, anomalyType: "STALLED_WORK" },
      });
      assert(!noBaselineAlert, "STALLED_WORK does NOT fire for user with no positive baseline");
    }

    // ═══════════════════════════════════════
    // Test 6: Neutral — no false positives on normal data
    // ═══════════════════════════════════════
    console.log("\n[ Signal 6 ] No false positives on neutral data");
    {
      const userId = await createTestUser("neutral");
      await db.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          invitedEmail: `neutral-${Date.now()}@example.com`,
          status: "ACCEPTED",
          joinedAt: subDays(new Date(), 365),
        },
      });

      // Consistent normal activity — no anomaly should fire
      await seedSignals(workspaceId, userId, "MESSAGE_COUNT", [
        ...Array.from({ length: 35 }, (_, i) => ({ daysAgo: i, value: 15 })),
      ]);
      await seedSignals(workspaceId, userId, "COMMITS_COUNT", [
        ...Array.from({ length: 35 }, (_, i) => ({ daysAgo: i, value: 5 })),
      ]);
      await seedSignals(workspaceId, userId, "MEETING_HOURS", [
        ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: i, value: 2.0 })),
      ]);

      await computeBaselines(workspaceId);
      await detectAnomalies(workspaceId, today);

      const alerts = await db.anomalyAlert.findMany({
        where: { workspaceId, userId },
      });
      assert(alerts.length === 0, `No alerts on normal data (got ${alerts.length})`);
    }

    // ─── Summary ─────────────────────────────────────────────────────────
    console.log("\n══════════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log("══════════════════════════════════════════\n");

    if (failed > 0) process.exit(1);
  } finally {
    await cleanup(workspaceId);
    // Clean up test users (they have no relations left after workspace cleanup)
    await db.user.deleteMany({ where: { email: { contains: "test-signal-" } } });
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
