import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SecurityGauge } from '@/components/security/SecurityGauge'
import { SeverityBadge } from '@/components/security/SeverityBadge'
import { Logo } from '@/components/layout/Logo'
import { Shield, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  params: { shareToken: string }
}

export default async function PublicReportPage({ params }: Props) {
  const scan = await db.scan.findFirst({
    where: {
      shareToken: params.shareToken,
      shareExpiresAt: { gt: new Date() },
    },
    include: {
      categoryScores: true,
      complianceResults: true,
    },
  })

  if (!scan) notFound()

  const findings = (scan.findings as { severity: string; title: string; category: string; description?: string }[] | null) ?? []
  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const gradeColor = (scan.score ?? 0) >= 80 ? '#4ade80' : (scan.score ?? 0) >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen" style={{ background: '#050508' }}>
      {/* Header */}
      <div className="border-b border-[#1e1e35] px-6 py-4 flex items-center justify-between">
        <Logo size="sm" href="/" />
        <span className="text-xs text-[#3a3a5c] flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(scan.completedAt ?? scan.createdAt, 'MMM d, yyyy HH:mm')}
        </span>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold text-[#f0f0ff]">Security Report</h1>
          <p className="text-[#8888aa] font-mono mt-1">{scan.target}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-heading font-semibold uppercase text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20">
              {scan.status}
            </span>
            <span className="text-xs text-[#3a3a5c]">Public report</span>
          </div>
        </div>

        {/* Score */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="vx-card p-6 flex flex-col items-center">
            <SecurityGauge score={scan.score ?? 0} grade={scan.grade ?? "?"} size={160} />
            <div className="mt-3 text-center">
              <p className="text-xs text-[#8888aa]">Security Grade</p>
              <p className="text-3xl font-heading font-bold" style={{ color: gradeColor }}>{scan.grade ?? '?'}</p>
            </div>
          </div>

          <div className="vx-card p-5">
            <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Findings Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map(s => (
                <div key={s} className="flex items-center gap-3">
                  <SeverityBadge level={s} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category scores */}
        {scan.categoryScores.length > 0 && (
          <div className="vx-card p-5 mb-6">
            <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Category Scores</p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {scan.categoryScores.map((cs: { id: string; category: string; score: number }) => {
                const col = cs.score >= 80 ? '#4ade80' : cs.score >= 60 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={cs.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#8888aa]">{cs.category}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: col }}>{cs.score}</span>
                    </div>
                    <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cs.score}%`, background: col }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Findings */}
        <div className="vx-card overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[#1e1e35]">
            <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Findings ({findings.length})</p>
          </div>
          {findings.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-8 w-8 text-[#4ade80] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[#3a3a5c]">No findings</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e35]">
              {findings.map((f, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <SeverityBadge level={f.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'} />
                  <div>
                    <p className="text-sm text-[#f0f0ff]">{f.title}</p>
                    {f.description && <p className="text-xs text-[#8888aa] mt-0.5 line-clamp-2">{f.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center border-t border-[#1e1e35] pt-6">
          <p className="text-xs text-[#3a3a5c]">
            Generated by{' '}
            <span className="text-[#4ade80] font-heading font-semibold">VAULTRIX</span>
            {' '}— Enterprise Web Security Scanner
          </p>
          <p className="text-xs text-[#3a3a5c] mt-1">
            This report was shared publicly. Results are point-in-time and may not reflect current state.
          </p>
        </div>
      </div>
    </div>
  )
}
