'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Shield, TrendingUp, CheckCircle, Loader2, Activity } from 'lucide-react'

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-xl border p-5" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  FREE: '#64748b', STARTER: '#60a5fa', PRO: '#4ade80', AGENCY: '#a78bfa', ENTERPRISE: '#f59e0b'
}

export default function AdminDashboardPage() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const r = await fetch('/api/admin/stats')
      if (!r.ok) throw new Error('Failed')
      const json = await r.json()
      return json.data ?? json
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-red-400" />
    </div>
  )

  const users = res?.users
  const scans = res?.scans

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time metrics across all users and scans</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Users"   value={users?.total ?? 0}                 sub={`+${users?.newThisWeek ?? 0} this week`}  icon={Users}       color="#60a5fa" />
        <StatCard title="Total Scans"   value={scans?.total ?? 0}                 sub={`${scans?.thisWeek ?? 0} this week`}       icon={Shield}      color="#a78bfa" />
        <StatCard title="Scans Today"   value={scans?.today ?? 0}                 sub="last 24 hours"                             icon={Activity}    color="#f59e0b" />
        <StatCard title="Success Rate"  value={`${scans?.successRate ?? 0}%`}     sub={scans?.avgDurationMs ? `avg ${(scans.avgDurationMs/1000).toFixed(1)}s` : ''}  icon={CheckCircle} color="#4ade80" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by plan */}
        <div className="rounded-xl border p-5" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Users by Plan</h2>
            <span className="text-xs text-slate-500">{users?.total ?? 0} total</span>
          </div>
          <div className="space-y-4">
            {(users?.byPlan ?? []).map(({ plan, _count }: { plan: string; _count: number }) => {
              const pct = users?.total ? Math.round((_count / users.total) * 100) : 0
              const color = PLAN_COLORS[plan] ?? '#64748b'
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold" style={{ color }}>{plan}</span>
                    <span className="text-xs text-slate-400">{_count} users <span className="text-slate-600">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Platform stats */}
        <div className="rounded-xl border p-5" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest mb-5">Platform Stats</h2>
          <div className="divide-y" style={{ borderColor: '#2a2a3a' }}>
            {[
              { label: 'New users this week',  value: users?.newThisWeek ?? 0 },
              { label: 'Scans this week',      value: scans?.thisWeek ?? 0 },
              { label: 'Scans today',          value: scans?.today ?? 0 },
              { label: 'Avg scan duration',    value: scans?.avgDurationMs ? `${(scans.avgDurationMs / 1000).toFixed(1)}s` : '—' },
              { label: 'Success rate',         value: `${scans?.successRate ?? 0}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-semibold text-white font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
