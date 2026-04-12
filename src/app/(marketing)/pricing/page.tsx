'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Zap, Crown, Building, Globe, Shield } from 'lucide-react'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    icon: Shield,
    price: { monthly: 0, annual: 0 },
    scans: '5 scans / month',
    color: '#8888aa',
    features: [
      'HTTP header analysis',
      'SSL/TLS certificate check',
      'Cookie security audit',
      'Basic vulnerability report',
      'Community support',
    ],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    icon: Zap,
    price: { monthly: 29, annual: 23 },
    scans: '50 scans / month',
    color: '#60a5fa',
    features: [
      'Everything in Free',
      'DNS security (SPF, DMARC, DKIM)',
      'Port & service enumeration',
      'Tech stack fingerprinting',
      'Performance analysis',
      'PDF report export',
      'Email support',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    icon: Crown,
    price: { monthly: 79, annual: 63 },
    scans: '200 scans / month',
    color: '#4ade80',
    popular: true,
    features: [
      'Everything in Starter',
      'Web app vulnerability scan',
      'CORS misconfiguration check',
      'Email security audit',
      'Auth flow analysis',
      'REST API access',
      'Score trend tracking',
      'Priority support',
    ],
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    icon: Building,
    price: { monthly: 199, annual: 159 },
    scans: 'Unlimited scans',
    color: '#a78bfa',
    features: [
      'Everything in Pro',
      'API security scanning',
      'OWASP / PCI DSS / GDPR mapping',
      'Team member management',
      'Client workspace',
      'Webhook notifications',
      'Scheduled scans',
      'White-label reports',
      'SLA-backed support',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    icon: Globe,
    price: { monthly: 0, annual: 0 },
    scans: 'Custom volume',
    color: '#f59e0b',
    custom: true,
    features: [
      'Everything in Agency',
      'Custom scan modules',
      'SSO / SAML',
      'Dedicated IP ranges',
      'On-premise deployment',
      'Custom SLA',
      'Dedicated CSM',
    ],
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="px-4 py-16 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-[#8888aa] max-w-xl mx-auto mb-8">
          Start free. Scale as you grow. No hidden fees.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? 'text-[#f0f0ff]' : 'text-[#8888aa]'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#4ade80]' : 'bg-[#1e1e35]'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-[#f0f0ff]' : 'text-[#8888aa]'}`}>
            Annual <span className="text-[#4ade80] text-xs ml-1">Save 20%</span>
          </span>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PLANS.map((plan, i) => {
          const price = annual ? plan.price.annual : plan.price.monthly
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`vx-card p-5 flex flex-col relative ${plan.popular ? 'border-[#4ade80]/40 shadow-[0_0_30px_rgba(74,222,128,0.08)]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#4ade80] rounded-full text-[10px] font-heading font-bold text-[#050508] uppercase tracking-wider whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <plan.icon className="h-5 w-5" style={{ color: plan.color }} />
                <span className="font-heading font-bold text-[#f0f0ff]">{plan.name}</span>
              </div>
              <div className="mb-1">
                {plan.custom ? (
                  <span className="text-2xl font-heading font-bold text-[#f0f0ff]">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-heading font-bold text-[#f0f0ff]">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && <span className="text-xs text-[#8888aa]">/mo</span>}
                  </>
                )}
              </div>
              <p className="text-xs text-[#8888aa] mb-5">{plan.scans}</p>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#8888aa]">
                    <Check className="h-3.5 w-3.5 text-[#4ade80] mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.custom ? '/contact' : '/auth/register'}
                className={`w-full py-2.5 rounded-lg font-heading font-semibold text-sm text-center transition-all ${
                  plan.popular ? 'btn-primary' : 'border border-[#1e1e35] text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a]'
                }`}
              >
                {plan.custom ? 'Contact Sales' : plan.price.monthly === 0 ? 'Get Started Free' : 'Start Free Trial'}
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center mt-10 text-sm text-[#3a3a5c]">
        All paid plans include a 14-day free trial. Cancel anytime. Prices in USD.
      </div>
    </div>
  )
}
