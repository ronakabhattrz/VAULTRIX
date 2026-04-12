import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

const shareSchema = z.object({
  days: z.number().int().min(1).max(90).default(30),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.userId },
  })
  if (!scan) return err('Scan not found', 404)
  if (scan.status !== 'COMPLETED') return err('Scan is not complete')

  const body = await req.json().catch(() => ({}))
  const parsed = shareSchema.safeParse(body)
  const days = parsed.success ? parsed.data.days : 30

  const shareToken = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const shareExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await db.scan.update({
    where: { id: params.id },
    data: { shareToken, shareExpiresAt, isPublic: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'
  return ok({
    shareUrl: `${appUrl}/r/${shareToken}`,
    expiresAt: shareExpiresAt,
  })
}
