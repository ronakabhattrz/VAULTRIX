'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Calendar, Plus, Trash2, Shield, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

const schema = z.object({
  target: z.string().url('Enter a valid URL'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  scanProfile: z.enum(['quick', 'standard', 'deep', 'full']),
})
type FormData = z.infer<typeof schema>

function FrequencyBadge({ freq }: { freq: string }) {
  const map: Record<string, string> = {
    DAILY: 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20',
    WEEKLY: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20',
    MONTHLY: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-heading font-semibold uppercase tracking-wider ${map[freq] ?? 'border-[#1e1e35] text-[#8888aa]'}`}>
      {freq}
    </span>
  )
}

export default function ScheduledPage() {
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled'],
    queryFn: async () => {
      const res = await fetch('/api/v1/scheduled')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: 'WEEKLY', scanProfile: 'standard' },
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/v1/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to create')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled'] })
      setShowForm(false)
      reset()
      toast.success('Scheduled scan created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/scheduled/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled'] })
      toast.success('Scheduled scan deleted')
    },
    onError: () => toast.error('Could not delete'),
  })

  const scheduled = data?.scheduled ?? []

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Scheduled Scans</h1>
            <p className="text-sm text-[#8888aa] mt-0.5">Automate recurring security monitoring</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-primary px-4 py-2 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Schedule'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="vx-card p-5 mb-6"
          >
            <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">New Scheduled Scan</p>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                    Target URL
                  </label>
                  <input
                    {...register('target')}
                    type="url"
                    placeholder="https://example.com"
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  />
                  {errors.target && <p className="text-xs text-red-400 mt-1">{errors.target.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                    Frequency
                  </label>
                  <select
                    {...register('frequency')}
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                  Scan Profile
                </label>
                <select
                  {...register('scanProfile')}
                  className="w-full sm:w-48 px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                >
                  <option value="quick">Quick</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                  <option value="full">Full Audit</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
              >
                {(isSubmitting || createMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Schedule
              </button>
            </form>
          </motion.div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-[#4ade80]" />
          </div>
        ) : scheduled.length === 0 ? (
          <div className="vx-card p-10 text-center">
            <Calendar className="h-10 w-10 text-[#1e1e35] mx-auto mb-3" />
            <p className="text-sm font-heading font-semibold text-[#3a3a5c]">No scheduled scans</p>
            <p className="text-xs text-[#3a3a5c] mt-1">Set up automatic scans to monitor your security posture over time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduled.map((item: {
              id: string; target: string; frequency: string; scanProfile?: string;
              nextRunAt: string; isActive: boolean
            }) => (
              <div key={item.id} className="vx-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#1e1e35] flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-[#4ade80]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-[#f0f0ff] truncate">{item.target.replace(/^https?:\/\//, '')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FrequencyBadge freq={item.frequency} />
                    <span className="text-xs text-[#3a3a5c]">
                      Next: {format(new Date(item.nextRunAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg text-[#3a3a5c] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
