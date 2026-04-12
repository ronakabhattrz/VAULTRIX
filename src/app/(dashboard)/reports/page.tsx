'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, Shield, Clock, ChevronRight, Search, Loader2, AlertTriangle } from 'lucide-react'
import { SeverityBadge } from '@/components/security/SeverityBadge'
import { formatDistanceToNow } from 'date-fns'

type Status = 'ALL' | 'COMPLETED' | 'RUNNING' | 'FAILED' | 'QUEUED'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20',
    RUNNING: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
    QUEUED: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-heading font-semibold uppercase tracking-wider ${map[status] ?? 'text-[#8888aa] border-[#1e1e35]'}`}>
      {status}
    </span>
  )
}

export default function ReportsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['scans', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/v1/scans?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    placeholderData: prev => prev,
  })

  const scans = data?.scans ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Reports</h1>
            <p className="text-sm text-[#8888aa] mt-0.5">{total} total scan{total !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/scan/new" className="btn-primary px-4 py-2 rounded-lg font-heading font-semibold text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> New Scan
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3a3a5c]" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by URL…"
              className="w-full pl-9 pr-4 py-2 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
            />
          </div>
          <div className="flex gap-1">
            {(['ALL', 'COMPLETED', 'RUNNING', 'FAILED'] as Status[]).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-xs font-heading font-semibold border transition-all ${
                  statusFilter === s ? 'bg-[#1e1e35] border-[#2a2a4a] text-[#f0f0ff]' : 'border-[#1e1e35] text-[#3a3a5c] hover:text-[#8888aa]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="vx-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FileText className="h-8 w-8 text-[#1e1e35] mb-2" />
              <p className="text-sm text-[#3a3a5c]">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e1e35]">
                    {['Target', 'Status', 'Score', 'Findings', 'Date', ''].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan: {
                    id: string; url: string; status: string; score?: number; grade?: string;
                    criticalCount?: number; highCount?: number; mediumCount?: number; createdAt: string
                  }) => (
                    <tr key={scan.id} className="border-b border-[#1e1e35] hover:bg-[#0d0d14] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[#f0f0ff] font-mono">
                          {scan.url.replace(/^https?:\/\//, '')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><StatusPill status={scan.status} /></td>
                      <td className="px-5 py-3.5">
                        {scan.score !== undefined ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`text-sm font-heading font-bold ${scan.score >= 80 ? 'text-[#4ade80]' : scan.score >= 60 ? 'text-[#f59e0b]' : 'text-red-400'}`}>
                              {scan.score}
                            </span>
                            {scan.grade && <span className="text-xs text-[#3a3a5c]">({scan.grade})</span>}
                          </span>
                        ) : <span className="text-[#3a3a5c]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {(scan.criticalCount ?? 0) > 0 && <SeverityBadge level="CRITICAL" />}
                          {(scan.highCount ?? 0) > 0 && <SeverityBadge level="HIGH" />}
                          {(scan.mediumCount ?? 0) > 0 && <SeverityBadge level="MEDIUM" />}
                          {!(scan.criticalCount ?? 0) && !(scan.highCount ?? 0) && !(scan.mediumCount ?? 0) && (
                            <span className="text-xs text-[#3a3a5c]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#3a3a5c] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {scan.status === 'RUNNING' ? (
                          <Link href={`/scan/${scan.id}/running`} className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1">
                            Live <ChevronRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <Link href={`/scan/${scan.id}`} className="text-xs text-[#4ade80] hover:underline flex items-center gap-1">
                            View <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[#3a3a5c]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] hover:text-[#f0f0ff] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] hover:text-[#f0f0ff] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
