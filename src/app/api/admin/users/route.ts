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
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isAdmin: true,
        isSuspended: true,
        totalScans: true,
        scanCountThisMonth: true,
        createdAt: true,
        subscriptionStatus: true,
      },
    }),
    db.user.count({ where }),
  ])

  const usersWithCount = users.map((u: Record<string, unknown>) => ({
    ...u,
    scanCount: u.totalScans,
  }))

  return ok({ users: usersWithCount, total, page })
}
