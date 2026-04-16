import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth, urlSchema, checkScanQuota } from '@/lib/api'
import { db } from '@/lib/db'
import { waitUntil } from '@vercel/functions'

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

  let enqueued = false

  if (process.env.REDIS_URL) {
    // Docker / self-hosted: try BullMQ worker
    try {
      const { enqueueScan } = await import('@/lib/queue')
      await enqueueScan({ scanId: scan.id, url, userId: session.userId, plan: session.plan })
      enqueued = true
      console.log(`[scan/route] Scan ${scan.id} enqueued via BullMQ`)
    } catch (queueErr) {
      console.error('[scan/route] BullMQ enqueue failed, falling back to waitUntil:', queueErr)
    }
  }

  if (!enqueued) {
    // Vercel / fallback: run scanner directly in this Lambda via waitUntil.
    // waitUntil keeps the function alive after the response is sent (up to maxDuration).
    console.log(`[scan/route] Scan ${scan.id} using waitUntil path`)
    await db.scan.update({ where: { id: scan.id }, data: { status: 'RUNNING' } })

    waitUntil(
      (async () => {
        console.log(`[scan/route] waitUntil: starting processScan for ${scan.id}`)
        const { processScan } = await import('@/lib/processScan')
        await processScan({
          scanId: scan.id,
          url,
          userId: session.userId,
          plan: session.plan,
        })
      })().catch(async (processErr) => {
        console.error('[scan/route] processScan failed:', String(processErr))
        await db.scan.update({
          where: { id: scan.id, status: { in: ['QUEUED', 'RUNNING'] } },
          data: { status: 'FAILED', errorMessage: String(processErr), completedAt: new Date() },
        }).catch(() => null)
      })
    )
  }

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
