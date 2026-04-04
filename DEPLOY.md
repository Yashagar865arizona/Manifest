# Manifest — Deployment Runbook

> CTO note: Build is clean and tested locally. This doc covers everything needed
> to go live on Vercel + workmanifest.com once credentials arrive from the board.

---

## 1. Credentials Needed (fill before deploy)

| Variable | Where to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string | Use "Transaction" pooler URL (port 6543), not direct |
| `OPENAI_API_KEY` | platform.openai.com → API keys | Primary synthesis engine (gpt-4.1 / gpt-4.1-mini) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys | **Optional** — fallback if OpenAI is down (claude-haiku-4-5) |
| `RESEND_API_KEY` | resend.com → API Keys | |
| `RESEND_FROM_EMAIL` | `Manifest <hello@workmanifest.com>` | Domain must be verified in Resend first |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Use live key for production |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 3 below | |
| `STRIPE_PRICE_STARTER` | Created in Step 2 below | |
| `STRIPE_PRICE_GROWTH` | Created in Step 2 below | |
| `STRIPE_PRICE_SCALE` | Created in Step 2 below | |
| `AUTH_SECRET` | Already set ✓ | |
| `CRON_SECRET` | Already set ✓ | |
| `NEXTAUTH_URL` | `https://workmanifest.com` | Already set ✓ |

---

## 2. Stripe Products Setup

Create three products in the Stripe Dashboard (Products tab):

### Product 1 — Starter
- Name: `Manifest Starter`
- Pricing: **$29/month** recurring, per workspace
- Copy the Price ID → set as `STRIPE_PRICE_STARTER`

### Product 2 — Growth
- Name: `Manifest Growth`
- Pricing: **$59/month** recurring, per workspace
- Copy the Price ID → set as `STRIPE_PRICE_GROWTH`

### Product 3 — Scale
- Name: `Manifest Scale`
- Pricing: **$149/month** recurring, per workspace
- Copy the Price ID → set as `STRIPE_PRICE_SCALE`

All three products: enable 14-day free trial in the subscription settings.

---

## 3. Stripe Webhook Setup

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://workmanifest.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## 4. Resend Domain Setup

1. resend.com → Domains → Add domain → `workmanifest.com`
2. Add the DNS records Resend provides (SPF, DKIM, DMARC)
3. Wait for verification (usually <5 min)
4. Set `RESEND_FROM_EMAIL=Manifest <hello@workmanifest.com>` in Vercel

---

## 5. Supabase Setup

1. Create new Supabase project
2. Settings → Database → Connection string → **Transaction pooler** (port 6543)
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
3. Set `DATABASE_URL` in Vercel env vars

**Run migrations after first deploy:**
```bash
# From local machine with DATABASE_URL set
npx prisma migrate deploy
```

---

## 6. Vercel Deploy

```bash
# Install Vercel CLI if needed
npm i -g vercel

# From the manifest/ directory
cd manifest
vercel --prod
```

Or connect via Vercel Dashboard:
1. New Project → Import Git Repository → select this repo
2. Root Directory: `manifest`
3. Framework: Next.js (auto-detected)
4. Add all env vars from Step 1
5. Deploy

**Custom domain:**
- Vercel → Project → Settings → Domains → Add `workmanifest.com`
- Point DNS: CNAME `www` → `cname.vercel-dns.com`, A record for apex

---

## 7. Post-Deploy Checklist

- [ ] `https://workmanifest.com` loads landing page
- [ ] Waitlist form submits successfully
- [ ] `/signup` creates a user + workspace
- [ ] Invite email sends (check Resend logs)
- [ ] Check-in link works without login
- [ ] `/dashboard` shows after login
- [ ] Stripe Checkout flow opens
- [ ] Cron jobs show in Vercel → Project → Settings → Cron Jobs

---

## Cron Job Schedule (Vercel)

| Job | Schedule | Purpose |
|---|---|---|
| `/api/cron/daily-checkin-emails` | Every hour | Sends check-in prompt to members whose window is now |
| `/api/cron/daily-synthesis` | Every hour | Runs AI synthesis 4h after workspace check-in window |
| `/api/cron/weekly-report` | Fridays 6PM UTC | Generates + emails weekly manager briefing |

All cron routes are protected by `CRON_SECRET` (Vercel passes it automatically).
