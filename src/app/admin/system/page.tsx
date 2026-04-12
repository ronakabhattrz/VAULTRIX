'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Server, RefreshCw, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSystemPage() {
  const [running, setRunning] = useState<string | null>(null)

  const runAction = async (action: string, label: string) => {
    setRunning(action)
    try {
      const res = await fetch(`/api/admin/trigger-cron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(`${label} triggered successfully`)
      } else {
        toast.error(`Failed to trigger ${label}`)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setRunning(null)
    }
  }

  const actions = [
    { id: 'scheduled-scans', label: 'Run Scheduled Scans', desc: 'Process all due scheduled scans' },
    { id: 'score-drops', label: 'Check Score Drops', desc: 'Send alerts for significant score drops' },
    { id: 'cleanup', label: 'Cleanup Old Data', desc: 'Remove expired tokens and old notifications' },
  ]

  const envChecks = [
    { key: 'DATABASE_URL', label: 'Database' },
    { key: 'NEXTAUTH_SECRET', label: 'Auth Secret' },
    { key: 'STRIPE_SECRET_KEY', label: 'Stripe' },
    { key: 'RESEND_API_KEY', label: 'Email (Resend)' },
    { key: 'UPSTASH_REDIS_REST_URL', label: 'Redis (Upstash)' },
  ]

  return (
    <div className="min-h-screen p-6" style={{ background: '#050508' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-[#f0f0ff]">System</h1>
          <p className="text-sm text-[#8888aa] mt-1">Admin tools and configuration</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Manual triggers */}
          <div className="vx-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-4 w-4 text-[#4ade80]" />
              <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Manual Triggers</p>
            </div>
            <div className="space-y-3">
              {actions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[#1e1e35]">
                  <div>
                    <p className="text-sm text-[#f0f0ff]">{action.label}</p>
                    <p className="text-xs text-[#3a3a5c]">{action.desc}</p>
                  </div>
                  <button
                    onClick={() => runAction(action.id, action.label)}
                    disabled={running !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1e1e35] rounded text-xs text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a] disabled:opacity-50 transition-colors"
                  >
                    {running === action.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Run
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Env check */}
          <div className="vx-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-[#4ade80]" />
              <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Environment</p>
            </div>
            <div className="space-y-2">
              {envChecks.map(check => {
                const set = typeof process !== 'undefined' && !!process.env[check.key]
                return (
                  <div key={check.key} className="flex items-center justify-between py-2 border-b border-[#1e1e35] last:border-0">
                    <span className="text-sm text-[#8888aa]">{check.label}</span>
                    <div className="flex items-center gap-1.5">
                      {set ? (
                        <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
                      )}
                      <span className={`text-xs font-mono ${set ? 'text-[#4ade80]' : 'text-[#f59e0b]'}`}>
                        {set ? 'configured' : 'missing'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
