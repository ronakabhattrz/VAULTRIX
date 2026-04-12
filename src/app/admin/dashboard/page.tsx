'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Shield, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: React.ElementType; color: string
}) {
  return (
    <div className="vx-card p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-[#f0f0ff]">{value}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  return (
    <div className="min-h-screen p-6" style={{ background: '#050508' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-[#f0f0ff]">Admin Dashboard</h1>
          <p className="text-sm text-[#8888aa] mt-1">Platform-wide metrics</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Users" value={data?.users?.total ?? 0} icon={Users} color="#4ade80" />
              <StatCard title="Total Scans" value={data?.scans?.total ?? 0} icon={Shield} color="#60a5fa" />
              <StatCard title="Scans Today" value={data?.scans?.today ?? 0} icon={TrendingUp} color="#a78bfa" />
              <StatCard title="Success Rate" value={`${data?.scans?.successRate ?? 0}%`} icon={AlertTriangle} color="#f59e0b" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Users by plan */}
              <div className="vx-card p-5">
                <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Users by Plan</p>
                <div className="space-y-3">
                  {(data?.users?.byPlan ?? []).map(({ plan, _count }: { plan: string; _count: number }) => {
                    const colors: Record<string, string> = {
                      FREE: '#8888aa', STARTER: '#60a5fa', PRO: '#4ade80', AGENCY: '#a78bfa', ENTERPRISE: '#f59e0b'
                    }
                    const totalUsers = data?.users?.total ?? 1
                    const pct = Math.round((_count / totalUsers) * 100)
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono" style={{ color: colors[plan] ?? '#8888aa' }}>{plan}</span>
                          <span className="text-xs text-[#8888aa]">{_count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[plan] ?? '#8888aa' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick stats */}
              <div className="vx-card p-5">
                <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Quick Stats</p>
                <div className="space-y-3">
                  {[
                    { label: 'This week scans', value: data?.scans?.thisWeek ?? 0 },
                    { label: 'New users (7d)', value: data?.users?.newThisWeek ?? 0 },
                    { label: 'Avg scan duration', value: data?.scans?.avgDurationMs ? `${(data.scans.avgDurationMs / 1000).toFixed(1)}s` : '—' },
                    { label: 'Success rate', value: `${data?.scans?.successRate ?? 0}%` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1e1e35] last:border-0">
                      <span className="text-sm text-[#8888aa]">{item.label}</span>
                      <span className="text-sm font-heading font-bold text-[#f0f0ff]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
