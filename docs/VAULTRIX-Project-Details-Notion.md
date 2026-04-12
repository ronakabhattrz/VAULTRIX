# VAULTRIX — Project details

> **Product:** VAULTRIX — enterprise web security SaaS  
> **Domain:** [vaultrix.io](https://vaultrix.io)  
> **Tagline:** Scan. Detect. Fortify.  
> **Audience:** B2B — commercial product for businesses  
> **Document purpose:** Single source of truth for scope, stack, and delivery (import into Notion or paste as sub-pages).

---

## Executive summary

VAULTRIX is a full-stack security scanning platform: users submit URLs, the engine runs modular checks (headers, SSL/TLS, DNS, ports, web app, cookies, CORS, API exposure, email, auth, content fingerprinting, performance, compliance mapping), and results are shown in-app with PDF reports, scheduling, alerts, team/client features (Agency+), Stripe billing, and a public API.

**Non-negotiables:** TypeScript strict, production-ready UX (loading/error/empty states), dark theme only, RHF + Zod forms, disclaimer on landing footer, new scan page, terms, and PDFs.

---

## Brand & design

| Item | Value |
|------|--------|
| Logo | Shield + checkmark (inline SVG) |
| Backgrounds | `#050508` base · `#0d0d14` surface · `#111120` card |
| Borders | `#1e1e35` · hover `#2a2a4a` |
| Text | `#f0f0ff` primary · `#8888aa` muted · `#3a3a5c` disabled |
| Accent (safe/CTA) | `#4ade80` |
| Severities | CRITICAL `#ef4444` · HIGH `#f59e0b` · MEDIUM `#60a5fa` · LOW/INFO muted |
| Headings / logo / nav | **Chakra Petch** (400, 600, 700) |
| Body / code / URLs | **DM Mono** (400, 500) |

**Motion (Framer Motion):** page fade-up; stagger 0.08s; terminal typewriter; animated score gauge; card hover scale + border; sidebar hover indicator; hero CSS particles (20 dots).

---

## Tech stack (versions to pin in repo)

### Frontend
- Next.js 14.2+ (App Router, TS strict)
- Tailwind 3.4 + shadcn/ui (full set listed in spec)
- Framer Motion 11
- Recharts 2.x
- TanStack Query v5
- React Hook Form + Zod
- next-themes (dark-only config)
- Sonner

### Backend & data
- Next.js API Routes (TS strict)
- Prisma 5 + PostgreSQL (Neon)
- Redis (Upstash): rate limit, cache, pub/sub
- BullMQ: scan queue
- SSE: live scan progress
- Scanner: `node-tls`, `node-dns`, `node-net`, axios, cheerio
- PDF: pdf-lib + puppeteer

### Auth
- NextAuth.js v5 (App Router)
- Credentials (bcrypt), Google, GitHub, Magic Link (Resend)
- JWT sessions + CSRF protection

### Payments & comms
- Stripe (subscriptions, webhooks, billing portal) — server-only SDK
- Resend + React Email templates (full list below)

### Storage & observability
- Vercel Blob (+ local dev fallback)
- Sentry, Vercel Analytics, PostHog (flags + product analytics)

### Deploy & CI
- Vercel primary
- Dockerfile (Node 20 Alpine, `node server.js`)
- GitHub Actions CI/CD
- `.env.example` with 40+ documented variables

---

## Data model (Prisma) — summary

**Enums:** `Plan`, `ScanStatus`, `Severity`, `OrgRole`, `ScanFrequency`, `AlertChannel`

**Core entities:** `User`, `Account`, `UserSession`, `Organization`, `OrgMember`, `Client`, `Scan`, `ScanCategoryScore`, `ComplianceResult`, `ScheduledScan`, `AlertRule`, `ScanAlert`, `ApiUsage`, `Notification`, `Webhook`, `Invitation`

Full field-level schema lives in `prisma/schema.prisma` (source of truth in codebase).

---

## Scanning engine

**Location:** `lib/scanner/` (types, scoring, orchestrator, `modules/*`)

**Types:** `Finding`, `ScannerResult`, `TechStack`, `ScanResult` (see spec Section 4).

**Modules (13):**
1. headers  
2. ssl  
3. dns  
4. ports  
5. webapp  
6. cookies  
7. cors  
8. api (Pro+)  
9. email  
10. auth  
11. content  
12. performance  
13. compliance  

**Orchestrator behavior:**
- Params: `{ scanId, url, plan, emit }` — `emit` for SSE-style progress
- Plan gating: FREE (3) → STARTER (7) → PRO (11) → AGENCY+ (all 13)
- `Promise.allSettled` parallel modules; 45s total timeout; errors isolated
- Dedupe + severity sort; category + compliance scores; `calculateScore` in `scoring.ts`

---

## Product surface — routes & pages

### Marketing & public
| Route | Purpose |
|-------|---------|
| `/` | Landing: hero, terminal demo, features, how it works, sample report, pricing toggle, testimonials, stats, FAQ, footer + newsletter |
| `/pricing` | Full pricing + comparison + FAQ + enterprise CTA |
| `/about` | Mission, team bios, hiring CTA |
| `/docs` | MDX docs (getting started, scanning, API, integrations) |
| `/changelog` | ~5 realistic entries |
| `/security` | Policy, disclosure, bounty, encryption |
| `/status` | Operational status + uptime |
| `/contact` | Form → Resend |
| `/privacy` | GDPR-aligned policy (2000+ words target) |
| `/terms` | ToS (2000+ words) + scan disclaimer |
| `/blog` | 3 sample posts (titles in spec) |
| `/r/[shareToken]` | Public report (watermark, CTA, expiry handling) |

### Auth
| Route | Purpose |
|-------|---------|
| `/auth/login` | Email/password + OAuth + magic link + forgot link |
| `/auth/register` | Registration + strength + terms + OAuth |
| `/auth/forgot-password` | Request reset |
| `/auth/reset-password/[token]` | Set new password |
| `/auth/verify-email/[token]` | Verify on load |
| `/auth/magic-link` | “Check your email” |

### App (dashboard layout)
| Route | Purpose |
|-------|---------|
| `/dashboard` | Stats, recent scans table, quick scan, trends chart, alerts widget |
| `/scan/new` | URL, profiles, advanced options, disclaimer |
| `/scan/[id]/running` | SSE progress, radar, modules, terminal, cancel |
| `/scan/[id]` | Results: gauge, categories, compliance tabs, findings, tech stack, domain info |
| `/reports` | PDF archive, share links, bulk actions |
| `/scheduled` | CRUD schedules, charts, notifications |
| `/api-access` | API key, usage, in-app API docs, webhooks, SDK tabs |
| `/team` | Agency+: members, invites, roles, usage chart |
| `/clients` | Agency+: list, detail, white-label, portal link |
| `/billing` | Plan, Stripe checkout/portal, invoices, cancel modal, referral |
| `/settings` | Tabs: Profile, Security (2FA, sessions), Notifications, Integrations, Data & Privacy |

### Admin (`/admin/*`, middleware-protected)
- `/admin/dashboard` — MRR/ARR, users, scans, system health charts  
- `/admin/users` — search, plan filter, actions  
- `/admin/scans` — global scans, failures  
- `/admin/system` — BullMQ, Redis, cron trigger, feature flags  

---

## API routes (inventory)

**Public:**  
`POST /api/demo/scan` · `GET /api/r/[shareToken]` · `POST /api/auth/[...nextauth]`

**Authenticated (session or Bearer):**  
`POST/GET/DELETE` patterns under `/api/v1/scan`, `/api/v1/scans`, `/api/v1/user/me`, schedules, alerts, reports, webhooks, share, pdf, rescan, mark-fixed, stream variant as specified

**Stripe:**  
`POST /api/stripe/webhook` · `POST /api/stripe/checkout` · `GET /api/stripe/portal`

**Admin:**  
stats, users, PATCH user, impersonate, trigger-cron

**Internal:**  
`POST /api/cron/scheduled-scans` (Vercel Cron)

**SSE:**  
`/api/scan/[id]/stream` — Redis channel `scan:{scanId}`, keep-alive ~15s

Response shape: `{ success: boolean, data?: unknown, error?: string }`

---

## Background workers

| Worker | Responsibility |
|--------|------------------|
| `workers/scanWorker.ts` | BullMQ `scan-queue`, concurrency 3; RUNNING → orchestrator → DB → optional PDF → email → alerts → webhooks → SSE complete/failed |
| `workers/scheduledWorker.ts` | Cron: due `ScheduledScan` rows → enqueue; update `nextRunAt`; score-drop / CRITICAL alerts |

---

## Email templates (React Email)

1. welcome  
2. verify-email  
3. magic-link  
4. reset-password  
5. scan-complete  
6. critical-alert  
7. score-dropped  
8. weekly-digest  
9. plan-upgraded  
10. invoice-paid  
11. trial-ending  
12. invite-member  
13. share-report  

Branding: dark header, consistent footer, VAULTRIX identity.

---

## Stripe

**Lookup keys (conceptual):** starter/pro/agency × monthly/annual; annual = ~20% savings vs monthly in UI.

**Webhook events:** subscription created/updated/deleted, invoice paid/failed, trial ending → sync `User` plan fields, emails.

---

## Security, rate limits, compliance copy

- Middleware: Upstash limits (demo 3/day/IP, v1 quota + 100/min, auth 10/15min), bot UA checks, CORS for production origin, admin JWT gate  
- URL validation: Zod; block localhost/private IPs  
- Security headers on responses (CSP for API context, nosniff, frame deny, HSTS)  
- **Disclaimer (required surfaces):** landing footer, new scan, terms, PDF — *Only scan sites you own or have explicit permission to test.*

---

## PDF report (Puppeteer)

Pages: cover → executive summary → risk matrix → findings by severity → compliance table → tech inventory → top 10 fixes → methodology → disclaimer → back branding. Dark professional styling; page numbers; header: domain | date | VAULTRIX.

---

## Custom UI components

- `SecurityGauge`, `SeverityBadge`, `FindingCard`, `ScanProgress` (SSE), `TechStackBadge`, `ComplianceBadge`, `ScoreTrendChart`, `TerminalOutput`, `PlanBadge`, `DomainScore`

---

## Deployment artifacts

- `vercel.json`: cron hourly for scheduled scans; `maxDuration` on stream + scan routes  
- `Dockerfile`: Node 20 Alpine, build, port 3000  
- `README.md`: setup, env, Vercel + Docker, API/methodology links, license/disclaimer  

---

## Build order (reference)

1. Next init + deps  
2. globals + Tailwind tokens + fonts  
3. Prisma migrate  
4. Scanner modules + scoring + orchestrator  
5. BullMQ worker  
6. API routes  
7. SSE emitter + stream  
8. NextAuth  
9. Stripe  
10. Emails  
11. Shared components  
12. Landing → auth → dashboard shell → dashboard home → scan flow → results → reports/scheduled/API → team/clients → billing/settings → admin → public report → marketing → PDF → env/vercel/Docker/README  

---

## Success criteria (definition of done)

- [ ] No placeholder/TODO in shipped paths; strict TS  
- [ ] All listed pages and APIs exist and validate inputs  
- [ ] Scanner plan gating + timeout + graceful module failures  
- [ ] SSE + worker + DB stay consistent on complete/fail  
- [ ] Stripe + webhooks + portal flows wired  
- [ ] Emails + PDF + disclaimer coverage  
- [ ] Mobile-responsive dashboard; a11y basics  
- [ ] SEO metadata on public pages  

---

## How to use this file in Notion

1. **Import:** In Notion, `⋯` on sidebar → **Import** → **Markdown** → select this file.  
2. **Split:** Turn each `##` section into a sub-page using “Turn into page” if you want a wiki.  
3. **Database:** Optional — create a Notion database for “Features” or “API endpoints” and paste rows from the tables above.

---

*Document generated to mirror the VAULTRIX product specification. Update this file when scope changes; treat the repository (`prisma/schema.prisma`, `src/`) as the implementation source of truth.*
