import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { syncSlackSignalsForDate } from "@/lib/connectors/slack";
import { syncGitHubSignalsForDate } from "@/lib/connectors/github";
import { syncGoogleCalendarSignalsForDate } from "@/lib/connectors/google";
import { computeBaselines, detectAnomalies } from "@/lib/signals";
import { captureError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const bodySchema = z.object({
  workspaceId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_EMAIL || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { workspaceId } = parsed.data;

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const errors: string[] = [];

  try {
    await Promise.all([
      syncSlackSignalsForDate(workspaceId, today).catch((e) => {
        captureError("admin/sync:slack", e, { workspaceId });
        errors.push(`Slack: ${String(e)}`);
      }),
      syncGitHubSignalsForDate(workspaceId, today).catch((e) => {
        captureError("admin/sync:github", e, { workspaceId });
        errors.push(`GitHub: ${String(e)}`);
      }),
      syncGoogleCalendarSignalsForDate(workspaceId, today).catch((e) => {
        captureError("admin/sync:google", e, { workspaceId });
        errors.push(`Google: ${String(e)}`);
      }),
    ]);

    await computeBaselines(workspaceId).catch((e) => {
      captureError("admin/sync:baselines", e, { workspaceId });
      errors.push(`Baselines: ${String(e)}`);
    });

    await detectAnomalies(workspaceId, today).catch((e) => {
      captureError("admin/sync:anomalies", e, { workspaceId });
      errors.push(`Anomalies: ${String(e)}`);
    });
  } catch (err) {
    captureError("admin/sync:fatal", err, { workspaceId });
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    workspaceId,
    date: today,
    errors: errors.length ? errors : undefined,
  });
}
