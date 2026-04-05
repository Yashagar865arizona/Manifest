import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendWaitlistEmail2,
  sendWaitlistEmail3,
  sendWaitlistEmail4,
  sendWaitlistEmail5,
} from "@/lib/resend";

// Vercel Cron: runs daily at 09:00 UTC
// Sends the next email in the nurture sequence to waitlist entries that are due.
//
// Sequence:
//   step 0 → send Email 2 (Day 3: problem story),  set step=1, nextEmailAt=+4d
//   step 1 → send Email 3 (Day 7: how we work),    set step=2, nextEmailAt=+7d
//   step 2 → send Email 4 (Day 14: design partner), set step=3, nextEmailAt=+7d
//   step 3 → send Email 5 (Day 21: last touch),    set step=4, nextEmailAt=null

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

const STEP_CONFIG: Record<
  number,
  {
    send: (params: { to: string; unsubscribeToken: string }) => Promise<void>;
    nextStepDelay: number | null; // days until next email, or null if done
  }
> = {
  0: { send: sendWaitlistEmail2, nextStepDelay: 4 },
  1: { send: sendWaitlistEmail3, nextStepDelay: 7 },
  2: { send: sendWaitlistEmail4, nextStepDelay: 7 },
  3: { send: sendWaitlistEmail5, nextStepDelay: null },
};

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await db.waitlistEntry.findMany({
    where: {
      unsubscribedAt: null,
      nextEmailAt: { lte: now },
      sequenceStep: { lt: 4 },
    },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of due) {
    const config = STEP_CONFIG[entry.sequenceStep];
    if (!config) continue;

    try {
      await config.send({ to: entry.email, unsubscribeToken: entry.unsubscribeToken });

      const nextEmailAt =
        config.nextStepDelay !== null
          ? new Date(Date.now() + config.nextStepDelay * 24 * 60 * 60 * 1000)
          : null;

      await db.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          sequenceStep: entry.sequenceStep + 1,
          nextEmailAt,
        },
      });

      sent++;
    } catch (err) {
      failed++;
      errors.push(`${entry.email}: ${err}`);
    }
  }

  return NextResponse.json({ sent, failed, errors });
}
