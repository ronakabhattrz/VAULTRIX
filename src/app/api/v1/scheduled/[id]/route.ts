import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const item = await db.scheduledScan.findFirst({
    where: { id: params.id, userId: session.userId },
  })
  if (!item) return err('Not found', 404)

  await db.scheduledScan.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const item = await db.scheduledScan.findFirst({
    where: { id: params.id, userId: session.userId },
  })
  if (!item) return err('Not found', 404)

  const body = await req.json().catch(() => ({}))
  const updated = await db.scheduledScan.update({
    where: { id: params.id },
    data: {
      isActive: body.isActive ?? item.isActive,
    },
  })
  return ok(updated)
}
