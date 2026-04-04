import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession, createCustomerPortalSession, PLANS, PlanKey } from "@/lib/stripe";

const checkoutSchema = z.object({
  workspaceId: z.string(),
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
});

const APP_URL = process.env.NEXTAUTH_URL ?? "https://usemanifest.app";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { workspaceId, plan } = parsed.data;

  // Must be manager
  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checkoutSession = await createCheckoutSession({
    workspaceId,
    plan: plan as PlanKey,
    customerEmail: session.user.email!,
    successUrl: `${APP_URL}/dashboard?workspace=${workspaceId}&payment=success`,
    cancelUrl: `${APP_URL}/dashboard?workspace=${workspaceId}&payment=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const subscription = await db.subscription.findUnique({ where: { workspaceId } });
  if (!subscription) {
    return NextResponse.json({ error: "No subscription" }, { status: 404 });
  }

  const plan = PLANS[subscription.plan as PlanKey] ?? null;

  return NextResponse.json({
    ...subscription,
    planDetails: plan,
  });
}

// Portal session
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await request.json();

  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subscription = await db.subscription.findUnique({ where: { workspaceId } });
  if (!subscription || subscription.stripeCustomerId.startsWith("pending_")) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const portalSession = await createCustomerPortalSession({
    stripeCustomerId: subscription.stripeCustomerId,
    returnUrl: `${APP_URL}/dashboard?workspace=${workspaceId}`,
  });

  return NextResponse.json({ url: portalSession.url });
}
