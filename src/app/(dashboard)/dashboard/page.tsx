'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, TrendingUp, Clock, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { SecurityGauge } from '@/components/security/SecurityGauge'
import { SeverityBadge } from '@/components/security/SeverityBadge'
import { ScoreTrendChart } from '@/components/security/ScoreTrendChart'
import { PlanBadge } from '@/components/security/PlanBadge'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="vx-card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-[#f0f0ff]">{value}</p>
      <p className="text-xs text-[#3a3a5c] mt-1">{sub}</p>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-[#4ade80]',
    RUNNING: 'bg-[#4ade80] animate-pulse',
    FAILED: 'bg-red-400',
    QUEUED: 'bg-[#f59e0b]',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? 'bg-[#3a3a5c]'}`} />
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  const { data: scansData, isLoading } = useQuery({
    queryKey: ['scans', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/v1/scans?limit=10&page=1')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const scans = scansData?.scans ?? []
  const completedScans = scans.filter((s: { status: string }) => s.status === 'COMPLETED')
  const avgScore = completedScans.length
    ? Math.round(completedScans.reduce((a: number, s: { score: number }) => a + (s.score ?? 0), 0) / completedScans.length)
    : 0

  const criticalCount = completedScans.reduce((a: number, s: { criticalCount?: number }) => a + (s.criticalCount ?? 0), 0)
  const highCount = completedScans.reduce((a: number, s: { highCount?: number }) => a + (s.highCount ?? 0), 0)

  const trendData = completedScans
    .slice(0, 10)
    .reverse()
    .map((s: { url: string; score: number; completedAt: string }) => ({
      label: s.url.replace(/^https?:\/\//, '').split('/')[0],
      score: s.score ?? 0,
      date: s.completedAt,
    }))

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">
            Welcome back, {session?.user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-[#8888aa] mt-0.5">Here&apos;s your security overview</p>
        </div>
        <div className="flex items-center gap-3">
          <PlanBadge plan={plan} />
          <Link href="/scan/new" className="btn-primary px-4 py-2 rounded-lg font-heading font-semibold text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Scan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Avg Score" value={avgScore || '—'} sub="across all scans" icon={Shield} color="#4ade80" />
        <StatCard title="Total Scans" value={scansData?.total ?? 0} sub="all time" icon={TrendingUp} color="#60a5fa" />
        <StatCard title="Critical" value={criticalCount} sub="open findings" icon={AlertTriangle} color="#ef4444" />
        <StatCard title="High" value={highCount} sub="open findings" icon={AlertTriangle} color="#f59e0b" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Gauge */}
        <div className="vx-card p-6 flex flex-col items-center justify-center">
          <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Overall Security Score</p>
          <SecurityGauge score={avgScore} grade={avgScore >= 90 ? 'A+' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'F'} size={180} />
          <p className="text-xs text-[#3a3a5c] mt-3">
            {completedScans.length ? `Based on ${completedScans.length} scan${completedScans.length > 1 ? 's' : ''}` : 'Run your first scan'}
          </p>
        </div>

        {/* Trend chart */}
        <div className="lg:col-span-2 vx-card p-6">
          <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Score Trend</p>
          {trendData.length > 1 ? (
            <ScoreTrendChart data={trendData} />
          ) : (
            <div className="h-40 flex items-center justify-center text-[#3a3a5c] text-sm">
              Not enough data — run a few scans to see trends
            </div>
          )}
        </div>
      </div>

      {/* Quick scan widget */}
      <div className="vx-card p-5 mb-6 border-[#4ade80]/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-[#4ade80]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Run a quick scan</p>
            <p className="text-xs text-[#8888aa]">Enter a URL and get results in under 60 seconds</p>
          </div>
          <Link href="/scan/new" className="btn-primary px-4 py-2 rounded-lg font-heading font-semibold text-sm flex items-center gap-1.5 flex-shrink-0">
            Start Scan <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent scans table */}
      <div className="vx-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e35] flex items-center justify-between">
          <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Recent Scans</p>
          <Link href="/reports" className="text-xs text-[#4ade80] hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Shield className="h-8 w-8 text-[#1e1e35] mb-2" />
            <p className="text-sm text-[#3a3a5c]">No scans yet</p>
            <Link href="/scan/new" className="text-xs text-[#4ade80] hover:underline mt-1">Run your first scan →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  {['Target', 'Status', 'Score', 'Findings', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {scans.map((scan: {
                  id: string; url: string; status: string; score?: number;
                  criticalCount?: number; highCount?: number; mediumCount?: number; lowCount?: number; createdAt: string
                }) => (
                  <tr key={scan.id} className="border-b border-[#1e1e35] hover:bg-[#0d0d14] transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm text-[#f0f0ff] font-mono truncate max-w-[200px] block">
                        {scan.url.replace(/^https?:\/\//, '')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2 text-xs text-[#8888aa]">
                        <StatusDot status={scan.status} />
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {scan.score !== undefined ? (
                        <span className={`text-sm font-heading font-bold ${
                          scan.score >= 80 ? 'text-[#4ade80]' : scan.score >= 60 ? 'text-[#f59e0b]' : 'text-red-400'
                        }`}>{scan.score}</span>
                      ) : <span className="text-[#3a3a5c] text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {(scan.criticalCount ?? 0) > 0 && <SeverityBadge level="CRITICAL" />}
                        {(scan.highCount ?? 0) > 0 && <SeverityBadge level="HIGH" />}
                        {(scan.mediumCount ?? 0) > 0 && <SeverityBadge level="MEDIUM" />}
                        {!(scan.criticalCount ?? 0) && !(scan.highCount ?? 0) && !(scan.mediumCount ?? 0) && (
                          <span className="text-xs text-[#3a3a5c]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-[#3a3a5c] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/scan/${scan.id}`}
                        className="text-xs text-[#4ade80] hover:underline flex items-center gap-1"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
