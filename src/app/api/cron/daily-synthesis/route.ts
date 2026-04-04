import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { synthesizeCheckIns, type AITier } from "@/lib/openai";
import { format, toZonedTime } from "date-fns-tz";

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const synthesized: string[] = [];
  const skipped: string[] = [];

  const workspaces = await db.workspace.findMany({
    where: {
      subscription: {
        status: { in: ["TRIALING", "ACTIVE"] },
      },
    },
    include: { subscription: { select: { status: true } } },
  });

  for (const workspace of workspaces) {
    let localTime: Date;
    try {
      localTime = toZonedTime(now, workspace.timezone);
    } catch {
      localTime = now;
    }

    const todayDate = format(localTime, "yyyy-MM-dd");

    // Run synthesis 2 hours after check-in window closes
    // check-in time is HH:MM — synthesis runs at HH+4
    const checkInHour = parseInt(workspace.checkInTime.split(":")[0]);
    const currentHour = parseInt(format(localTime, "HH"));

    if (currentHour < checkInHour + 4) {
      skipped.push(`${workspace.name}: too early (check-in at ${workspace.checkInTime})`);
      continue;
    }

    // Already synthesized today?
    const existing = await db.synthesisReport.findUnique({
      where: {
        workspaceId_reportDate: { workspaceId: workspace.id, reportDate: todayDate },
      },
    });

    if (existing) {
      skipped.push(`${workspace.name}: already done`);
      continue;
    }

    // Get all accepted members
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: workspace.id, status: "ACCEPTED", role: "MEMBER" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (members.length === 0) {
      skipped.push(`${workspace.name}: no members`);
      continue;
    }

    // Build synthesis input
    const memberInputs = await Promise.all(
      members
        .filter((m) => m.user)
        .map(async (m) => {
          const user = m.user!;

          // Today's check-in
          const todayCheckIn = await db.checkIn.findUnique({
            where: {
              workspaceId_userId_checkInDate: {
                workspaceId: workspace.id,
                userId: user.id,
                checkInDate: todayDate,
              },
            },
          });

          // Last 5 days of check-ins for context
          const recentCheckIns = await db.checkIn.findMany({
            where: {
              workspaceId: workspace.id,
              userId: user.id,
              tokenUsed: true,
            },
            orderBy: { checkInDate: "desc" },
            take: 5,
            select: { checkInDate: true, content: true },
          });

          // Calculate consecutive misses
          let consecutiveMisses = 0;
          for (let i = 1; i <= 7; i++) {
            const d = new Date(todayDate);
            d.setDate(d.getDate() - i);
            const dateStr = format(d, "yyyy-MM-dd");
            const ci = await db.checkIn.findUnique({
              where: {
                workspaceId_userId_checkInDate: {
                  workspaceId: workspace.id,
                  userId: user.id,
                  checkInDate: dateStr,
                },
              },
            });
            if (ci?.tokenUsed) break;
            consecutiveMisses++;
          }

          return {
            name: user.name ?? user.email,
            email: user.email,
            checkIn:
              todayCheckIn?.tokenUsed && todayCheckIn.content
                ? todayCheckIn.content
                : null,
            recentCheckIns: recentCheckIns.map((c) => ({
              date: c.checkInDate,
              content: c.content,
            })),
            consecutiveMisses,
          };
        })
    );

    try {
      const tier: AITier = workspace.subscription?.status === "ACTIVE" ? "premium" : "standard";
      const result = await synthesizeCheckIns({
        workspaceName: workspace.name,
        reportDate: todayDate,
        members: memberInputs,
      }, tier);

      await db.synthesisReport.create({
        data: {
          workspaceId: workspace.id,
          reportDate: todayDate,
          reportText: result.narrative,
          structuredData: result as unknown as object,
        },
      });

      synthesized.push(`${workspace.name}: synthesized ${memberInputs.length} members`);
    } catch (err) {
      synthesized.push(`${workspace.name}: ERROR - ${err}`);
    }
  }

  return NextResponse.json({ synthesized, skipped });
}
