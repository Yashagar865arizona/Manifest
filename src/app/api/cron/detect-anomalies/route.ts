import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { detectAnomalies } from "@/lib/signals";
import { captureError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const workspaces = await db.workspace.findMany({ select: { id: true } });

  const results = [];
  for (const workspace of workspaces) {
    try {
      await detectAnomalies(workspace.id, today);
      results.push({ workspaceId: workspace.id, status: "ok" });
    } catch (err) {
      captureError("cron/detect-anomalies", err, { workspaceId: workspace.id, date: today });
      results.push({ workspaceId: workspace.id, status: "error", message: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
