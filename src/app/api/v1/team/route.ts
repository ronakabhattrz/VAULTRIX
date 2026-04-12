import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  if (!['AGENCY', 'ENTERPRISE'].includes(session.plan)) {
    return err('Agency plan required', 403)
  }

  // Find org where user is admin/owner
  const membership = await db.orgMember.findFirst({
    where: { userId: session.userId, role: { in: ['OWNER', 'ADMIN'] } },
    include: {
      org: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          },
        },
      },
    },
  })

  if (!membership) return ok({ members: [] })

  return ok({ members: membership.org.members, orgId: membership.org.id })
}
