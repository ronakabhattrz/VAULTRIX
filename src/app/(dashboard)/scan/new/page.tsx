'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Shield, Lock, Globe, Zap, ChevronDown, ChevronRight, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'

const PROFILES = [
  {
    id: 'quick',
    label: 'Quick Scan',
    description: 'Headers, SSL, cookies — ~15 seconds',
    icon: Zap,
    color: '#4ade80',
    plans: ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'],
  },
  {
    id: 'standard',
    label: 'Standard Scan',
    description: 'Adds DNS, ports, content, performance — ~30 seconds',
    icon: Shield,
    color: '#60a5fa',
    plans: ['STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'],
  },
  {
    id: 'deep',
    label: 'Deep Scan',
    description: 'Full OWASP scan including webapp, CORS, email, auth — ~60 seconds',
    icon: Lock,
    color: '#a78bfa',
    plans: ['PRO', 'AGENCY', 'ENTERPRISE'],
  },
  {
    id: 'full',
    label: 'Full Audit',
    description: 'All modules + API security + compliance mapping',
    icon: Globe,
    color: '#f59e0b',
    plans: ['AGENCY', 'ENTERPRISE'],
  },
]

const schema = z.object({
  url: z.string().url('Enter a valid URL (include https://)'),
  profile: z.enum(['quick', 'standard', 'deep', 'full']),
  notes: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

export default function NewScanPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { profile: 'quick' },
  })

  const selectedProfile = watch('profile')

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Failed to start scan')
        return
      }
      const { scanId } = await res.json()
      router.push(`/scan/${scanId}/running`)
    } catch {
      toast.error('Network error')
    }
  }

  const planOrder = ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE']
  const planIdx = planOrder.indexOf(plan)

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="mb-6">
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">New Security Scan</h1>
          <p className="text-sm text-[#8888aa] mt-1">Enter a target URL and choose a scan profile</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* URL Input */}
          <div className="vx-card p-5">
            <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-2">
              Target URL
            </label>
            <input
              {...register('url')}
              type="url"
              placeholder="https://example.com"
              autoFocus
              className="w-full px-4 py-3 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c] font-mono"
            />
            {errors.url && <p className="text-xs text-red-400 mt-1.5">{errors.url.message}</p>}
            <div className="flex items-start gap-2 mt-3 p-3 bg-[#0d0d14] rounded-lg border border-[#1e1e35]">
              <Info className="h-3.5 w-3.5 text-[#3a3a5c] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#3a3a5c] leading-relaxed">
                Only scan domains you own or have explicit written permission to test. Unauthorized scanning may violate laws including the CFAA.
              </p>
            </div>
          </div>

          {/* Scan Profile */}
          <div className="vx-card p-5">
            <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-3">
              Scan Profile
            </label>
            <div className="space-y-2">
              {PROFILES.map(profile => {
                const requiredPlanIdx = planOrder.indexOf(profile.plans[0])
                const locked = planIdx < requiredPlanIdx
                const active = selectedProfile === profile.id && !locked

                return (
                  <button
                    key={profile.id}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setValue('profile', profile.id as FormData['profile'])}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                      active
                        ? 'border-[#4ade80]/40 bg-[#4ade80]/5'
                        : locked
                        ? 'border-[#1e1e35] opacity-40 cursor-not-allowed'
                        : 'border-[#1e1e35] hover:border-[#2a2a4a] cursor-pointer'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${profile.color}15`, border: `1px solid ${profile.color}30` }}>
                      <profile.icon className="h-4.5 w-4.5" style={{ color: active ? profile.color : '#8888aa' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-heading font-semibold text-[#f0f0ff]">{profile.label}</span>
                        {locked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 font-heading font-semibold">
                            {profile.plans[0]}+
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8888aa] mt-0.5">{profile.description}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      active ? 'border-[#4ade80] bg-[#4ade80]' : 'border-[#2a2a4a]'
                    }`}>
                      {active && <div className="w-full h-full rounded-full bg-[#050508] scale-50" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="vx-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm text-[#8888aa] hover:text-[#f0f0ff] transition-colors"
            >
              <span className="text-xs font-heading font-semibold uppercase tracking-wider">Advanced Options</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#1e1e35]">
                <div className="pt-4">
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Add context about this scan, e.g. pre-deployment check, client: Acme Corp..."
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c] resize-none"
                  />
                  {errors.notes && <p className="text-xs text-red-400 mt-1">{errors.notes.message}</p>}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 rounded-lg font-heading font-semibold flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Starting scan…</>
            ) : (
              <><Shield className="h-4 w-4" /> Start Scan <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
