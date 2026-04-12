import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).default('ANALYST'),
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

  // Need an org to attach invitation to
  const membership = await db.orgMember.findFirst({
    where: { userId: session.userId },
    select: { orgId: true },
  })
  if (!membership) return err('No organization found', 400)

  // Check if user exists
  const invitee = await db.user.findUnique({ where: { email } })

  await db.invitation.create({
    data: {
      email,
      role: role as 'ADMIN' | 'ANALYST' | 'VIEWER',
      orgId: membership.orgId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return ok({ invited: true, userExists: !!invitee })
}
