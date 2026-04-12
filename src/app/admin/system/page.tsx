'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const ENV_CHECKS = [
  { key: 'DATABASE_URL',                       label: 'PostgreSQL Database',    required: true },
  { key: 'NEXTAUTH_SECRET',                    label: 'NextAuth Secret',         required: true },
  { key: 'UPSTASH_REDIS_REST_URL',             label: 'Upstash Redis URL',       required: false },
  { key: 'UPSTASH_REDIS_REST_TOKEN',           label: 'Upstash Redis Token',     required: false },
  { key: 'REDIS_URL',                          label: 'Redis URL (BullMQ)',      required: false },
  { key: 'RESEND_API_KEY',                     label: 'Resend Email',            required: false },
  { key: 'STRIPE_SECRET_KEY',                  label: 'Stripe Secret Key',       required: false },
  { key: 'STRIPE_WEBHOOK_SECRET',              label: 'Stripe Webhook Secret',   required: false },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Public Key',       required: false },
  { key: 'BLOB_READ_WRITE_TOKEN',              label: 'Vercel Blob Storage',     required: false },
  { key: 'GOOGLE_CLIENT_ID',                   label: 'Google OAuth',            required: false },
  { key: 'GITHUB_CLIENT_ID',                   label: 'GitHub OAuth',            required: false },
]

export default function AdminSystemPage() {
  const [cronLoading, setCronLoading] = useState(false)

  const triggerCron = async () => {
    setCronLoading(true)
    try {
      const res = await fetch('/api/cron/scheduled-scans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'dev'}` },
      })
      if (res.ok) toast.success('Cron job triggered successfully')
      else toast.error('Cron job failed')
    } catch {
      toast.error('Failed to trigger cron job')
    } finally {
      setCronLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System</h1>
        <p className="text-sm text-slate-400 mt-1">Environment status and manual controls</p>
      </div>

      <div className="grid gap-6">

        {/* Environment Variables */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a3a' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Environment Variables</h2>
            <RefreshCw className="h-4 w-4 text-slate-500 cursor-pointer hover:text-white" onClick={() => window.location.reload()} />
          </div>
          <div style={{ background: '#080810' }}>
            {ENV_CHECKS.map(({ key, label, required }) => {
              // We can't read process.env from client — check via NEXT_PUBLIC_ prefix
              const isPublic = key.startsWith('NEXT_PUBLIC_')
              const val = isPublic ? (process.env as Record<string,string|undefined>)[key] : undefined
              const isSet = isPublic ? !!val : undefined

              return (
                <div key={key} className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: '#1e1e2e' }}>
                  <div>
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-xs text-slate-600 font-mono ml-2">{key}</span>
                    {required && <span className="text-[10px] text-red-400 ml-2">required</span>}
                  </div>
                  {isSet !== undefined ? (
                    isSet
                      ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    <span className="text-xs text-slate-600 font-mono">server-side</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Manual Controls */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a3a' }}>
          <div className="px-5 py-4 border-b" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Manual Controls</h2>
          </div>
          <div style={{ background: '#080810' }}>
            <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#1e1e2e' }}>
              <div>
                <p className="text-sm text-slate-300">Trigger Scheduled Scans Cron</p>
                <p className="text-xs text-slate-500 mt-0.5">Runs all due scheduled scans immediately</p>
              </div>
              <button
                onClick={triggerCron}
                disabled={cronLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#ef444420', border: '1px solid #ef444440' }}
              >
                {cronLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run Now
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#1e1e2e' }}>
              <div>
                <p className="text-sm text-slate-300">Scan Worker Status</p>
                <p className="text-xs text-slate-500 mt-0.5">Run manually: <code className="text-slate-400">npx tsx src/workers/scanWorker.ts</code></p>
              </div>
              <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded">
                external process
              </span>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a3a' }}>
          <div className="px-5 py-4 border-b" style={{ background: '#0d0d18', borderColor: '#2a2a3a' }}>
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">App Info</h2>
          </div>
          <div style={{ background: '#080810' }}>
            {[
              { label: 'App URL',     value: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' },
              { label: 'Node Env',    value: process.env.NODE_ENV ?? 'development' },
              { label: 'Framework',   value: 'Next.js 14.2 (App Router)' },
              { label: 'Database',    value: 'PostgreSQL via Prisma 5' },
              { label: 'Queue',       value: 'BullMQ + Redis' },
              { label: 'Auth',        value: 'NextAuth v5 (JWT)' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: '#1e1e2e' }}>
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-xs font-mono text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
