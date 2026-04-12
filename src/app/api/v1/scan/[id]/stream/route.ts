import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { getScanHistory } from '@/lib/scanEmitter'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, status: true },
  })

  if (!scan) return new Response('Not found', { status: 404 })

  // If already complete/failed, return existing history
  if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
    const history = await getScanHistory(params.id)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const event of history) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const encoder = new TextEncoder()
  let interval: NodeJS.Timeout
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Send historical events first
      const history = await getScanHistory(params.id)
      for (const event of history) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Subscribe to new events
      const channel = `scan:${params.id}`

      // Keep-alive ping every 15s
      interval = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'))
          } catch {
            clearInterval(interval)
          }
        }
      }, 15000)

      // Poll for completion using Redis list
      const poll = setInterval(async () => {
        if (closed) { clearInterval(poll); return }
        try {
          const currentScan = await db.scan.findUnique({
            where: { id: params.id },
            select: { status: true, score: true, grade: true },
          })
          if (currentScan?.status === 'COMPLETED' || currentScan?.status === 'FAILED') {
            clearInterval(poll)
            clearInterval(interval)
            if (!closed) {
              const finalEvent = currentScan.status === 'COMPLETED'
                ? { event: 'complete', score: currentScan.score, grade: currentScan.grade }
                : { event: 'failed', error: 'Scan failed' }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`))
              controller.close()
              closed = true
            }
          }
        } catch { clearInterval(poll) }
      }, 2000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        clearInterval(poll)
        try { controller.close() } catch {}
      })
    },
    cancel() {
      closed = true
      clearInterval(interval)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
