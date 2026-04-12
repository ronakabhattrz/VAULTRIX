# VAULTRIX — Setup & Pre-Production Checklist

## Why Registration Fails Right Now

The `DATABASE_URL` in `.env.local` points to `localhost:5432/vaultrix` which doesn't exist.
**Fix: use Neon (free) or a local PostgreSQL.**

---

## Quick Start (Local Dev)

### Step 1 — Database (Required to log in / register)

**Option A: Neon (recommended, free, no install)**
1. Go to https://neon.tech → sign up → New Project → name it `vaultrix`
2. Copy the connection string from the dashboard
3. Update `.env.local`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

**Option B: Local PostgreSQL**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
createdb vaultrix
```
Then set:
```
DATABASE_URL=postgresql://postgres@localhost:5432/vaultrix
```

**After setting DATABASE_URL, run:**
```bash
npx prisma db push
```
This creates all tables. Now register/login will work.

---

### Step 2 — Generate NEXTAUTH_SECRET (Required for sessions)
```bash
openssl rand -base64 32
```
Paste the output into `.env.local`:
```
NEXTAUTH_SECRET=<output>
```

---

### Step 3 — Upstash Redis (Required for rate limiting & scan queue)
1. Go to https://upstash.com → sign up → New Database
2. Copy values into `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXxx...
   REDIS_URL=rediss://:AXxx...@xxx.upstash.io:6380
   ```

> Without this, rate limiting is skipped (safe for dev) but scans won't queue.

---

### Step 4 — Resend Email (Required for password reset & email verify)
1. Go to https://resend.com → sign up → API Keys → Create Key
2. Add a verified domain (or use the sandbox `onboarding@resend.dev` for testing)
3. Update `.env.local`:
   ```
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

---

### Step 5 — Stripe (Required for billing)
1. Go to https://stripe.com → Dashboard → Developers → API Keys
2. Update `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```
3. For webhooks locally:
   ```bash
   npx stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the webhook signing secret shown:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
4. Create products in Stripe dashboard and set price IDs:
   ```
   STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
   STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
   STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
   STRIPE_AGENCY_MONTHLY_PRICE_ID=price_xxx
   STRIPE_AGENCY_ANNUAL_PRICE_ID=price_xxx
   ```

---

### Step 6 — Run Dev Server
```bash
npm run dev
# App: http://localhost:3000
```

### Step 7 — Run Scan Worker (separate terminal, needed for scanning)
```bash
npx tsx src/workers/scanWorker.ts
```

---

## Pre-Production Checklist

### Security
- [ ] `NEXTAUTH_SECRET` is a random 32+ char string (not the dev placeholder)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] All API keys are production keys (not test/sandbox)
- [ ] `.env.local` is in `.gitignore` — never commit secrets
- [ ] Stripe webhook secret is set from production endpoint (not CLI listener)
- [ ] `NEXT_PUBLIC_APP_URL` is your production domain (e.g. `https://vaultrix.io`)
- [ ] `NEXTAUTH_URL` is your production domain

### Database
- [ ] Run `npx prisma migrate deploy` (not `db push`) in production
- [ ] Database has SSL enabled
- [ ] Database is in same region as your hosting

### Email
- [ ] Resend domain is verified (DNS records added)
- [ ] `RESEND_FROM_EMAIL` uses your verified domain
- [ ] Test password reset email works end-to-end

### Stripe
- [ ] Switch from `sk_test_` to `sk_live_` keys
- [ ] Production webhook endpoint added in Stripe dashboard
- [ ] All price IDs are from live mode products

### Performance
- [ ] `npx prisma generate` runs in CI/CD pipeline
- [ ] `REDIS_URL` points to a persistent Redis (not ephemeral)
- [ ] Scan worker is running as a separate process/service

### Vercel Deployment
```bash
# Set all env vars in Vercel dashboard or via CLI:
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... etc

# Deploy
vercel --prod
```

### Environment Variables — Complete List
```env
# App
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://...?sslmode=require

# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
REDIS_URL=rediss://:xxx@xxx.upstash.io:6380

# Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_AGENCY_MONTHLY_PRICE_ID=price_xxx
STRIPE_AGENCY_ANNUAL_PRICE_ID=price_xxx

# Storage (Vercel Blob)
VERCEL_BLOB_READ_WRITE_TOKEN=xxx

# Optional
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Registration failed` | No database | Set `DATABASE_URL` + run `npx prisma db push` |
| `fetch failed` in middleware | Bad Upstash URL | Set real Upstash credentials or leave placeholder (rate limiting is skipped) |
| `Cannot find module '@react-email/render'` | Missing dep | `npm install @react-email/render` |
| `Prisma client not initialized` | Missing generate | `npx prisma generate` |
| `NEXTAUTH_SECRET` error | Missing secret | `openssl rand -base64 32` → set in `.env.local` |
| Scan stuck at queued | Worker not running | Run `npx tsx src/workers/scanWorker.ts` |
