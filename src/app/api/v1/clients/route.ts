import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const clients = await db.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { scans: true } } },
  })

  return ok({
    clients: clients.map((c: { id: string; name: string; domain?: string; contactEmail?: string; notes?: string; _count: { scans: number } }) => ({
      ...c,
      scanCount: c._count.scans,
      _count: undefined,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  if (!['AGENCY', 'ENTERPRISE'].includes(session.plan)) {
    return err('Agency plan required', 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const client = await db.client.create({
    data: {
      userId: session.userId,
      name: parsed.data.name,
      domain: parsed.data.domain || null,
      contactEmail: parsed.data.contactEmail || null,
      notes: parsed.data.notes || null,
    },
  })

  return ok(client, 201)
}
