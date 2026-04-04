import { NextResponse } from "next/server";
import { stripe, syncSubscriptionSeats, computeSeatCounts, type BillingInterval } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ─── Checkout completed: create/upgrade subscription ───────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const interval = (session.metadata?.interval ?? "monthly") as BillingInterval;

        if (!workspaceId || !session.subscription) break;

        const stripeSubscription = await stripe().subscriptions.retrieve(
          session.subscription as string
        );

        const status =
          stripeSubscription.status === "trialing" ? "TRIALING" : "ACTIVE";

        await db.subscription.upsert({
          where: { workspaceId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: interval === "annual" ? "ANNUAL" : "MONTHLY",
            status,
            currentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000
            ),
            trialEndsAt:
              stripeSubscription.trial_end
                ? new Date(stripeSubscription.trial_end * 1000)
                : null,
          },
          create: {
            workspaceId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: interval === "annual" ? "ANNUAL" : "MONTHLY",
            status,
            currentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000
            ),
            trialEndsAt:
              stripeSubscription.trial_end
                ? new Date(stripeSubscription.trial_end * 1000)
                : null,
          },
        });
        break;
      }

      // ─── Subscription updated: sync status + period ────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        const status =
          sub.status === "active"
            ? "ACTIVE"
            : sub.status === "trialing"
            ? "TRIALING"
            : sub.status === "past_due"
            ? "PAST_DUE"
            : "CANCELED";

        await db.subscription.update({
          where: { workspaceId },
          data: {
            status,
            currentPeriodEnd: new Date(
              sub.items.data[0].current_period_end * 1000
            ),
          },
        });
        break;
      }

      // ─── Subscription deleted: cancel ─────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        await db.subscription.update({
          where: { workspaceId },
          data: { status: "CANCELED", stripeSubscriptionId: null },
        });
        break;
      }

      // ─── Payment failed: mark past_due ────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | null;
        };
        if (!invoice.subscription) break;

        const stripeSubscription = await stripe().subscriptions.retrieve(
          invoice.subscription as string
        );
        const workspaceId = stripeSubscription.metadata?.workspaceId;
        if (!workspaceId) break;

        await db.subscription.update({
          where: { workspaceId },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      // ─── Trial ending soon: sync seat quantities ───────────────────────
      // Fires ~3 days before trial_end. Ensures Stripe has accurate seat
      // counts before the first real charge.
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        const interval = (sub.metadata?.interval ?? "monthly") as BillingInterval;
        if (!workspaceId) break;

        const members = await db.workspaceMember.findMany({
          where: { workspaceId, status: "ACCEPTED" },
          select: { leadershipRole: true, status: true },
        });
        const seatCounts = computeSeatCounts(members);

        await syncSubscriptionSeats({
          stripeSubscriptionId: sub.id,
          interval,
          seatCounts,
        });
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
