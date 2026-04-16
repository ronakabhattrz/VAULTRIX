import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { processScan } from '@/lib/processScan'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const scanId = body?.scanId as string | undefined
  if (!scanId) return new Response('Missing scanId', { status: 400 })

  // Atomic claim — only process if still QUEUED (BullMQ worker may have claimed it first)
  const claimed = await db.scan.updateMany({
    where: { id: scanId, status: 'QUEUED' },
    data: { status: 'RUNNING' },
  })

  if (claimed.count === 0) {
    // Already claimed by the BullMQ worker (Docker) or another invocation
    return new Response('Already processing', { status: 200 })
  }

  const scan = await db.scan.findUnique({
    where: { id: scanId },
    select: { url: true, userId: true, user: { select: { plan: true } } },
  })

  if (!scan) {
    return new Response('Scan not found', { status: 404 })
  }

  // Run synchronously — this Lambda stays alive until the scan completes (up to maxDuration)
  await processScan({
    scanId,
    url: scan.url,
    userId: scan.userId,
    plan: scan.user.plan,
  })

  return new Response('OK', { status: 200 })
}
