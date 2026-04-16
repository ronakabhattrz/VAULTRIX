import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth, urlSchema, checkScanQuota } from '@/lib/api'
import { db } from '@/lib/db'

const startScanSchema = z.object({
  url: urlSchema,
  clientId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = startScanSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { url, clientId } = parsed.data

  // Check quota
  const quota = await checkScanQuota(session.userId, session.plan)
  if (!quota.allowed) {
    return err(
      `Scan quota exceeded (${quota.current}/${quota.limit} this month). Upgrade your plan at /billing`,
      429
    )
  }

  // Parse domain
  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    return err('Invalid URL')
  }

  // Create scan record
  const scan = await db.scan.create({
    data: {
      userId: session.userId,
      url,
      domain,
      status: 'QUEUED',
      clientId: clientId ?? null,
    },
  })

  // Only enqueue to BullMQ when Redis is explicitly configured (Docker/self-hosted).
  // On Vercel, REDIS_URL is not set — without this guard IORedis retries forever
  // with maxRetriesPerRequest:null and hangs the request → 504.
  if (process.env.REDIS_URL) {
    try {
      const { enqueueScan } = await import('@/lib/queue')
      await enqueueScan({ scanId: scan.id, url, userId: session.userId, plan: session.plan })
    } catch { /* non-fatal */ }
  }

  // Fire-and-forget to the internal process endpoint (handles Vercel where no worker runs).
  // Atomic DB claim inside ensures only one path (worker vs this) processes the scan.
  triggerProcessEndpoint(scan.id, req)

  await db.apiUsage.create({
    data: {
      userId: session.userId,
      endpoint: '/api/v1/scan',
      method: 'POST',
      statusCode: 200,
      responseTime: 0,
    },
  }).catch(() => null)

  return ok({ scanId: scan.id, status: 'QUEUED', url })
}

function triggerProcessEndpoint(scanId: string, req: NextRequest): void {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`

  fetch(`${appUrl}/api/internal/scan/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.CRON_SECRET ?? '',
    },
    body: JSON.stringify({ scanId }),
  }).catch(() => null)
}
