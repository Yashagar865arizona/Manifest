/**
 * One-time Stripe setup: creates products and prices for per-seat billing.
 *
 * Run once in production before enabling Stripe:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-setup.ts
 *
 * Copy the printed env var values into Vercel environment variables.
 *
 * Pricing:
 *   Executive/CEO: $79/mo or $756/yr (~$63/seat/mo)
 *   Manager:       $39/mo or $372/yr (~$31/seat/mo)
 *   HR:            $39/mo or $372/yr (~$31/seat/mo)
 */

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey || secretKey.startsWith("sk_test_placeholder")) {
  console.error("Set STRIPE_SECRET_KEY before running this script.");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" });

async function createPricesForRole(
  roleName: string,
  monthlyAmount: number // in USD
): Promise<{ monthly: string; annual: string }> {
  const product = await stripe.products.create({
    name: `Manifest AI Leadership OS — ${roleName}`,
    metadata: { role: roleName.toUpperCase().replace(/ \/.*/, "") },
  });

  const monthly = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: monthlyAmount * 100, // cents
    recurring: { interval: "month" },
    nickname: `${roleName} Monthly`,
    metadata: { role: roleName, interval: "monthly" },
  });

  // Annual = 12 × monthly × 0.80 (20% off), billed once per year
  const annualAmount = Math.round(monthlyAmount * 12 * 0.8);
  const annual = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: annualAmount * 100,
    recurring: { interval: "year" },
    nickname: `${roleName} Annual`,
    metadata: { role: roleName, interval: "annual" },
  });

  return { monthly: monthly.id, annual: annual.id };
}

async function main() {
  console.log("Creating Stripe products and prices...\n");

  const exec = await createPricesForRole("Executive / CEO", 79);
  const mgr = await createPricesForRole("Manager", 39);
  const hr = await createPricesForRole("HR", 39);

  console.log("Done. Add these to your Vercel environment variables:\n");
  console.log(`STRIPE_PRICE_EXEC_MONTHLY=${exec.monthly}`);
  console.log(`STRIPE_PRICE_EXEC_ANNUAL=${exec.annual}`);
  console.log(`STRIPE_PRICE_MGR_MONTHLY=${mgr.monthly}`);
  console.log(`STRIPE_PRICE_MGR_ANNUAL=${mgr.annual}`);
  console.log(`STRIPE_PRICE_HR_MONTHLY=${hr.monthly}`);
  console.log(`STRIPE_PRICE_HR_ANNUAL=${hr.annual}`);
  console.log(
    "\nAlso set STRIPE_WEBHOOK_SECRET from the Stripe dashboard after creating your webhook endpoint."
  );
  console.log(
    "Webhook endpoint: https://your-domain.com/api/webhooks/stripe"
  );
  console.log(
    "Required events: checkout.session.completed, customer.subscription.updated, " +
      "customer.subscription.deleted, customer.subscription.trial_will_end, " +
      "invoice.payment_failed"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
