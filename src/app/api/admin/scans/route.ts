import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return err('Forbidden', 403)
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '25'))
  const search = searchParams.get('search')

  const where = search
    ? { url: { contains: search, mode: 'insensitive' as const } }
    : {}

  const [scans, total] = await Promise.all([
    db.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        url: true,
        domain: true,
        status: true,
        score: true,
        grade: true,
        scanDuration: true,
        createdAt: true,
        completedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.scan.count({ where }),
  ])

  return ok({ scans, total, page })
}
