'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Loader2, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20',
    RUNNING: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
    QUEUED: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-heading font-semibold uppercase ${map[status] ?? 'text-[#8888aa] border-[#1e1e35]'}`}>
      {status}
    </span>
  )
}

export default function AdminScansPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-scans', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/scans?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    placeholderData: prev => prev,
  })

  const scans = data?.scans ?? []
  const total = data?.total ?? 0

  return (
    <div className="min-h-screen p-6" style={{ background: '#050508' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-[#f0f0ff]">All Scans</h1>
            <p className="text-sm text-[#8888aa] mt-1">{total} total scans</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3a3a5c]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by URL or user email…"
            className="w-full pl-9 pr-4 py-2 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
          />
        </div>

        <div className="vx-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e1e35]">
                    {['URL', 'User', 'Status', 'Score', 'Date', ''].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan: {
                    id: string; url: string; status: string; score?: number;
                    user: { name: string; email: string }; createdAt: string
                  }) => (
                    <tr key={scan.id} className="border-b border-[#1e1e35] hover:bg-[#0d0d14] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-mono text-[#f0f0ff] truncate max-w-[200px] block">
                          {scan.url.replace(/^https?:\/\//, '')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-[#f0f0ff]">{scan.user?.name}</p>
                        <p className="text-xs text-[#3a3a5c]">{scan.user?.email}</p>
                      </td>
                      <td className="px-5 py-3.5"><StatusPill status={scan.status} /></td>
                      <td className="px-5 py-3.5">
                        {scan.score !== undefined ? (
                          <span className={`text-sm font-heading font-bold ${scan.score >= 80 ? 'text-[#4ade80]' : scan.score >= 60 ? 'text-[#f59e0b]' : 'text-red-400'}`}>
                            {scan.score}
                          </span>
                        ) : <span className="text-[#3a3a5c]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#3a3a5c]">
                          {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/scan/${scan.id}`} className="text-xs text-[#4ade80] hover:underline flex items-center gap-1">
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scans.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32">
                  <Shield className="h-8 w-8 text-[#1e1e35] mb-2" />
                  <p className="text-sm text-[#3a3a5c]">No scans found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {Math.ceil(total / 25) > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[#3a3a5c]">Page {page} of {Math.ceil(total / 25)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] disabled:opacity-40">Previous</button>
              <button disabled={page === Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
