'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Search, ChevronRight, Loader2, Crown, Globe, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})
type ClientForm = z.infer<typeof clientSchema>

export default function ClientsPage() {
  const { data: session } = useSession()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const isAgencyPlus = ['AGENCY', 'ENTERPRISE'].includes(plan)

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/v1/clients')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: isAgencyPlus,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (data: ClientForm) => {
      const res = await fetch('/api/v1/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowForm(false)
      reset()
      toast.success('Client created')
    },
    onError: () => toast.error('Could not create client'),
  })

  if (!isAgencyPlus) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="vx-card p-10 text-center">
          <Crown className="h-10 w-10 text-[#f59e0b] mx-auto mb-4" />
          <h2 className="text-lg font-heading font-bold text-[#f0f0ff] mb-2">Agency plan required</h2>
          <p className="text-sm text-[#8888aa] mb-6">Client workspace management is available on Agency plan and above.</p>
          <Link href="/billing" className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm inline-flex items-center gap-2">
            Upgrade to Agency
          </Link>
        </div>
      </div>
    )
  }

  const clients = (data?.clients ?? []).filter((c: { name: string }) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Clients</h1>
            <p className="text-sm text-[#8888aa] mt-0.5">Manage your client workspaces</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary px-4 py-2 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Client'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="vx-card p-5 mb-6"
          >
            <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">New Client</p>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Client Name *</label>
                  <input
                    {...register('name')}
                    placeholder="Acme Corporation"
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Primary Domain</label>
                  <input
                    {...register('domain')}
                    placeholder="https://acme.com"
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Contact Email</label>
                  <input
                    {...register('contactEmail')}
                    type="email"
                    placeholder="security@acme.com"
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Notes</label>
                  <input
                    {...register('notes')}
                    placeholder="Optional notes…"
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="btn-primary px-5 py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
              >
                {(isSubmitting || createMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Client
              </button>
            </form>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3a3a5c]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-4 py-2 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
          </div>
        ) : clients.length === 0 ? (
          <div className="vx-card p-10 text-center">
            <Briefcase className="h-10 w-10 text-[#1e1e35] mx-auto mb-3" />
            <p className="text-sm text-[#3a3a5c]">No clients yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {clients.map((client: { id: string; name: string; domain?: string; scanCount?: number }) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="vx-card p-4 flex items-center gap-4 hover:border-[#2a2a4a] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1e1e35] flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-[#8888aa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-semibold text-[#f0f0ff]">{client.name}</p>
                  {client.domain && (
                    <p className="text-xs text-[#3a3a5c] flex items-center gap-1 mt-0.5 truncate">
                      <Globe className="h-3 w-3" />
                      {client.domain.replace(/^https?:\/\//, '')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-[#3a3a5c]">
                  {client.scanCount ?? 0} scans
                  <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
