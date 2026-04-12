import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api'
import { db } from '@/lib/db'
import { generateScanPdf } from '@/lib/pdf/generate'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth(req)
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const scan = await db.scan.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { categoryScores: true },
  })

  if (!scan) return new NextResponse('Not found', { status: 404 })
  if (scan.status !== 'COMPLETED') return new NextResponse('Scan not complete', { status: 400 })

  try {
    const findings = (scan.findings as { severity: string; title: string; category: string; description?: string; remediation?: string }[] | null) ?? []

    const pdf = await generateScanPdf({
      id: scan.id,
      url: scan.url,
      score: scan.score ?? 0,
      grade: scan.grade ?? '?',
      findings,
      categoryScores: scan.categoryScores,
      completedAt: scan.completedAt ?? scan.createdAt,
    })

    const domain = scan.domain.replace(/[^a-zA-Z0-9-]/g, '-')
    const filename = `vaultrix-report-${domain}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    })
  } catch (error) {
    console.error('[pdf] Generation failed:', error)
    return new NextResponse('PDF generation failed', { status: 500 })
  }
}
