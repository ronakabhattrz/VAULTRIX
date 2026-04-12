'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { CreditCard, Check, Loader2, Zap, Crown, Building, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { PlanBadge } from '@/components/security/PlanBadge'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    icon: Shield,
    price: { monthly: 0, annual: 0 },
    scans: '5 scans/month',
    features: ['Headers, SSL, cookies', 'Basic findings', 'Community support'],
    color: '#8888aa',
  },
  {
    id: 'STARTER',
    name: 'Starter',
    icon: Zap,
    price: { monthly: 29, annual: 23 },
    scans: '50 scans/month',
    features: ['All Free modules', 'DNS, ports, content', 'Performance module', 'Email support'],
    color: '#60a5fa',
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    icon: Crown,
    price: { monthly: 79, annual: 63 },
    scans: '200 scans/month',
    features: ['All Starter modules', 'CORS, webapp, auth', 'Email security checks', 'API access', 'Priority support'],
    color: '#4ade80',
    popular: true,
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    icon: Building,
    price: { monthly: 199, annual: 159 },
    scans: 'Unlimited scans',
    features: ['All Pro modules', 'Compliance mapping', 'Team management', 'Client workspace', 'Webhooks', 'SLA support'],
    color: '#a78bfa',
  },
]

import { Shield } from 'lucide-react'

export default function BillingPage() {
  const { data: session } = useSession()
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'

  const handleUpgrade = async (planId: string) => {
    if (planId === 'FREE' || planId === plan) return
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, annual }),
      })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error('Could not start checkout')
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal')
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error('Could not open billing portal')
      setLoading(null)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Billing & Plans</h1>
            <p className="text-sm text-[#8888aa] mt-0.5 flex items-center gap-2">
              Current plan: <PlanBadge plan={plan} />
            </p>
          </div>
          {plan !== 'FREE' && (
            <button
              onClick={handlePortal}
              disabled={loading === 'portal'}
              className="flex items-center gap-2 px-4 py-2 border border-[#1e1e35] rounded-lg text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors"
            >
              {loading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage Billing
            </button>
          )}
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm ${!annual ? 'text-[#f0f0ff]' : 'text-[#8888aa]'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#4ade80]' : 'bg-[#1e1e35]'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-[#f0f0ff]' : 'text-[#8888aa]'}`}>
            Annual <span className="text-[#4ade80] text-xs">Save 20%</span>
          </span>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(p => {
            const price = annual ? p.price.annual : p.price.monthly
            const isCurrent = p.id === plan
            const isDowngrade = ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'].indexOf(p.id) <
              ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'].indexOf(plan)

            return (
              <div
                key={p.id}
                className={`vx-card p-5 flex flex-col relative ${p.popular ? 'border-[#4ade80]/40' : ''}`}
              >
                {p.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#4ade80] rounded-full text-[10px] font-heading font-bold text-[#050508] uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <p.icon className="h-4 w-4" style={{ color: p.color }} />
                  <span className="text-sm font-heading font-bold text-[#f0f0ff]">{p.name}</span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-heading font-bold text-[#f0f0ff]">
                    {price === 0 ? 'Free' : `$${price}`}
                  </span>
                  {price > 0 && <span className="text-xs text-[#8888aa]">/mo</span>}
                </div>
                <p className="text-xs text-[#8888aa] mb-4">{p.scans}</p>
                <ul className="space-y-2 flex-1 mb-5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[#8888aa]">
                      <Check className="h-3.5 w-3.5 text-[#4ade80] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(p.id)}
                  disabled={isCurrent || isDowngrade || loading === p.id}
                  className={`w-full py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'border border-[#4ade80]/40 text-[#4ade80] cursor-default'
                      : isDowngrade
                      ? 'border border-[#1e1e35] text-[#3a3a5c] cursor-not-allowed'
                      : 'btn-primary hover:opacity-90'
                  }`}
                >
                  {loading === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent ? 'Current Plan' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-[#3a3a5c] mt-6">
          All plans include a 14-day free trial. Cancel anytime. Prices in USD.
        </p>
      </motion.div>
    </div>
  )
}
