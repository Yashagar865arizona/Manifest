import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().min(1),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, timezone, checkInTime } = parsed.data;

    // Create workspace + add creator as manager member
    const workspace = await db.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name, timezone, checkInTime },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: session.user.id,
          invitedEmail: session.user.email!,
          role: "MANAGER",
          status: "ACCEPTED",
          joinedAt: new Date(),
        },
      });

      // Create 14-day trial subscription
      await tx.subscription.create({
        data: {
          workspaceId: ws.id,
          stripeCustomerId: `pending_${ws.id}`, // replaced when Stripe checkout completes
          plan: "TRIAL",
          status: "TRIALING",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      return ws;
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.workspaceMember.findMany({
    where: {
      userId: session.user.id,
      status: "ACCEPTED",
    },
    include: {
      workspace: {
        include: {
          subscription: true,
          _count: {
            select: {
              members: { where: { status: "ACCEPTED" } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
}
