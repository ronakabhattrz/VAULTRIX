import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { categoryScores: true, complianceResults: true },
  })

  if (!scan) return err('Scan not found', 404)

  return ok(scan)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.userId },
  })
  if (!scan) return err('Scan not found', 404)

  await db.scan.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}
