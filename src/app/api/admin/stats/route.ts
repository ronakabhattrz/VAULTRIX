import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session?.isAdmin) return err('Forbidden', 403)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [totalUsers, newUsersThisWeek, usersByPlan, totalScans, scansToday, scansThisWeek, successRate, avgDuration] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: weekStart } } }),
    db.user.groupBy({ by: ['plan'], _count: true }),
    db.scan.count(),
    db.scan.count({ where: { createdAt: { gte: new Date(now.toDateString()) } } }),
    db.scan.count({ where: { createdAt: { gte: weekStart } } }),
    db.scan.count({ where: { status: 'COMPLETED' } }).then((c: number) => db.scan.count().then((t: number) => t > 0 ? Math.round((c / t) * 100) : 0)),
    db.scan.aggregate({ _avg: { scanDuration: true }, where: { status: 'COMPLETED' } }),
  ])

  return ok({
    users: { total: totalUsers, newThisWeek: newUsersThisWeek, byPlan: usersByPlan },
    scans: {
      total: totalScans,
      today: scansToday,
      thisWeek: scansThisWeek,
      successRate,
      avgDurationMs: Math.round(avgDuration._avg.scanDuration ?? 0),
    },
  })
}
