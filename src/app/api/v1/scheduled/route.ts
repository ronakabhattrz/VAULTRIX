import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth, urlSchema } from '@/lib/api'
import { db } from '@/lib/db'
import { addWeeks } from 'date-fns'

const createSchema = z.object({
  url: urlSchema,
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
  notifyEmail: z.string().email().optional(),
  alertThreshold: z.number().int().min(0).max(100).default(70),
})

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const schedules = await db.scheduledScan.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
  return ok(schedules)
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const domain = new URL(parsed.data.url).hostname

  const schedule = await db.scheduledScan.create({
    data: {
      userId: session.userId,
      url: parsed.data.url,
      domain,
      frequency: parsed.data.frequency,
      notifyEmail: parsed.data.notifyEmail,
      alertThreshold: parsed.data.alertThreshold,
      nextRunAt: addWeeks(new Date(), 1),
    },
  })

  return ok(schedule, 201)
}
