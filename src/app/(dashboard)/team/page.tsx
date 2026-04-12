'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Plus, Mail, Trash2, Loader2, Crown, Shield } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function TeamPage() {
  const { data: session } = useSession()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const qc = useQueryClient()

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const isAgencyPlus = ['AGENCY', 'ENTERPRISE'].includes(plan)

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await fetch('/api/v1/team')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: isAgencyPlus,
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      setInviteEmail('')
      toast.success('Invitation sent')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!isAgencyPlus) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="vx-card p-10 text-center">
          <Crown className="h-10 w-10 text-[#f59e0b] mx-auto mb-4" />
          <h2 className="text-lg font-heading font-bold text-[#f0f0ff] mb-2">Agency plan required</h2>
          <p className="text-sm text-[#8888aa] mb-6">Team management is available on the Agency plan and above.</p>
          <Link href="/billing" className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm inline-flex items-center gap-2">
            <Crown className="h-4 w-4" /> Upgrade to Agency
          </Link>
        </div>
      </div>
    )
  }

  const members = data?.members ?? []

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Team</h1>
            <p className="text-sm text-[#8888aa] mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Invite form */}
        <div className="vx-card p-5 mb-6">
          <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">Invite Member</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              type="email"
              className="flex-1 px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="btn-primary px-4 py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
            >
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Invite
            </button>
          </div>
        </div>

        {/* Members list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
          </div>
        ) : members.length === 0 ? (
          <div className="vx-card p-10 text-center">
            <Users className="h-10 w-10 text-[#1e1e35] mx-auto mb-3" />
            <p className="text-sm text-[#3a3a5c]">No team members yet — invite someone above</p>
          </div>
        ) : (
          <div className="vx-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  {['Member', 'Role', 'Joined', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m: { id: string; user: { name: string; email: string }; role: string; createdAt: string }) => (
                  <tr key={m.id} className="border-b border-[#1e1e35] hover:bg-[#0d0d14] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e1e35] flex items-center justify-center text-xs font-bold text-[#4ade80]">
                          {m.user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-[#f0f0ff]">{m.user.name}</p>
                          <p className="text-xs text-[#3a3a5c]">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-[#8888aa]">
                        {m.role === 'ADMIN' ? <Crown className="h-3 w-3 text-[#f59e0b]" /> : <Shield className="h-3 w-3" />}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[#3a3a5c]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="p-1.5 text-[#3a3a5c] hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
