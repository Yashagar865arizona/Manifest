import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendWaitlistConfirmationEmail } from "@/lib/resend";

const schema = z.object({
  email: z.string().email().max(254),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const { email } = parsed.data;

    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const entry = await db.waitlistEntry.create({
      data: {
        email: email.toLowerCase(),
        source: "landing-page",
        sequenceStep: 0,
        nextEmailAt: threeDaysFromNow,
      },
    });

    // Fire confirmation email — non-blocking, don't fail the request if it errors
    sendWaitlistConfirmationEmail({
      to: email.toLowerCase(),
      unsubscribeToken: entry.unsubscribeToken,
    }).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation — email already registered
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Already on waitlist" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
