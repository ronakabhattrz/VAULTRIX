import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getScanHistory } from '@/lib/scanEmitter'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, status: true, score: true, grade: true },
  })

  if (!scan) return new Response('Not found', { status: 404 })

  const history = await getScanHistory(params.id)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Tell EventSource to reconnect every 3 seconds if the stream closes
      controller.enqueue(encoder.encode('retry: 3000\n\n'))

      // Send all buffered events from Upstash history
      for (const event of history) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // If scan is already finished, send the final event and close
      if (scan.status === 'COMPLETED') {
        const alreadyHasComplete = history.some(e => e.event === 'complete')
        if (!alreadyHasComplete) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ event: 'complete', score: scan.score, grade: scan.grade })}\n\n`
            )
          )
        }
        controller.close()
        return
      }

      if (scan.status === 'FAILED') {
        const alreadyHasFailed = history.some(e => e.event === 'failed')
        if (!alreadyHasFailed) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event: 'failed', error: 'Scan failed' })}\n\n`)
          )
        }
        controller.close()
        return
      }

      // Scan still in progress — close now and let EventSource reconnect in 3s
      // (each reconnect picks up new history events as they are published)
      controller.close()
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
