'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Loader2, Shield } from 'lucide-react'
import { PlanBadge } from '@/components/security/PlanBadge'
import { formatDistanceToNow } from 'date-fns'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    placeholderData: prev => prev,
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0

  return (
    <div className="min-h-screen p-6" style={{ background: '#050508' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-[#f0f0ff]">Users</h1>
            <p className="text-sm text-[#8888aa] mt-1">{total} registered users</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3a3a5c]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email…"
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
                    {['User', 'Plan', 'Scans', 'Joined', 'Status'].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: {
                    id: string; name: string; email: string; plan: string;
                    scanCount: number; createdAt: string; isSuspended: boolean
                  }) => (
                    <tr key={u.id} className="border-b border-[#1e1e35] hover:bg-[#0d0d14] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#1e1e35] flex items-center justify-center text-xs font-bold text-[#4ade80]">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-[#f0f0ff]">{u.name}</p>
                            <p className="text-xs text-[#3a3a5c]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><PlanBadge plan={u.plan} /></td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-sm text-[#f0f0ff]">
                          <Shield className="h-3.5 w-3.5 text-[#3a3a5c]" /> {u.scanCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#3a3a5c]">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-heading font-semibold uppercase ${
                          u.isSuspended
                            ? 'text-red-400 bg-red-400/10 border-red-400/20'
                            : 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20'
                        }`}>
                          {u.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {Math.ceil(total / 25) > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[#3a3a5c]">Page {page} of {Math.ceil(total / 25)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] hover:text-[#f0f0ff] disabled:opacity-40">Previous</button>
              <button disabled={page === Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] hover:text-[#f0f0ff] disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
