import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_do_not_use", {
    apiVersion: "2025-03-31.basil",
  });
}

// Lazy singleton — not initialized at module evaluation time
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = getStripe();
  return _stripe;
}

export const PLANS = {
  STARTER: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER!,
    monthlyPrice: 29,
    seatLimit: 10,
  },
  GROWTH: {
    name: "Growth",
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    monthlyPrice: 59,
    seatLimit: 30,
  },
  SCALE: {
    name: "Scale",
    priceId: process.env.STRIPE_PRICE_SCALE!,
    monthlyPrice: 149,
    seatLimit: 100,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function createCheckoutSession(params: {
  workspaceId: string;
  plan: PlanKey;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const plan = PLANS[params.plan];

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        workspaceId: params.workspaceId,
        plan: params.plan,
      },
    },
    metadata: {
      workspaceId: params.workspaceId,
      plan: params.plan,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}

export async function createCustomerPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  const session = await stripe().billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return session;
}
