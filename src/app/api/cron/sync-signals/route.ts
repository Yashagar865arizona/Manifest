import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { syncSlackSignalsForDate } from "@/lib/connectors/slack";
import { syncGitHubSignalsForDate } from "@/lib/connectors/github";
import { syncGoogleCalendarSignalsForDate } from "@/lib/connectors/google";
import { computeBaselines } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const workspaces = await db.workspace.findMany({
    select: { id: true },
  });

  const results = [];
  for (const workspace of workspaces) {
    try {
      await Promise.all([
        syncSlackSignalsForDate(workspace.id, today),
        syncGitHubSignalsForDate(workspace.id, today),
        syncGoogleCalendarSignalsForDate(workspace.id, today),
      ]);
      await computeBaselines(workspace.id);
      results.push({ workspaceId: workspace.id, status: "ok" });
    } catch (err) {
      results.push({ workspaceId: workspace.id, status: "error", message: String(err) });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
