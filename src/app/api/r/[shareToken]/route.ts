import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { shareToken: string } }) {
  const scan = await db.scan.findFirst({
    where: { shareToken: params.shareToken, isPublic: true },
    include: { categoryScores: true, complianceResults: true },
  })

  if (!scan) return err('Report not found or link has expired', 404)

  if (scan.shareExpiresAt && scan.shareExpiresAt < new Date()) {
    return err('This share link has expired', 410)
  }

  return ok({
    id: scan.id,
    url: scan.url,
    domain: scan.domain,
    score: scan.score,
    grade: scan.grade,
    findings: scan.findings,
    techStack: scan.techStack,
    categoryScores: scan.categoryScores,
    complianceResults: scan.complianceResults,
    completedAt: scan.completedAt,
    ipAddress: scan.ipAddress,
    serverSoftware: scan.serverSoftware,
  })
}
