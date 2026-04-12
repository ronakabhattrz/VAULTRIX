# VAULTRIX — Enterprise Web Security SaaS

A full-stack, production-ready web security scanning platform. Users submit a URL and receive a scored security report covering HTTP headers, SSL/TLS, DNS, cookies, CORS, open ports, web application vulnerabilities, and compliance frameworks (GDPR, PCI-DSS, SOC 2, HIPAA).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Scanner Modules](#scanner-modules)
- [Plans & Limits](#plans--limits)
- [API Reference](#api-reference)
- [Test Accounts](#test-accounts)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Scan Worker](#running-the-scan-worker)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict, 0 errors) |
| Database | PostgreSQL via Prisma 5 |
| Auth | NextAuth v5 (JWT strategy) |
| Job Queue | BullMQ + ioredis |
| Rate Limiting | Upstash Redis (REST, edge-safe) |
| Email | Resend + React Email |
| Payments | Stripe (subscriptions + webhooks) |
| File Storage | Vercel Blob |
| Headless Browser | Puppeteer + @sparticuz/chromium |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Monitoring | Sentry + PostHog |
| Deployment | Vercel |

---

## Project Structure

```
VAULTRIX/
├── prisma/
│   ├── schema.prisma          # Full DB schema (13 models)
│   └── seed.ts                # Test data — 8 users across all plans
├── src/
│   ├── app/
│   │   ├── (marketing)/       # Landing page, pricing, blog
│   │   ├── (dashboard)/       # Authenticated user app
│   │   │   ├── dashboard/     # Overview stats & recent scans
│   │   │   ├── scan/          # New scan form, running progress, report view
│   │   │   ├── reports/       # Full scan history with filters
│   │   │   ├── scheduled/     # Scheduled scan management
│   │   │   ├── api-access/    # API key generation & docs
│   │   │   ├── team/          # Team members (Agency+)
│   │   │   ├── clients/       # Client management (Agency+)
│   │   │   ├── billing/       # Stripe subscription portal
│   │   │   └── settings/      # Profile & notification preferences
│   │   ├── admin/             # Admin panel (isAdmin=true only)
│   │   │   ├── dashboard/     # Platform-wide stats
│   │   │   ├── users/         # User table with inline management
│   │   │   ├── scans/         # All scans across all users
│   │   │   └── system/        # Env var status, manual cron trigger
│   │   ├── api/
│   │   │   ├── v1/            # Public REST API (Bearer token auth)
│   │   │   │   ├── scan/      # Start scans
│   │   │   │   ├── scans/     # List & fetch scans
│   │   │   │   ├── user/      # Profile
│   │   │   │   ├── scheduled/ # Scheduled scans
│   │   │   │   ├── team/      # Team invite
│   │   │   │   ├── clients/   # Client management
│   │   │   │   ├── webhooks/  # Outbound webhooks
│   │   │   │   └── alerts/    # Alert rules
│   │   │   ├── admin/         # Admin-only endpoints
│   │   │   │   ├── stats/     # Platform stats
│   │   │   │   ├── users/     # CRUD user management
│   │   │   │   └── scans/     # Browse & delete scans
│   │   │   ├── auth/          # NextAuth handlers
│   │   │   ├── stripe/        # Checkout, portal, webhooks
│   │   │   ├── cron/          # Scheduled scan runner
│   │   │   └── demo/          # Unauthenticated demo scan
│   │   ├── auth/              # Login, register, magic link pages
│   │   └── r/[shareToken]/    # Public shareable report pages
│   ├── lib/
│   │   ├── scanner/
│   │   │   ├── index.ts       # Main scan orchestrator
│   │   │   ├── scoring.ts     # Score & grade calculator
│   │   │   ├── types.ts       # Shared scanner types & interfaces
│   │   │   └── modules/       # 13 individual scanner modules
│   │   ├── auth.ts            # NextAuth config + JWT callbacks
│   │   ├── api.ts             # ok()/err() helpers, requireAuth, quota
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── email.ts           # Welcome, alert, report emails
│   │   ├── redis.ts           # Upstash REST client (edge-compatible)
│   │   ├── ioredis.ts         # ioredis client (Node.js only, BullMQ)
│   │   ├── queue.ts           # BullMQ queue definitions
│   │   └── stripe.ts          # Stripe client + product helpers
│   ├── workers/
│   │   └── scanWorker.ts      # BullMQ worker (run as separate process)
│   └── middleware.ts          # Route auth guards + rate limiting
├── docs/
│   ├── GET-API-KEYS.md        # Step-by-step guide for every service
│   └── ADMIN-GUIDE.md         # Admin panel usage & SQL queries
└── SETUP.md                   # Pre-production checklist
```

---

## Features

### User App
- **Security scanning** — submit any URL, receive a score (0–100) and letter grade (A+ → F)
- **13 scanner modules** — headers, SSL, DNS, email security, cookies, CORS, ports, webapp, auth, content, performance, compliance, API exposure
- **Scan profiles** — Quick / Standard / Deep / Full (gated by plan)
- **Scheduled scans** — daily/weekly/monthly recurring scans with email alerts
- **PDF reports** — download a branded PDF of any completed scan
- **Shareable reports** — public links to share scan results
- **REST API** — full API access with per-key rate limiting (PRO+)
- **Team management** — invite members with ADMIN/ANALYST/VIEWER roles (Agency+)
- **Client management** — manage multiple clients under one org (Agency+)
- **Webhooks** — get notified on scan completion or grade drop
- **Alert rules** — automatic alerts when score falls below a threshold
- **Billing** — Stripe subscription management with plan upgrades/downgrades

### Admin Panel
- Platform stats — total users, scans, success rate, avg duration, users by plan
- User management — change plan inline, suspend/unsuspend, grant/revoke admin, delete
- Scan management — browse all scans across all users, view reports, delete
- System panel — environment variable status, manual cron trigger, app info

---

## Scanner Modules

| Module | What it checks |
|---|---|
| `headers` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| `ssl` | Certificate validity, expiry, grade, protocol version (TLS 1.2/1.3), cipher suites |
| `dns` | DNSSEC, CAA records, zone transfer exposure |
| `email` | SPF, DKIM, DMARC records and policy strength |
| `cookies` | Secure, HttpOnly, SameSite flags on all Set-Cookie responses |
| `cors` | Wildcard origins, unsafe credential exposure |
| `ports` | Common exposed ports (22, 21, 3306, 5432, 6379, 27017, etc.) |
| `webapp` | Forms without CSRF tokens, mixed content, inline scripts |
| `auth` | Login page field security, password autocomplete, brute-force headers |
| `content` | Sensitive data in HTML — emails, API keys, private tokens |
| `performance` | Response time, gzip/brotli compression, cache headers |
| `compliance` | GDPR, PCI-DSS, SOC 2, HIPAA checklist items |
| `api` | Exposed API endpoints, swagger/openapi docs, GraphQL introspection |

---

## Plans & Limits

| Plan | Scans/month | Scan profile | API | Team | Clients |
|---|---|---|---|---|---|
| FREE | 5 | Quick | — | — | — |
| STARTER | 50 | Standard | — | — | — |
| PRO | 200 | Deep | Yes | — | — |
| AGENCY | 500 | Full | Yes | Yes | Yes |
| ENTERPRISE | Unlimited | Full | Yes | Yes | Yes |

---

## API Reference

Base URL: `/api/v1/`  
Auth: `Authorization: Bearer <api-key>`

### Scans
```
POST   /api/v1/scan              Start a new scan
GET    /api/v1/scans             List your scans (paginated)
GET    /api/v1/scans/:id         Get scan status + full results
```

### User
```
GET    /api/v1/user              Profile + plan info
PATCH  /api/v1/user              Update name / preferences
```

### Scheduled Scans
```
GET    /api/v1/scheduled         List all scheduled scans
POST   /api/v1/scheduled         Create a scheduled scan
DELETE /api/v1/scheduled/:id     Delete a scheduled scan
```

### Team (Agency+)
```
GET    /api/v1/team              List team members
POST   /api/v1/team/invite       Invite a member (roles: ADMIN, ANALYST, VIEWER)
```

### Clients (Agency+)
```
GET    /api/v1/clients           List clients
POST   /api/v1/clients           Create a client
```

### Webhooks
```
GET    /api/v1/webhooks          List webhooks
POST   /api/v1/webhooks          Create a webhook
DELETE /api/v1/webhooks/:id      Delete a webhook
```

### Alerts
```
GET    /api/v1/alerts            List alert rules
POST   /api/v1/alerts            Create an alert rule
```

### Response format
Every response is wrapped:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human-readable message" }
```

---

## Test Accounts

All test accounts use password: **`Test@1234`**

| Email | Plan | Notes |
|---|---|---|
| alice@test.com | FREE | 5 scans/month limit |
| bob@test.com | STARTER | 50 scans/month |
| carol@test.com | PRO | 200 scans/month + API access |
| dave@test.com | AGENCY | 500 scans/month + team + clients |
| eve@test.com | ENTERPRISE | Unlimited + all features |
| frank@test.com | FREE | **Suspended** — login will be rejected |
| grace@test.com | PRO | Second PRO test account |
| henry@test.com | STARTER | Second STARTER test account |

**Re-seed at any time:**
```bash
DATABASE_URL="postgresql://your_user@localhost:5432/vaultrix" npx tsx prisma/seed.ts
```

**Make yourself admin:**
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';
```
Sign out and back in — the Admin Panel link appears in the sidebar.

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Redis (optional — needed only for BullMQ scan queue)

### 1. Clone & install
```bash
git clone https://github.com/ronakabhattrz/VAULTRIX.git
cd VAULTRIX
npm install
```

### 2. Environment
Create `.env.local` in the project root:
```env
DATABASE_URL=postgresql://your_pg_user@localhost:5432/vaultrix
NEXTAUTH_SECRET=some-random-32-character-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Create `.env` (Prisma CLI only reads this by default):
```env
DATABASE_URL=postgresql://your_pg_user@localhost:5432/vaultrix
```

### 3. Set up the database
```bash
createdb vaultrix
npx prisma db push      # apply schema
npx prisma generate     # generate client
```

### 4. Seed test data
```bash
DATABASE_URL="postgresql://your_pg_user@localhost:5432/vaultrix" npx tsx prisma/seed.ts
```

### 5. Start the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Start the scan worker (optional)
In a separate terminal — required for scans to process:
```bash
REDIS_URL=redis://localhost:6379 npx tsx src/workers/scanWorker.ts
```
Without Redis, scans will queue but never run.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | **Yes** | Random secret, min 32 chars |
| `NEXT_PUBLIC_APP_URL` | **Yes** | App base URL (no trailing slash) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis for edge rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis auth token |
| `REDIS_URL` | No | Redis for BullMQ job queue |
| `RESEND_API_KEY` | No | Transactional email |
| `EMAIL_FROM` | No | Sender address (default: `noreply@vaultrix.io`) |
| `STRIPE_SECRET_KEY` | No | Stripe subscriptions |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe client-side key |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob for PDF storage |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `SENTRY_DSN` | No | Sentry error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog product analytics |
| `CRON_SECRET` | No | Protects `/api/cron/*` routes |

> Full service setup guide: `docs/GET-API-KEYS.md`

---

## Database

### Models

| Model | Description |
|---|---|
| `User` | Accounts — plan, isAdmin, isSuspended, monthly scan counters |
| `Scan` | Scan jobs — status, score, grade, findings JSON, modules run |
| `ApiKey` | Per-user API keys with usage tracking |
| `ScheduledScan` | Recurring scan rules with frequency and last run time |
| `Organization` | Team workspace (Agency+) |
| `OrgMember` | User ↔ Organization link with role (OWNER/ADMIN/ANALYST/VIEWER) |
| `Client` | Clients managed by an organisation |
| `Invitation` | Pending team invites with expiry token |
| `Webhook` | Outbound webhook endpoints per user |
| `AlertRule` | Score/grade threshold notification rules |
| `Subscription` | Stripe subscription records |

### Useful SQL

```sql
-- Make a user admin
UPDATE "User" SET "isAdmin" = true WHERE email = 'you@example.com';

-- Change a user's plan
UPDATE "User" SET plan = 'PRO' WHERE email = 'user@example.com';

-- Suspend / unsuspend
UPDATE "User" SET "isSuspended" = true  WHERE email = 'user@example.com';
UPDATE "User" SET "isSuspended" = false WHERE email = 'user@example.com';

-- View scan counts per user
SELECT email, plan, "totalScans", "scanCountThisMonth"
FROM "User" ORDER BY "totalScans" DESC;

-- Reset monthly scan counts (cron does this automatically)
UPDATE "User" SET "scanCountThisMonth" = 0;
```

### Schema management

```bash
# Apply schema changes to dev DB (no migration file)
npx prisma db push

# Create a named migration (production workflow)
npx prisma migrate dev --name "describe_your_change"

# Apply pending migrations in production
npx prisma migrate deploy
```

---

## Running the Scan Worker

Scans are processed by a BullMQ worker that runs as a **separate Node.js process**.

```bash
REDIS_URL=redis://localhost:6379 npx tsx src/workers/scanWorker.ts
```

**Worker flow:**
1. Picks up a job from the `scan` BullMQ queue
2. Runs all applicable scanner modules in parallel
3. Calculates score + grade
4. Persists findings to the `Scan` record in the DB
5. Fires configured webhooks
6. Sends alert emails if score drops below any configured threshold

---

## Admin Panel

Access: `/admin` — account must have `isAdmin = true`.

| Section | What you can do |
|---|---|
| Dashboard | Platform stats — users, scans, success rate, avg duration, plan breakdown |
| Users | Change plan (inline dropdown), suspend/unsuspend, grant/revoke admin, delete user |
| Scans | Browse all scans, view completed reports, delete scans |
| System | Check env var status, trigger scheduled scan cron manually, view app info |

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Use a managed Postgres (Neon / Supabase / Railway) for `DATABASE_URL`
5. Deploy

### Post-deploy checklist

- [ ] Run `npx prisma migrate deploy` against the production database
- [ ] Set a strong `NEXTAUTH_SECRET` (different from dev)
- [ ] Configure Stripe webhook: `https://yourdomain.com/api/stripe/webhook`
- [ ] Add `/api/cron/scheduled-scans` to Vercel Cron with `CRON_SECRET`
- [ ] Verify `NEXT_PUBLIC_APP_URL` matches the production domain
- [ ] Set your admin account: `UPDATE "User" SET "isAdmin" = true WHERE email = '...'`

> Full checklist: `SETUP.md`

---

## License

Private — all rights reserved. © Ronak Bhatt
