# VAULTRIX — How to Get Every API Key

Quick links and exact steps for every service in `.env.local`.

---

## 1. NEXTAUTH_SECRET
**What:** Random secret for encrypting sessions. No account needed.

```bash
# Run this in your terminal and paste the output
openssl rand -base64 32
```
```env
NEXTAUTH_SECRET=<paste output here>
```

---

## 2. DATABASE_URL — Neon (Free PostgreSQL)
**URL:** https://neon.tech

1. Click **Sign Up** → use GitHub or Google
2. Click **New Project** → name it `vaultrix` → choose closest region → **Create Project**
3. On the dashboard, click **Connect** → copy the **Connection string**
4. It looks like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

After setting this, run:
```bash
npx prisma db push
```

---

## 3. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN + REDIS_URL
**URL:** https://upstash.com

1. Click **Sign Up** → use GitHub or Google
2. Go to **Redis** → **Create Database**
3. Name: `vaultrix`, Type: **Regional**, Region: closest to you → **Create**
4. On the database page, scroll to **REST API** section:
   - Copy **UPSTASH_REDIS_REST_URL** (starts with `https://`)
   - Copy **UPSTASH_REDIS_REST_TOKEN** (long string)
5. Scroll to **Connect** section → copy **Redis URL** (starts with `rediss://`)

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxx
REDIS_URL=rediss://:AXxxxxxxxx@xxx.upstash.io:6380
```

---

## 4. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
**URL:** https://console.cloud.google.com

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure **OAuth consent screen** first:
   - User Type: **External** → Fill in App name (`VAULTRIX`), support email → Save
4. Back in Credentials → **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `VAULTRIX`
7. Under **Authorized redirect URIs** add:
   - `http://localhost:3000/api/auth/callback/google` (for dev)
   - `https://yourdomain.com/api/auth/callback/google` (for prod)
8. Click **Create** → copy **Client ID** and **Client Secret**

```env
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

---

## 5. GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
**URL:** https://github.com/settings/developers

1. Click **OAuth Apps** → **New OAuth App**
2. Fill in:
   - Application name: `VAULTRIX`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**
4. Copy **Client ID**
5. Click **Generate a new client secret** → copy it immediately (shown once)

```env
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

> For production, create a separate OAuth App with your production domain.

---

## 6. RESEND_API_KEY + EMAIL_FROM
**URL:** https://resend.com

1. Click **Sign Up** → verify your email
2. Go to **API Keys** → **Create API Key**
   - Name: `vaultrix-prod`, Permission: **Full access** → **Add**
3. Copy the key (shown once — starts with `re_`)

**For EMAIL_FROM — add your domain:**
1. Go to **Domains** → **Add Domain** → enter your domain (e.g. `vaultrix.io`)
2. Add the DNS records shown (TXT + MX records) to your domain registrar
3. Click **Verify** — takes 1–5 min
4. Once verified, use `noreply@yourdomain.com` as the from address

> **For local dev only** (no domain needed): use `onboarding@resend.dev` as EMAIL_FROM. It only sends to your Resend account email.

```env
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=VAULTRIX <noreply@yourdomain.com>
```

---

## 7. STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY + STRIPE_WEBHOOK_SECRET
**URL:** https://dashboard.stripe.com

### API Keys:
1. Go to **Developers** → **API Keys**
2. Copy **Publishable key** (`pk_test_xxx` for test, `pk_live_xxx` for prod)
3. Click **Reveal test key** → copy **Secret key** (`sk_test_xxx`)

```env
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Webhook Secret (local dev):
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. In a new terminal tab, run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret shown (`whsec_xxx`)

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Create Products + Price IDs:
1. Go to **Product catalog** → **Add product**
2. Create 4 products: **Starter**, **Pro**, **Agency**, **Enterprise**
3. For each product, add 2 prices: Monthly (recurring) + Annual (recurring)
4. Copy each **Price ID** (`price_xxx`)

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

---

## 8. BLOB_READ_WRITE_TOKEN — Vercel Blob (PDF storage)
**URL:** https://vercel.com (requires project deployed to Vercel)

1. Go to your Vercel project dashboard
2. Click **Storage** tab → **Connect Store** → **Blob** → **Create New**
3. Name: `vaultrix-blob` → **Create**
4. Go to the store → **Settings** → copy **Read/Write Token**

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

> For local dev, PDF uploads will fail gracefully — scans still work without this.

---

## 9. NEXT_PUBLIC_POSTHOG_KEY — Analytics (Optional)
**URL:** https://posthog.com

1. Sign up → **New Project** → name it `VAULTRIX`
2. Go to **Project Settings** → copy **Project API Key** (`phc_xxx`)

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 10. SENTRY_DSN — Error Tracking (Optional)
**URL:** https://sentry.io

1. Sign up → **Create Project** → Platform: **Next.js** → name: `vaultrix`
2. Copy the **DSN** from the setup page (`https://xxx@xxx.sentry.io/xxx`)

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.sentry.io/xxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=vaultrix
```

---

## 11. CRON_SECRET
**What:** A random secret to protect `/api/cron/*` routes. No account needed.

```bash
openssl rand -hex 32
```
```env
CRON_SECRET=<paste output here>
```

---

## Minimum Keys to Get Running Locally

| Key | Required | Free Tier |
|-----|----------|-----------|
| `NEXTAUTH_SECRET` | ✅ Yes | No account needed |
| `DATABASE_URL` | ✅ Yes | Neon — 512MB free |
| `UPSTASH_REDIS_REST_*` | ✅ Yes (for scan queue) | Upstash — 10K req/day free |
| `RESEND_API_KEY` | For email features | 3,000 emails/mo free |
| `GOOGLE_CLIENT_ID` | For Google login | Free |
| `GITHUB_CLIENT_ID` | For GitHub login | Free |
| `STRIPE_*` | For billing | Test mode is free |
| `BLOB_READ_WRITE_TOKEN` | For PDF storage | Vercel — 500MB free |
| `POSTHOG_KEY` | Optional analytics | 1M events/mo free |
| `SENTRY_DSN` | Optional errors | 5K errors/mo free |

---

## Auth.ts — Enable Google + GitHub OAuth

Once you have the OAuth keys, update `src/lib/auth.ts` to add the providers. Look for the `providers` array and add:

```ts
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'

providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
  // ... existing Credentials provider
]
```
