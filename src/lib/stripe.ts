import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_do_not_use", {
    apiVersion: "2025-03-31.basil",
  });
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = getStripe();
  return _stripe;
}

// ─────────────────────────────────────────────
// Per-seat pricing by leadership role + billing interval
//
// Run scripts/stripe-setup.ts once to create products/prices in Stripe
// and populate these env vars in Vercel.
// ─────────────────────────────────────────────

export const SEAT_PRICES = {
  EXECUTIVE: {
    monthly: process.env.STRIPE_PRICE_EXEC_MONTHLY!,
    annual: process.env.STRIPE_PRICE_EXEC_ANNUAL!,
    monthlyRate: 79,
    annualMonthlyRate: 63, // $756/yr ÷ 12
  },
  MANAGER: {
    monthly: process.env.STRIPE_PRICE_MGR_MONTHLY!,
    annual: process.env.STRIPE_PRICE_MGR_ANNUAL!,
    monthlyRate: 39,
    annualMonthlyRate: 31, // $372/yr ÷ 12
  },
  HR: {
    monthly: process.env.STRIPE_PRICE_HR_MONTHLY!,
    annual: process.env.STRIPE_PRICE_HR_ANNUAL!,
    monthlyRate: 39,
    annualMonthlyRate: 31,
  },
} as const;

export type BillingInterval = "monthly" | "annual";
export type SeatRole = keyof typeof SEAT_PRICES;

export const MIN_BILLABLE_SEATS = 5;

export interface SeatCounts {
  EXECUTIVE: number;
  MANAGER: number;
  HR: number;
  // Total billable leadership seats (IC excluded)
  billableTotal: number;
}

export interface InvoiceEstimate {
  seatCounts: SeatCounts;
  billedSeats: number; // max(billableTotal, MIN_BILLABLE_SEATS)
  monthlyTotal: number; // USD
  interval: BillingInterval;
}

// ─────────────────────────────────────────────
// Utility: count leadership seats by role from member list
// ─────────────────────────────────────────────
export function computeSeatCounts(
  members: Array<{ leadershipRole: string; status: string }>
): SeatCounts {
  const accepted = members.filter((m) => m.status === "ACCEPTED");
  const EXECUTIVE = accepted.filter((m) => m.leadershipRole === "CEO").length;
  const MANAGER = accepted.filter((m) => m.leadershipRole === "MANAGER").length;
  const HR = accepted.filter((m) => m.leadershipRole === "HR").length;
  return { EXECUTIVE, MANAGER, HR, billableTotal: EXECUTIVE + MANAGER + HR };
}

// ─────────────────────────────────────────────
// Utility: compute estimated next invoice amount
// ─────────────────────────────────────────────
export function computeInvoiceEstimate(
  seatCounts: SeatCounts,
  interval: BillingInterval
): InvoiceEstimate {
  const rateKey = interval === "annual" ? "annualMonthlyRate" : "monthlyRate";
  const raw =
    seatCounts.EXECUTIVE * SEAT_PRICES.EXECUTIVE[rateKey] +
    seatCounts.MANAGER * SEAT_PRICES.MANAGER[rateKey] +
    seatCounts.HR * SEAT_PRICES.HR[rateKey];

  // Minimum 5 seats billed — floor at 5× MANAGER monthly rate equivalent
  const minFloor = MIN_BILLABLE_SEATS * SEAT_PRICES.MANAGER[rateKey];
  const monthlyTotal = Math.max(raw, minFloor);
  const billedSeats = Math.max(seatCounts.billableTotal, MIN_BILLABLE_SEATS);

  return { seatCounts, billedSeats, monthlyTotal, interval };
}

// ─────────────────────────────────────────────
// Build Stripe line_items from seat counts
// Enforces minimum of 5 seats (padded into MANAGER tier)
// ─────────────────────────────────────────────
function buildLineItems(
  seatCounts: SeatCounts,
  interval: BillingInterval
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const items: Array<{ role: SeatRole; quantity: number }> = [
    { role: "EXECUTIVE", quantity: seatCounts.EXECUTIVE },
    { role: "MANAGER", quantity: seatCounts.MANAGER },
    { role: "HR", quantity: seatCounts.HR },
  ];

  // Apply minimum seat padding to MANAGER tier
  const padding = Math.max(0, MIN_BILLABLE_SEATS - seatCounts.billableTotal);
  if (padding > 0) {
    const mgr = items.find((i) => i.role === "MANAGER")!;
    mgr.quantity += padding;
  }

  // If still empty (no leadership seats at all), bill 5 MANAGER seats
  const total = items.reduce((s, i) => s + i.quantity, 0);
  if (total === 0) {
    return [{ price: SEAT_PRICES.MANAGER[interval], quantity: MIN_BILLABLE_SEATS }];
  }

  return items
    .filter((i) => i.quantity > 0)
    .map((i) => ({ price: SEAT_PRICES[i.role][interval], quantity: i.quantity }));
}

// ─────────────────────────────────────────────
// Create Stripe checkout session for upgrade / subscription start
// Carries forward remaining trial time if trialEndsAt is in the future.
// ─────────────────────────────────────────────
export async function createUpgradeCheckoutSession(params: {
  workspaceId: string;
  interval: BillingInterval;
  seatCounts: SeatCounts;
  customerEmail: string;
  trialEndsAt: Date | null;
  successUrl: string;
  cancelUrl: string;
}) {
  const lineItems = buildLineItems(params.seatCounts, params.interval);

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: { workspaceId: params.workspaceId, interval: params.interval },
  };
  if (params.trialEndsAt && params.trialEndsAt > new Date()) {
    subscriptionData.trial_end = Math.floor(params.trialEndsAt.getTime() / 1000);
  }

  return stripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: lineItems,
    subscription_data: subscriptionData,
    metadata: { workspaceId: params.workspaceId, interval: params.interval },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
}

// ─────────────────────────────────────────────
// Sync seat quantities on an active Stripe subscription
// Called when workspace members are added/removed/role-changed.
// ─────────────────────────────────────────────
export async function syncSubscriptionSeats(params: {
  stripeSubscriptionId: string;
  interval: BillingInterval;
  seatCounts: SeatCounts;
}) {
  const { stripeSubscriptionId, interval, seatCounts } = params;

  const sub = await stripe().subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["items"],
  });

  const itemsByPrice = new Map(sub.items.data.map((item) => [item.price.id, item]));

  const desired = [
    { role: "EXECUTIVE" as SeatRole, quantity: seatCounts.EXECUTIVE },
    { role: "MANAGER" as SeatRole, quantity: seatCounts.MANAGER },
    { role: "HR" as SeatRole, quantity: seatCounts.HR },
  ];

  // Apply minimum seat floor to MANAGER
  const padding = Math.max(0, MIN_BILLABLE_SEATS - seatCounts.billableTotal);
  desired.find((d) => d.role === "MANAGER")!.quantity += padding;

  const updates: Promise<unknown>[] = [];

  for (const { role, quantity } of desired) {
    const priceId = SEAT_PRICES[role][interval];
    const existing = itemsByPrice.get(priceId);

    if (quantity > 0) {
      if (existing) {
        if (existing.quantity !== quantity) {
          updates.push(stripe().subscriptionItems.update(existing.id, { quantity }));
        }
      } else {
        updates.push(
          stripe().subscriptionItems.create({
            subscription: stripeSubscriptionId,
            price: priceId,
            quantity,
          })
        );
      }
    } else if (existing) {
      // Remove item if quantity drops to 0 and it's not the last item
      if (sub.items.data.length > 1) {
        updates.push(stripe().subscriptionItems.del(existing.id));
      }
    }
  }

  await Promise.all(updates);
}

// ─────────────────────────────────────────────
// Customer portal (manage card, view invoices)
// ─────────────────────────────────────────────
export async function createCustomerPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  return stripe().billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });
}
