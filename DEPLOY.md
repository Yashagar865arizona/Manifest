# Manifest — Deployment Runbook

> CTO note: Build is clean and tested locally. This doc covers everything needed
> to go live on Vercel + workmanifest.com once credentials arrive from the board.

---

## 1. Credentials Needed (fill before deploy)

### Core (required for app to boot)

| Variable | Where to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string | Use "Transaction" pooler URL (port 6543), not direct |
| `NEXTAUTH_URL` | `https://workmanifest.com` | Already set ✓ |
| `NEXT_PUBLIC_APP_URL` | `https://workmanifest.com` | Used for OAuth redirect URIs — must match exactly |
| `AUTH_SECRET` | Already set ✓ | |
| `CRON_SECRET` | Already set ✓ | |

### AI Engine

| Variable | Where to get it | Notes |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API keys | Primary synthesis engine (gpt-4.1 / gpt-4.1-mini) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys | Daily brief engine (claude-haiku-4-5); required for Phase 1 briefs |

### Email (Resend)

| Variable | Where to get it | Notes |
|---|---|---|
| `RESEND_API_KEY` | resend.com → API Keys | |
| `RESEND_FROM_EMAIL` | `Manifest <hello@workmanifest.com>` | Domain must be verified in Resend first |

### Payments (Stripe)

| Variable | Where to get it | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Use live key for production |
| `STRIPE_WEBHOOK_SECRET` | Created in Step 3 below | |
| `STRIPE_PRICE_EXEC_MONTHLY` | Run `scripts/stripe-setup.ts` (Step 2) | Executive/CEO monthly seat |
| `STRIPE_PRICE_EXEC_ANNUAL` | Run `scripts/stripe-setup.ts` (Step 2) | Executive/CEO annual seat |
| `STRIPE_PRICE_MGR_MONTHLY` | Run `scripts/stripe-setup.ts` (Step 2) | Manager monthly seat |
| `STRIPE_PRICE_MGR_ANNUAL` | Run `scripts/stripe-setup.ts` (Step 2) | Manager annual seat |
| `STRIPE_PRICE_HR_MONTHLY` | Run `scripts/stripe-setup.ts` (Step 2) | HR monthly seat |
| `STRIPE_PRICE_HR_ANNUAL` | Run `scripts/stripe-setup.ts` (Step 2) | HR annual seat |

### Connector OAuth (Phase 1 — required for Slack/GitHub/Google integrations)

| Variable | Where to get it | Notes |
|---|---|---|
| `SLACK_CLIENT_ID` | api.slack.com → Your Apps → OAuth & Permissions | Redirect URI: `https://workmanifest.com/api/connectors/slack/callback` |
| `SLACK_CLIENT_SECRET` | Same app settings | |
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer settings → OAuth Apps | Redirect URI: `https://workmanifest.com/api/connectors/github/callback` |
| `GITHUB_CLIENT_SECRET` | Same app settings | |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → APIs & Services → Credentials | Redirect URI: `https://workmanifest.com/api/connectors/google/callback` |
| `GOOGLE_CLIENT_SECRET` | Same credentials page | Scopes needed: `calendar.readonly` |

---

## 2. Stripe Products Setup

Run the one-time setup script to create per-seat products and prices:

```bash
STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-setup.ts
```

This creates 6 Stripe prices (Executive, Manager, HR × monthly/annual) and prints all the required env vars. Copy them into Vercel.

**Pricing model:**
| Role | Monthly | Annual (20% off, billed yearly) |
|------|---------|--------------------------------|
| Executive / CEO | $79/seat/mo | $756/seat/yr (~$63/mo) |
| Manager | $39/seat/mo | $372/seat/yr (~$31/mo) |
| HR | $39/seat/mo | $372/seat/yr (~$31/mo) |
| IC (Team Member) | Free | Free |

Minimum 5 billable leadership seats per workspace. 14-day free trial with no credit card required.

---

## 3. Stripe Webhook Setup

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://workmanifest.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
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

**Run migrations after setting DATABASE_URL:**
```bash
# From local machine with DATABASE_URL set in .env.local
npx prisma migrate deploy
```

This runs 3 migrations in order:
1. `20260403_initial_schema` — creates core tables (users, workspaces, check_ins, etc.)
2. `20260404_add_waitlist_entries` — adds waitlist table
3. `20260405_phase1_leadership_os` — adds connector credentials, raw signals, baselines, anomaly alerts, daily briefs, org nodes, and leadershipRole columns

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
