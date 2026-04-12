import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth, urlSchema, checkScanQuota } from '@/lib/api'
import { db } from '@/lib/db'
import { enqueueScan } from '@/lib/queue'

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

  // Enqueue
  await enqueueScan({
    scanId: scan.id,
    url,
    userId: session.userId,
    plan: session.plan,
  })

  // Track API usage
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
