import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10'))
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const domain = searchParams.get('domain')

  const where: Record<string, unknown> = { userId: session.userId }
  if (status) where.status = status
  if (domain) where.domain = { contains: domain, mode: 'insensitive' }
  if (search) where.url = { contains: search, mode: 'insensitive' }

  const [rawScans, total] = await Promise.all([
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
        findings: true,
        createdAt: true,
        completedAt: true,
        scanDuration: true,
        pdfUrl: true,
        shareToken: true,
      },
    }),
    db.scan.count({ where }),
  ])

  // Compute severity counts from findings JSON
  const scans = rawScans.map((scan: { id: string; url: string; domain: string; status: string; score?: number | null; grade?: string | null; findings: unknown; createdAt: Date; completedAt?: Date | null; scanDuration?: number | null; pdfUrl?: string | null; shareToken?: string | null }) => {
    const findings = (scan.findings as { severity: string }[] | null) ?? []
    const counts = findings.reduce((acc, f) => {
      const key = `${f.severity.toLowerCase()}Count` as keyof typeof acc
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    return { ...scan, findings: undefined, ...counts }
  })

  return ok({ scans, total, page, limit, pages: Math.ceil(total / limit) })
}
