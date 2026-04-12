# VAULTRIX — Admin Guide

Everything you need to know about using VAULTRIX as an admin.

---

## How to Become an Admin

Admin access is controlled by the `isAdmin` flag on the User record in the database.

### Step 1 — Register a normal account first
Go to http://localhost:3000/auth/register and create your account.

### Step 2 — Grant yourself admin via database

**Option A — Using psql (local):**
```bash
psql vaultrix
```
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';
\q
```

**Option B — Using Prisma Studio (visual UI):**
```bash
cd /path/to/scan_site
DATABASE_URL="postgresql://ronakbhatt@localhost:5432/vaultrix" npx prisma studio
```
1. Open http://localhost:5555 in your browser
2. Click **User** table → find your record → click it
3. Set `isAdmin` to `true` → click **Save 1 change**

**Option C — Using Neon dashboard (if using Neon):**
1. Go to neon.tech → your project → **SQL Editor**
2. Run:
```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';
```

### Step 3 — Log in
Go to http://localhost:3000/auth/login → log in with your account.
You'll now have access to the admin panel.

---

## Admin Panel

**URL:** http://localhost:3000/admin

The admin panel has 4 sections:

### /admin/dashboard
Platform-wide statistics:
- Total users, total scans, scans today, success rate
- Users broken down by plan (FREE / STARTER / PRO / AGENCY / ENTERPRISE)
- Scans this week, new users this week, avg scan duration

### /admin/users
Full user management:
- Search by name or email
- See each user's plan, scan count, subscription status
- Suspended users are marked
- Paginated (25 per page)

### /admin/scans
All scans across all users:
- Filter by status (QUEUED / RUNNING / COMPLETED / FAILED)
- Search by URL
- See which user ran each scan, score, grade, duration
- Paginated

### /admin/system
System controls:
- Manually trigger scheduled scan cron job
- View environment variable status (which keys are set vs missing)
- Shows worker status

---

## User Roles & Plans

| Field | Values | Description |
|-------|--------|-------------|
| `plan` | FREE, STARTER, PRO, AGENCY, ENTERPRISE | Billing plan |
| `isAdmin` | true / false | Admin panel access |
| `isSuspended` | true / false | Blocks login |
| `subscriptionStatus` | active, canceled, past_due, trialing | Stripe subscription state |

### Scan Quotas by Plan

| Plan | Scans/month | Modules |
|------|-------------|---------|
| FREE | 5 | Quick only (headers, SSL, cookies) |
| STARTER | 50 | + DNS, ports, content, performance |
| PRO | 200 | + All modules (full OWASP scan) |
| AGENCY | Unlimited | All modules + team + clients |
| ENTERPRISE | Unlimited | Everything |

---

## Suspend / Unsuspend a User

```sql
-- Suspend
UPDATE "User" SET "isSuspended" = true WHERE email = 'user@example.com';

-- Unsuspend
UPDATE "User" SET "isSuspended" = false WHERE email = 'user@example.com';
```

---

## Reset a User's Scan Count

```sql
UPDATE "User" SET "scanCountThisMonth" = 0 WHERE email = 'user@example.com';
```

---

## Change a User's Plan Manually

```sql
UPDATE "User" SET plan = 'PRO' WHERE email = 'user@example.com';
```

---

## Login Flow

### Email + Password
1. Go to `/auth/login`
2. Enter email and password registered at `/auth/register`
3. Password must be 8+ chars, 1 uppercase, 1 number

### Google OAuth
1. Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env.local`
2. Click **Continue with Google** on login page
3. First login auto-creates account with FREE plan

### GitHub OAuth
1. Requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` in `.env.local`
2. Click **Continue with GitHub** on login page
3. First login auto-creates account with FREE plan

### Magic Link (Email)
1. Requires `RESEND_API_KEY` in `.env.local`
2. Go to `/auth/login` → click **Send magic link**
3. Enter your email → click the link in the email
4. Valid for 10 minutes

### Forgot Password
1. Go to `/auth/forgot-password`
2. Enter email → receive reset link
3. Link valid for 1 hour
4. Requires `RESEND_API_KEY`

---

## Auth Session Details

Sessions use **JWT strategy** (stored in a cookie, not the database).

Token contains:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "plan": "FREE",
  "isAdmin": false
}
```

Session expires: **30 days** (configurable in `src/lib/auth.ts`)

---

## API Authentication

All `/api/v1/*` endpoints accept either:

1. **Session cookie** (browser) — set automatically on login
2. **Bearer token** — for programmatic access:
   ```
   Authorization: Bearer <api-key>
   ```
   API keys are managed at `/api-access` in the dashboard.

---

## Common Admin Tasks

### View all users in database
```bash
DATABASE_URL="postgresql://ronakbhatt@localhost:5432/vaultrix" npx prisma studio
```

### Delete a scan
```sql
DELETE FROM "Scan" WHERE id = 'scan-id-here';
```

### See recent scans
```sql
SELECT id, url, status, score, grade, "createdAt"
FROM "Scan"
ORDER BY "createdAt" DESC
LIMIT 20;
```

### See all users
```sql
SELECT id, email, name, plan, "isAdmin", "isSuspended", "totalScans", "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;
```

### Check failed scans
```sql
SELECT id, url, "errorMessage", "createdAt"
FROM "Scan"
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC;
```

---

## Running the Scan Worker

Scans are processed by a background worker. Without it, scans will stay in **QUEUED** status forever.

```bash
# In a separate terminal tab
cd /path/to/scan_site
npx tsx src/workers/scanWorker.ts
```

Keep this running while testing scans locally.

---

## Environment Check

Visit `/admin/system` to see which environment variables are configured.
Or check manually:

```bash
# Check what's set in .env.local
grep -v '^#' .env.local | grep -v '^$'
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project at vercel.com
3. Add all env vars in **Project Settings → Environment Variables**
4. Deploy

For the scan worker on Vercel, use the cron job at `/api/cron/scheduled-scans` (already configured in `vercel.json`). For real-time scanning, you'll need a separate worker process (Railway, Render, or a VPS).
