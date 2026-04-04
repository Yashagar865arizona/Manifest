import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateWeeklyReport, SynthesisOutput, type AITier } from "@/lib/openai";
import { sendWeeklyReportEmail } from "@/lib/resend";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

const APP_URL = process.env.NEXTAUTH_URL ?? "https://usemanifest.app";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Only run on Fridays
  if (now.getDay() !== 5) {
    return NextResponse.json({ skipped: "Not Friday" });
  }

  const weekEnding = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const generated: string[] = [];

  const workspaces = await db.workspace.findMany({
    where: {
      subscription: {
        status: { in: ["TRIALING", "ACTIVE"] },
      },
    },
    include: { subscription: { select: { status: true } } },
  });

  for (const workspace of workspaces) {
    // Already generated this week?
    const existing = await db.weeklyReport.findUnique({
      where: { workspaceId_weekEnding: { workspaceId: workspace.id, weekEnding } },
    });

    if (existing) {
      generated.push(`${workspace.name}: already done`);
      continue;
    }

    // Collect this week's daily synthesis reports
    const daysOfWeek = eachDayOfInterval({
      start: new Date(weekStart),
      end: new Date(weekEnding),
    });

    const dailyReports = await Promise.all(
      daysOfWeek.map(async (day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const report = await db.synthesisReport.findUnique({
          where: { workspaceId_reportDate: { workspaceId: workspace.id, reportDate: dateStr } },
        });
        return report
          ? { date: dateStr, report: report.structuredData as unknown as SynthesisOutput }
          : null;
      })
    );

    const validReports = dailyReports.filter(Boolean) as {
      date: string;
      report: SynthesisOutput;
    }[];

    if (validReports.length === 0) {
      generated.push(`${workspace.name}: no daily reports this week`);
      continue;
    }

    // Get member names
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: workspace.id, status: "ACCEPTED" },
      include: { user: { select: { name: true, email: true } } },
    });

    const memberNames = members
      .filter((m) => m.user)
      .map((m) => m.user!.name ?? m.user!.email);

    try {
      const tier: AITier = workspace.subscription?.status === "ACTIVE" ? "premium" : "standard";
      const reportText = await generateWeeklyReport({
        workspaceName: workspace.name,
        weekEnding,
        dailyReports: validReports,
        memberNames,
      }, tier);

      const weeklyReport = await db.weeklyReport.create({
        data: {
          workspaceId: workspace.id,
          weekEnding,
          reportText,
        },
      });

      // Send to all managers
      const managers = members.filter((m) => m.role === "MANAGER" && m.user);
      for (const manager of managers) {
        await sendWeeklyReportEmail({
          to: manager.user!.email,
          managerName: manager.user!.name ?? manager.user!.email,
          workspaceName: workspace.name,
          weekEnding,
          reportText,
          reportUrl: `${APP_URL}/dashboard/reports/${weeklyReport.id}`,
        });
      }

      // Mark as sent
      await db.weeklyReport.update({
        where: { id: weeklyReport.id },
        data: { sentAt: new Date() },
      });

      generated.push(
        `${workspace.name}: generated + sent to ${managers.length} managers`
      );
    } catch (err) {
      generated.push(`${workspace.name}: ERROR - ${err}`);
    }
  }

  return NextResponse.json({ weekEnding, generated });
}
