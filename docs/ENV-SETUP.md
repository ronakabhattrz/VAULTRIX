# VAULTRIX — Environment Variables Setup Guide

Step-by-step instructions for every key in `.env.local`.  
Start here when setting up locally or deploying to production.

---

## Quick Start (Local Dev — Minimum Required)

For local development you only need 3 variables. Everything else is optional.

```env
DATABASE_URL=postgresql://ronakbhatt@localhost:5432/vaultrix
NEXTAUTH_SECRET=any-random-32-character-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

All other services (email, payments, OAuth, etc.) can be added later.

---

## 1. App

### `NEXTAUTH_URL`
The full URL of your app. Used by NextAuth for callbacks.

```env
# Local
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://yourdomain.com
```

### `NEXTAUTH_SECRET`
A random secret used to sign JWTs and cookies. Must be at least 32 characters.

**Generate one:**
```bash
openssl rand -base64 32
```
Paste the output as the value.

```env
NEXTAUTH_SECRET=abc123xyz...  # output from openssl
```

### `NEXT_PUBLIC_APP_URL`
Same as `NEXTAUTH_URL` but exposed to the browser (used for share links, email links).

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Database — PostgreSQL

### `DATABASE_URL`

**Option A — Local PostgreSQL (dev)**

Make sure PostgreSQL is running, then:
```bash
createdb vaultrix
```
```env
DATABASE_URL=postgresql://ronakbhatt@localhost:5432/vaultrix
```
Replace `ronakbhatt` with your system username (`whoami` in terminal).

**Option B — Neon (recommended for production)**

1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Click **New Project** → name it `vaultrix`
3. After creation, click **Dashboard** → **Connection string**
4. Copy the string that looks like:
   `postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require`

```env
DATABASE_URL=postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**After setting DATABASE_URL, run:**
```bash
npx prisma db push
npx prisma generate
```

---

## 3. Redis

Two separate Redis variables are needed — one for edge-safe rate limiting (Upstash REST), one for the BullMQ scan queue (ioredis).

### `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
Used for rate limiting in Next.js middleware (edge-compatible REST API).

1. Go to [upstash.com](https://upstash.com) → Sign up free
2. Click **Create Database** → name it `vaultrix` → region closest to you → **Create**
3. On the database page, scroll to **REST API**
4. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxx
```

> If these are missing or set to placeholder values, rate limiting is silently skipped — the app still works fine in dev.

### `REDIS_URL`
Used by BullMQ for the scan job queue. Needs an ioredis-compatible URL.

**Option A — Local Redis (dev)**
```bash
brew install redis && brew services start redis
```
```env
REDIS_URL=redis://localhost:6379
```

**Option B — Upstash with TLS (production)**

On your Upstash database page:
1. Scroll to **ioredis** section
2. Copy the `rediss://` URL

```env
REDIS_URL=rediss://:your-password@your-instance.upstash.io:6380
```

> Without `REDIS_URL`, scans are queued but the worker cannot process them.

---

## 4. OAuth — Google

Allows users to sign in with their Google account.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
7. Click **Create** — copy the Client ID and Client Secret

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

---

## 5. OAuth — GitHub

Allows users to sign in with their GitHub account.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: `VAULTRIX`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy **Client ID**
6. Click **Generate a new client secret** → copy it

```env
GITHUB_CLIENT_ID=Iv1.abcdef123456
GITHUB_CLIENT_SECRET=abcdef1234567890abcdef1234567890abcdef12
```

> For production, create a separate GitHub OAuth App with your production domain.

---

## 6. Email — Resend

Used for welcome emails, scan alerts, magic link login, and team invites.

1. Go to [resend.com](https://resend.com) → Sign up free
2. Go to **API Keys** → **Create API Key**
3. Name it `vaultrix` → **Full Access** → **Add**
4. Copy the key (starts with `re_`)

```env
RESEND_API_KEY=re_abc123xyz...
EMAIL_FROM=VAULTRIX <noreply@yourdomain.com>
```

> For `EMAIL_FROM`, you need to verify your domain in Resend → **Domains** → **Add Domain**.  
> For local dev, use `onboarding@resend.dev` (Resend's test address) and omit domain verification.

```env
# Dev (no domain setup needed)
EMAIL_FROM=VAULTRIX <onboarding@resend.dev>
```

---

## 7. Payments — Stripe

Used for plan subscriptions (STARTER, PRO, AGENCY, ENTERPRISE).

### API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Sign up / log in
2. Make sure you're in **Test mode** (toggle top-right)
3. Go to **Developers** → **API keys**
4. Copy **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Webhook Secret

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL:
   - Local: use [Stripe CLI](#stripe-cli-local-testing) instead
   - Production: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Click **Add endpoint** → copy **Signing secret** (`whsec_...`)

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Stripe CLI (local webhook testing)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the webhook signing secret printed by the CLI.

### Price IDs

Create products in Stripe for each plan:

1. Go to **Product catalog** → **Add product**
2. Create 4 products: STARTER, PRO, AGENCY, ENTERPRISE
3. Add monthly and annual pricing to each
4. Copy the price IDs (`price_...`) from each pricing option

```env
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_AGENCY_MONTHLY_PRICE_ID=price_xxx
STRIPE_AGENCY_ANNUAL_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_xxx
```

> In dev, Stripe keys are optional. The billing page will still render but checkout will fail.

---

## 8. File Storage — Vercel Blob

Used to store generated PDF reports and user avatars.

1. Go to your project on [vercel.com](https://vercel.com)
2. Click the **Storage** tab → **Create Database** → **Blob**
3. Name it `vaultrix-blob` → **Create**
4. Go to the Blob store → **`.env.local`** tab
5. Copy `BLOB_READ_WRITE_TOKEN`

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
```

> Only needed if you want PDF download to work. Without it, the download button will fail.

---

## 9. Analytics — PostHog (Optional)

Used for product analytics (page views, feature usage).

1. Go to [posthog.com](https://posthog.com) → Sign up free
2. Create a new project → name it `VAULTRIX`
3. Copy the **Project API Key** from **Project Settings**

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 10. Error Tracking — Sentry (Optional)

Used for runtime error monitoring.

1. Go to [sentry.io](https://sentry.io) → Sign up free
2. Create a new project → Platform: **Next.js**
3. Copy the **DSN** from the setup screen

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=vaultrix
```

---

## 11. Cron Secret

Protects the `/api/cron/scheduled-scans` endpoint from being called by anyone.

Generate a random secret:
```bash
openssl rand -hex 20
```

```env
CRON_SECRET=abc123def456...
```

**On Vercel**, add a cron job in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/scheduled-scans",
    "schedule": "0 * * * *"
  }]
}
```
Add `CRON_SECRET` as an env var in Vercel — it's automatically passed as a header.

---

## Final `.env.local` Template

Copy this, fill in what you have, leave the rest blank:

```env
# ── App ──────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                        # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Database ─────────────────────────────────────
DATABASE_URL=postgresql://ronakbhatt@localhost:5432/vaultrix

# ── Redis ────────────────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_URL=redis://localhost:6379

# ── OAuth ────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── Email ────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=VAULTRIX <onboarding@resend.dev>

# ── Stripe ───────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_STARTER_MONTHLY_PRICE_ID=
STRIPE_STARTER_ANNUAL_PRICE_ID=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_AGENCY_MONTHLY_PRICE_ID=
STRIPE_AGENCY_ANNUAL_PRICE_ID=
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=

# ── Storage ──────────────────────────────────────
BLOB_READ_WRITE_TOKEN=

# ── Analytics & Monitoring (optional) ───────────
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=vaultrix

# ── Cron ─────────────────────────────────────────
CRON_SECRET=                            # openssl rand -hex 20
```

---

## What's Required vs Optional

| Variable | Local Dev | Production |
|---|---|---|
| `DATABASE_URL` | Required | Required |
| `NEXTAUTH_SECRET` | Required | Required |
| `NEXT_PUBLIC_APP_URL` | Required | Required |
| `REDIS_URL` | Optional (scans won't process) | Recommended |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Optional (rate limiting skipped) | Recommended |
| `RESEND_API_KEY` | Optional (emails skipped) | Recommended |
| `GOOGLE_CLIENT_ID/SECRET` | Optional | Optional |
| `GITHUB_CLIENT_ID/SECRET` | Optional | Optional |
| `STRIPE_*` | Optional (billing broken) | Required for paid plans |
| `BLOB_READ_WRITE_TOKEN` | Optional (PDF broken) | Recommended |
| `CRON_SECRET` | Optional | Required |
| `SENTRY_*` | Optional | Optional |
| `POSTHOG_*` | Optional | Optional |
