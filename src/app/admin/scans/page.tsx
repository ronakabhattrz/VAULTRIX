'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Loader2, ChevronLeft, ChevronRight, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  RUNNING:   'text-blue-400 bg-blue-400/10 border-blue-400/20',
  QUEUED:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  FAILED:    'text-red-400 bg-red-400/10 border-red-400/20',
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#4ade80', A: '#4ade80', B: '#86efac', C: '#f59e0b', D: '#f97316', F: '#ef4444'
}

type Scan = {
  id: string; url: string; status: string; score?: number; grade?: string;
  scanDuration?: number; createdAt: string;
  user?: { name?: string; email: string }
}

export default function AdminScansPage() {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ]           = useState('')
  const qc = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-scans', page, q],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (q) params.set('search', q)
      const r = await fetch(`/api/admin/scans?${params}`)
      if (!r.ok) throw new Error('Failed')
      const json = await r.json()
      return json.data ?? json
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Delete this scan? This cannot be undone.')) throw new Error('Cancelled')
      const r = await fetch(`/api/admin/scans/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
      return r.json()
    },
    onSuccess: () => {
      toast.success('Scan deleted')
      qc.invalidateQueries({ queryKey: ['admin-scans'] })
    },
    onError: (e: Error) => { if (e.message !== 'Cancelled') toast.error('Delete failed') },
  })

  const scans = res?.scans ?? []
  const total = res?.total ?? 0
  const pages = Math.ceil(total / 25)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Scans</h1>
        <p className="text-sm text-slate-400 mt-1">{total} total scans across all users</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setQ(search); setPage(1) } }}
          placeholder="Search by URL… (press Enter)"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white bg-[#0d0d18] border border-[#2a2a3a] outline-none focus:border-red-500/50 placeholder:text-slate-600"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a3a' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d0d18', borderBottom: '1px solid #2a2a3a' }}>
              {['URL', 'User', 'Status', 'Score', 'Duration', 'Date', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: '#080810' }}>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-red-400 mx-auto" />
              </td></tr>
            ) : scans.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">No scans found</td></tr>
            ) : scans.map((s: Scan) => (
              <tr key={s.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1e1e2e' }}>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="text-xs text-white font-mono truncate">{s.url}</p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">{s.id.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-300">{s.user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{s.user?.email ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_STYLES[s.status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {s.score != null ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono" style={{ color: GRADE_COLORS[s.grade ?? ''] ?? '#64748b' }}>
                        {s.grade}
                      </span>
                      <span className="text-xs text-slate-400">{s.score}</span>
                    </div>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                  {s.scanDuration ? `${(s.scanDuration / 1000).toFixed(1)}s` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {s.status === 'COMPLETED' && (
                      <Link href={`/scan/${s.id}`}
                        className="p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-blue-400 transition-colors"
                        title="View report">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete scan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">Page {page} of {pages} · {total} scans</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded border border-[#2a2a3a] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded border border-[#2a2a3a] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
