import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) return null
  return session
}

const patchSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE']).optional(),
  isSuspended: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return err('Forbidden', 403)

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, plan: true, isAdmin: true,
      isSuspended: true, totalScans: true, scanCountThisMonth: true,
      createdAt: true, subscriptionStatus: true, avatar: true,
      _count: { select: { scans: true } },
    },
  })
  if (!user) return err('User not found', 404)
  return ok(user)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return err('Forbidden', 403)

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err('Invalid payload', 400)

  const updated = await db.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true, name: true, email: true, plan: true,
      isAdmin: true, isSuspended: true,
    },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return err('Forbidden', 403)

  // Prevent self-deletion
  if (session.user.id === params.id) return err('Cannot delete your own account', 400)

  await db.user.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}
