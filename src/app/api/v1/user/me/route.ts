import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth, PLAN_SCAN_LIMITS } from '@/lib/api'
import { db } from '@/lib/db'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      plan: true,
      scanCountThisMonth: true,
      totalScans: true,
      apiCallsThisMonth: true,
      twoFactorEnabled: true,
      onboardingCompleted: true,
      currentPeriodEnd: true,
      subscriptionStatus: true,
      createdAt: true,
    },
  })

  if (!user) return err('User not found', 404)

  const scanLimit = PLAN_SCAN_LIMITS[user.plan] ?? 3

  return ok({ ...user, scanLimit })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const user = await db.user.update({
    where: { id: session.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true },
  })

  return ok(user)
}
