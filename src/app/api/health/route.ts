import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  // 1. DB connectivity
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbOk = true;
  } catch {
    dbLatencyMs = null;
  }

  if (!dbOk) {
    return NextResponse.json(
      {
        status: "degraded",
        db: { ok: false },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  // 2. Active workspace count
  const [workspaceCount, alertQueueDepth] = await Promise.all([
    db.workspace.count(),
    db.anomalyAlert.count({ where: { resolvedAt: null, acknowledged: false } }),
  ]);

  // 3. Last successful sync per connector type
  const lastSyncs = await db.connectorCredential.groupBy({
    by: ["connectorType"],
    _max: { lastSyncAt: true },
    where: { status: "ACTIVE", lastSyncAt: { not: null } },
  });

  const connectorHealth: Record<string, string | null> = {
    SLACK: null,
    GITHUB: null,
    GOOGLE_CALENDAR: null,
  };
  for (const row of lastSyncs) {
    connectorHealth[row.connectorType] = row._max.lastSyncAt
      ? row._max.lastSyncAt.toISOString()
      : null;
  }

  return NextResponse.json({
    status: "ok",
    product: "Radar",
    db: { ok: true, latencyMs: dbLatencyMs },
    activeWorkspaces: workspaceCount,
    alertQueueDepth,
    lastConnectorSync: connectorHealth,
    timestamp: new Date().toISOString(),
  });
}
