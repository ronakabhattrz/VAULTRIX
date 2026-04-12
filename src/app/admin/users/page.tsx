'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Loader2, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight,
  MoreVertical, UserX, UserCheck, Crown, Trash2, Shield
} from 'lucide-react'
import { toast } from 'sonner'

const PLAN_COLORS: Record<string, string> = {
  FREE: '#64748b', STARTER: '#60a5fa', PRO: '#4ade80', AGENCY: '#a78bfa', ENTERPRISE: '#f59e0b'
}
const PLANS = ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'] as const

type User = {
  id: string; name?: string; email: string; plan: string;
  totalScans: number; isSuspended: boolean; isAdmin: boolean;
  subscriptionStatus?: string; createdAt: string
}

function PlanDropdown({ user, onUpdate }: { user: User; onUpdate: (id: string, data: object) => void }) {
  return (
    <select
      value={user.plan}
      onChange={e => onUpdate(user.id, { plan: e.target.value })}
      className="text-xs font-mono font-semibold px-2 py-1 rounded cursor-pointer outline-none border"
      style={{
        color: PLAN_COLORS[user.plan] ?? '#64748b',
        background: `${PLAN_COLORS[user.plan] ?? '#64748b'}15`,
        borderColor: `${PLAN_COLORS[user.plan] ?? '#64748b'}40`,
      }}
    >
      {PLANS.map(p => (
        <option key={p} value={p} style={{ background: '#0d0d18', color: PLAN_COLORS[p] }}>{p}</option>
      ))}
    </select>
  )
}

function UserActions({ user, onUpdate, onDelete }: {
  user: User
  onUpdate: (id: string, data: object) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 w-48 rounded-lg border z-20 overflow-hidden shadow-xl"
            style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
            {user.isSuspended ? (
              <button onClick={() => { onUpdate(user.id, { isSuspended: false }); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-emerald-400 hover:bg-white/5 transition-colors">
                <UserCheck className="h-3.5 w-3.5" /> Unsuspend User
              </button>
            ) : (
              <button onClick={() => { onUpdate(user.id, { isSuspended: true }); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-yellow-400 hover:bg-white/5 transition-colors">
                <UserX className="h-3.5 w-3.5" /> Suspend User
              </button>
            )}
            {!user.isAdmin ? (
              <button onClick={() => { onUpdate(user.id, { isAdmin: true }); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-blue-400 hover:bg-white/5 transition-colors">
                <Shield className="h-3.5 w-3.5" /> Make Admin
              </button>
            ) : (
              <button onClick={() => { onUpdate(user.id, { isAdmin: false }); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-400 hover:bg-white/5 transition-colors">
                <Shield className="h-3.5 w-3.5" /> Remove Admin
              </button>
            )}
            <div className="border-t" style={{ borderColor: '#2a2a3a' }} />
            <button onClick={() => { onDelete(user.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete User
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const qc = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-users', page, q],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (q) params.set('search', q)
      const r = await fetch(`/api/admin/users?${params}`)
      if (!r.ok) throw new Error('Failed')
      const json = await r.json()
      return json.data ?? json
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!r.ok) throw new Error('Update failed')
      return r.json()
    },
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Delete this user? This cannot be undone.')) throw new Error('Cancelled')
      const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
      return r.json()
    },
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e: Error) => { if (e.message !== 'Cancelled') toast.error('Delete failed') },
  })

  const users = res?.users ?? []
  const total = res?.total ?? 0
  const pages = Math.ceil(total / 25)

  const handleUpdate = (id: string, data: object) => updateMutation.mutate({ id, data })
  const handleDelete = (id: string) => deleteMutation.mutate(id)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-slate-400 mt-1">{total} total registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setQ(search); setPage(1) } }}
          placeholder="Search by name or email… (Enter)"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white bg-[#0d0d18] border border-[#2a2a3a] outline-none focus:border-red-500/50 placeholder:text-slate-600"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a3a' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d0d18', borderBottom: '1px solid #2a2a3a' }}>
              {['User', 'Plan', 'Scans', 'Status', 'Subscription', 'Joined', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: '#080810' }}>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-red-400 mx-auto" />
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500">No users found</td></tr>
            ) : users.map((u: User) => (
              <tr key={u.id} className="border-t hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1e1e2e' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: u.isAdmin ? '#ef444430' : '#1e1e2e', border: `1px solid ${u.isAdmin ? '#ef4444' : '#2a2a3a'}` }}
                    >
                      {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-xs">{u.name ?? '—'}</p>
                        {u.isAdmin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center gap-1">
                            <Crown className="h-2.5 w-2.5" /> ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PlanDropdown user={u} onUpdate={handleUpdate} />
                </td>
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{u.totalScans ?? 0}</td>
                <td className="px-4 py-3">
                  {u.isSuspended ? (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <ShieldOff className="h-3 w-3" /> Suspended
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono ${u.subscriptionStatus === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {u.subscriptionStatus ?? 'free'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <UserActions user={u} onUpdate={handleUpdate} onDelete={handleDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">Page {page} of {pages} · {total} users</span>
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
