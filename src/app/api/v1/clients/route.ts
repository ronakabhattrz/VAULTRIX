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

async function getUserOrg(userId: string) {
  const membership = await db.orgMember.findFirst({
    where: { userId },
    select: { orgId: true },
  })
  return membership?.orgId ?? null
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const orgId = await getUserOrg(session.userId)
  if (!orgId) return ok({ clients: [] })

  const clients = await db.client.findMany({
    where: { orgId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { scans: true } } },
  })

  return ok({
    clients: clients.map(c => ({
      id: c.id,
      name: c.name,
      website: c.website,
      contactEmail: c.contactEmail,
      notes: c.notes,
      scanCount: c._count.scans,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  if (!['AGENCY', 'ENTERPRISE'].includes(session.plan)) {
    return err('Agency plan required', 403)
  }

  const orgId = await getUserOrg(session.userId)
  if (!orgId) return err('No organization found — create one first', 400)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const client = await db.client.create({
    data: {
      orgId,
      name: parsed.data.name,
      website: parsed.data.domain || null,
      contactEmail: parsed.data.contactEmail || null,
      notes: parsed.data.notes || null,
    },
  })

  return ok(client, 201)
}
