import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendCheckInEmail } from "@/lib/resend";
import { format, toZonedTime } from "date-fns-tz";

// Vercel Cron: runs every hour
// Finds members whose check-in time has arrived and sends the email if not sent today

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: string[] = [];
  let sent = 0;
  let skipped = 0;

  // Get all workspaces with active members
  const workspaces = await db.workspace.findMany({
    where: {
      members: {
        some: { status: "ACCEPTED", role: "MEMBER" },
      },
      subscription: {
        status: { in: ["TRIALING", "ACTIVE"] },
      },
    },
    include: {
      members: {
        where: { status: "ACCEPTED", role: "MEMBER" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  for (const workspace of workspaces) {
    // Get local time in workspace timezone
    let localHour: string;
    try {
      const zonedNow = toZonedTime(now, workspace.timezone);
      localHour = format(zonedNow, "HH:mm");
    } catch {
      localHour = format(now, "HH:mm");
    }

    const checkInHour = workspace.checkInTime.slice(0, 2);
    const nowHour = localHour.slice(0, 2);

    // Only send if current hour matches check-in hour
    if (nowHour !== checkInHour) {
      skipped++;
      continue;
    }

    const todayDate = format(
      toZonedTime(now, workspace.timezone),
      "yyyy-MM-dd"
    );

    for (const member of workspace.members) {
      if (!member.user) continue;

      // Check if already sent today
      const existing = await db.checkIn.findUnique({
        where: {
          workspaceId_userId_checkInDate: {
            workspaceId: workspace.id,
            userId: member.user.id,
            checkInDate: todayDate,
          },
        },
      });

      if (existing) {
        skipped++;
        continue; // already created (email already sent or submitted)
      }

      // Create the check-in record with token
      const checkIn = await db.checkIn.create({
        data: {
          workspaceId: workspace.id,
          userId: member.user.id,
          content: "",
          checkInDate: todayDate,
          tokenUsed: false,
        },
      });

      // Send check-in email
      try {
        await sendCheckInEmail({
          to: member.user.email,
          memberName: member.user.name ?? member.user.email,
          workspaceName: workspace.name,
          checkInToken: checkIn.token,
          checkInDate: todayDate,
        });
        sent++;
        results.push(`Sent to ${member.user.email} for ${workspace.name}`);
      } catch (err) {
        results.push(`Failed to send to ${member.user.email}: ${err}`);
      }
    }
  }

  return NextResponse.json({ sent, skipped, results });
}
