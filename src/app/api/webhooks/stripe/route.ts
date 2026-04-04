import { NextResponse } from "next/server";
import { stripe, PLANS, PlanKey } from "@/lib/stripe";
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const plan = session.metadata?.plan as PlanKey;

        if (!workspaceId || !plan) break;

        const planConfig = PLANS[plan];
        const subscription = session.subscription as string;

        // Retrieve subscription to get period end
        const stripeSubscription = await stripe().subscriptions.retrieve(subscription);

        await db.subscription.upsert({
          where: { workspaceId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription,
            plan,
            status: "ACTIVE",
            seatLimit: planConfig.seatLimit,
            currentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000
            ),
            trialEndsAt: null,
          },
          create: {
            workspaceId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription,
            plan,
            status: "ACTIVE",
            seatLimit: planConfig.seatLimit,
            currentPeriodEnd: new Date(
              stripeSubscription.items.data[0].current_period_end * 1000
            ),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) break;

        const status =
          subscription.status === "active"
            ? "ACTIVE"
            : subscription.status === "trialing"
            ? "TRIALING"
            : subscription.status === "past_due"
            ? "PAST_DUE"
            : "CANCELED";

        await db.subscription.update({
          where: { workspaceId },
          data: {
            status,
            currentPeriodEnd: new Date(
              subscription.items.data[0].current_period_end * 1000
            ),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) break;

        await db.subscription.update({
          where: { workspaceId },
          data: { status: "CANCELED" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        if (invoice.subscription) {
          const stripeSubscription = await stripe().subscriptions.retrieve(
            invoice.subscription as string
          );
          const workspaceId = stripeSubscription.metadata?.workspaceId;
          if (workspaceId) {
            await db.subscription.update({
              where: { workspaceId },
              data: { status: "PAST_DUE" },
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
