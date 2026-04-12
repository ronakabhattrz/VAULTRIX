import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) return null
  return session
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return err('Forbidden', 403)
  await db.scan.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}
