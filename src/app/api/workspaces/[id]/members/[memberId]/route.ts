import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncSubscriptionSeats, computeSeatCounts, type BillingInterval } from "@/lib/stripe";

const patchSchema = z.object({
  leadershipRole: z.enum(["CEO", "MANAGER", "HR", "IC"]),
});

// PATCH /api/workspaces/[id]/members/[memberId] — update leadershipRole (admin only)
// After role change, syncs seat quantities with Stripe if there's an active subscription.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid leadershipRole" }, { status: 400 });
  }

  const target = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: id },
  });
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await db.workspaceMember.update({
    where: { id: memberId },
    data: { leadershipRole: parsed.data.leadershipRole },
  });

  // Sync seat counts with Stripe if workspace has an active subscription
  const subscription = await db.subscription.findUnique({ where: { workspaceId: id } });
  if (subscription?.stripeSubscriptionId && subscription.status !== "CANCELED") {
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: id, status: "ACCEPTED" },
      select: { leadershipRole: true, status: true },
    });
    const seatCounts = computeSeatCounts(members);
    const interval: BillingInterval = subscription.plan === "ANNUAL" ? "annual" : "monthly";

    // Fire-and-forget: don't block the response on Stripe API latency
    syncSubscriptionSeats({
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      interval,
      seatCounts,
    }).catch((err) => console.error("Seat sync failed after role change:", err));
  }

  return NextResponse.json(updated);
}
