import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ADMIN_EMAIL || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalSignups, last7Days, last30Days, stepDistribution, workspaceCount] =
    await Promise.all([
      db.waitlistEntry.count(),
      db.waitlistEntry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.waitlistEntry.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.waitlistEntry.groupBy({
        by: ["sequenceStep"],
        _count: { sequenceStep: true },
        orderBy: { sequenceStep: "asc" },
      }),
      db.workspace.count(),
    ]);

  return NextResponse.json({
    waitlist: {
      total: totalSignups,
      last7Days,
      last30Days,
      bySequenceStep: stepDistribution.map((row: { sequenceStep: number; _count: { sequenceStep: number } }) => ({
        step: row.sequenceStep,
        count: row._count.sequenceStep,
      })),
    },
    workspaces: {
      total: workspaceCount,
    },
  });
}
