# Radar — AI Leadership OS

**Real-time intelligence for leadership teams.** Radar connects to the tools your company already uses (Slack, GitHub, Google Calendar), detects behavioral signals across your org, and delivers a personalized daily brief to every leader — without requiring any behavior change from your team.

---

## Live App

**Production:** https://manifest-lake.vercel.app

**What works today (MVP):**
- Landing page + waitlist capture
- Demo mode — Axiom Labs synthetic org with pre-seeded signals
- Sign-up → workspace creation → onboarding flow
- Slack, GitHub, and Google Calendar OAuth connector setup
- Role-aware dashboards: CEO, Manager, and HR views
- Signal detection: ghost detection, overload, attrition risk, meeting debt, stalled work
- Ask interface — conversational AI queries about your org
- Daily brief email (8am, per-role, Resend-powered)
- Stripe billing — per-seat pricing, 14-day free trial
- Org structure input — manual mapping or CSV import
- Admin panel at `/admin`
- Health endpoint at `/api/health`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Database | PostgreSQL via Prisma ORM |
| Hosting | Vercel |
| AI Engine | Claude (Anthropic) |
| Email | Resend |
| Payments | Stripe |
| Auth | NextAuth.js |
| Connectors | Slack OAuth, GitHub OAuth, Google OAuth |

---

## Local Development

### Prerequisites

- Node 20+
- pnpm
- PostgreSQL (local or remote)

### Setup

```bash
# Install dependencies
pnpm install

# Copy env template
cp .env.example .env.local
# Fill in DATABASE_URL and AUTH_SECRET at minimum

# Run DB migrations
npx prisma migrate deploy

# Seed demo data (optional)
npx tsx scripts/seed-smoke-test.ts

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

See [`DEPLOY.md`](./DEPLOY.md) for the full list of required environment variables and where to obtain each one.

**Minimum to boot locally:**
```
DATABASE_URL=postgresql://...
AUTH_SECRET=any-random-string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Required for full functionality:**
- `ANTHROPIC_API_KEY` — AI synthesis engine
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` — daily brief emails
- `STRIPE_SECRET_KEY` + Stripe price IDs — billing
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` — Slack connector
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub connector
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Calendar connector

---

## Database

Migrations live in `prisma/migrations/`. Run them with:

```bash
npx prisma migrate deploy   # production / CI
npx prisma migrate dev      # local dev (generates migration from schema changes)
npx prisma studio           # visual DB browser
```

---

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page + waitlist |
| `/demo` | Sandbox demo — no login required |
| `/signup` | Workspace creation |
| `/dashboard` | Role-aware leadership dashboard |
| `/dashboard/connectors` | OAuth connector management |
| `/dashboard/ask` | Conversational AI interface |
| `/onboarding` | Post-signup setup flow |
| `/admin` | Internal admin panel |
| `/api/health` | Health check endpoint |
| `/api/cron/daily-synthesis` | Signal processing cron (CRON_SECRET protected) |
| `/api/cron/daily-brief-emails` | Daily email delivery cron (CRON_SECRET protected) |

---

## Signal Detection

Radar computes a rolling 30-day behavioral baseline per user and detects anomalies:

| Signal | Trigger |
|--------|---------|
| Ghost detection | User communication drops >50% below baseline for 3+ days |
| Overload | 6+ hours of meetings/day for 5+ consecutive days |
| Attrition risk | Reduced comms + reduced code output + short tenure (composite) |
| Meeting debt | Team spends >40% of working hours in meetings |
| Stalled work | PR or issue untouched for 5+ business days |

Each signal is scored low / medium / high / critical and aggregated by team, department, and org.

---

## Pricing

| Role | Monthly | Annual |
|------|---------|--------|
| Executive / CEO | $79/seat | $756/seat/yr |
| Manager | $39/seat | $372/seat/yr |
| HR | $39/seat | $372/seat/yr |
| IC (Team Member) | Free | Free |

Minimum 5 billable seats. 14-day free trial, no card required.

---

## Deployment

Full deployment runbook: [`DEPLOY.md`](./DEPLOY.md)

CI/CD: GitHub → Vercel auto-deploy on push to `main`.

---

## Project Status

MVP is feature-complete and deployed. Two items pending board action before production launch:

1. **DB migration** — requires `DATABASE_URL` set in Vercel env vars (production Supabase)
2. **Domain** — `radar.so` or equivalent to be purchased and pointed at Vercel

See [PRO-13 plan](/PRO/issues/PRO-13#document-plan) for full task breakdown.
