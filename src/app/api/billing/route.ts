import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createUpgradeCheckoutSession,
  createCustomerPortalSession,
  computeSeatCounts,
  computeInvoiceEstimate,
  type BillingInterval,
} from "@/lib/stripe";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://usemanifest.app";

// ─────────────────────────────────────────────
// GET /api/billing?workspaceId=xxx
// Returns subscription state + seat breakdown + next invoice estimate
// ─────────────────────────────────────────────
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

  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subscription = await db.subscription.findUnique({ where: { workspaceId } });

  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    select: { leadershipRole: true, status: true },
  });
  const seatCounts = computeSeatCounts(members);

  const interval: BillingInterval =
    subscription?.plan === "ANNUAL" ? "annual" : "monthly";
  const estimate = computeInvoiceEstimate(seatCounts, interval);

  const trialDaysLeft =
    subscription?.trialEndsAt
      ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86400000))
      : 0;

  return NextResponse.json({
    subscription,
    seatCounts,
    estimate,
    trialDaysLeft,
    isTrialing: subscription?.status === "TRIALING",
    needsPayment: subscription?.status === "TRIALING" && trialDaysLeft <= 3,
  });
}

// ─────────────────────────────────────────────
// POST /api/billing — start Stripe checkout for upgrade / plan start
// ─────────────────────────────────────────────
const upgradeSchema = z.object({
  workspaceId: z.string(),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { workspaceId, interval } = parsed.data;

  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subscription = await db.subscription.findUnique({ where: { workspaceId } });

  // Already on a paid plan — redirect to portal to manage
  if (subscription?.stripeSubscriptionId) {
    const portalSession = await createCustomerPortalSession({
      stripeCustomerId: subscription.stripeCustomerId,
      returnUrl: `${APP_URL}/billing?workspace=${workspaceId}`,
    });
    return NextResponse.json({ url: portalSession.url });
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED" },
    select: { leadershipRole: true, status: true },
  });
  const seatCounts = computeSeatCounts(members);

  const checkoutSession = await createUpgradeCheckoutSession({
    workspaceId,
    interval,
    seatCounts,
    customerEmail: session.user.email!,
    trialEndsAt: subscription?.trialEndsAt ?? null,
    successUrl: `${APP_URL}/billing?workspace=${workspaceId}&payment=success`,
    cancelUrl: `${APP_URL}/billing?workspace=${workspaceId}&payment=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

// ─────────────────────────────────────────────
// PUT /api/billing — open Stripe customer portal
// ─────────────────────────────────────────────
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
    returnUrl: `${APP_URL}/billing?workspace=${workspaceId}`,
  });

  return NextResponse.json({ url: portalSession.url });
}
