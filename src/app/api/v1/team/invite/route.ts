import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'ADMIN', 'VIEWER']).default('MEMBER'),
})

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  if (!['AGENCY', 'ENTERPRISE'].includes(session.plan)) {
    return err('Agency plan required', 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { email, role } = parsed.data

  // Check if user exists
  const invitee = await db.user.findUnique({ where: { email } })

  // Create invitation record
  await db.invitation.create({
    data: {
      email,
      role: role as 'MEMBER',
      inviterId: session.userId,
      token: Math.random().toString(36).slice(2) + Date.now().toString(36),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return ok({ invited: true, userExists: !!invitee })
}
