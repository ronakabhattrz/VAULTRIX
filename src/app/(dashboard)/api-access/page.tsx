'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Code2, Copy, Eye, EyeOff, RefreshCw, Plus, Trash2, Loader2, Webhook, BookOpen, Terminal } from 'lucide-react'
import { toast } from 'sonner'

type ApiTab = 'keys' | 'docs' | 'webhooks'

const CODE_EXAMPLE = `curl -X POST https://vaultrix.io/api/v1/scan \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"target": "https://example.com", "profile": "standard"}'`

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/scan', desc: 'Start a new security scan' },
  { method: 'GET', path: '/api/v1/scan/:id', desc: 'Get scan details and findings' },
  { method: 'DELETE', path: '/api/v1/scan/:id', desc: 'Cancel or delete a scan' },
  { method: 'GET', path: '/api/v1/scan/:id/stream', desc: 'SSE stream for real-time progress' },
  { method: 'POST', path: '/api/v1/scan/:id/share', desc: 'Create a public share link' },
  { method: 'GET', path: '/api/v1/scans', desc: 'List all scans (paginated)' },
  { method: 'GET', path: '/api/v1/user/me', desc: 'Get authenticated user profile' },
  { method: 'PATCH', path: '/api/v1/user/me', desc: 'Update user profile' },
]

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-[#4ade80]',
  POST: 'text-[#60a5fa]',
  DELETE: 'text-red-400',
  PATCH: 'text-[#f59e0b]',
}

export default function ApiAccessPage() {
  const [activeTab, setActiveTab] = useState<ApiTab>('keys')
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [webhookUrl, setWebhookUrl] = useState('')
  const qc = useQueryClient()

  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await fetch('/api/v1/user/me')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const apiKey = userData?.apiKey ?? null

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateApiKey: true }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-me'] })
      toast.success('API key regenerated')
    },
    onError: () => toast.error('Could not regenerate key'),
  })

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success('Copied to clipboard')
  }

  const addWebhook = async () => {
    if (!webhookUrl) return
    try {
      new URL(webhookUrl)
    } catch {
      toast.error('Enter a valid URL')
      return
    }
    toast.success('Webhook added (demo)')
    setWebhookUrl('')
  }

  const tabs: { id: ApiTab; label: string; icon: React.ElementType }[] = [
    { id: 'keys', label: 'API Keys', icon: Code2 },
    { id: 'docs', label: 'Docs', icon: BookOpen },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">API Access</h1>
          <p className="text-sm text-[#8888aa] mt-0.5">Manage API keys, view docs, configure webhooks</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0d0d14] rounded-lg border border-[#1e1e35] mb-6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab.id ? 'bg-[#1e1e35] text-[#f0f0ff]' : 'text-[#3a3a5c] hover:text-[#8888aa]'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* API Keys tab */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="vx-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Your API Key</p>
                <button
                  onClick={() => generateKeyMutation.mutate()}
                  disabled={generateKeyMutation.isPending}
                  className="flex items-center gap-1.5 text-xs text-[#8888aa] hover:text-[#f0f0ff] transition-colors"
                >
                  {generateKeyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </button>
              </div>
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm font-mono text-[#f0f0ff] truncate">
                    {showKey['main'] ? apiKey : `vx_live_${'•'.repeat(32)}`}
                  </code>
                  <button
                    onClick={() => setShowKey(s => ({ ...s, main: !s.main }))}
                    className="p-2 text-[#3a3a5c] hover:text-[#8888aa]"
                  >
                    {showKey['main'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => copyKey(apiKey)}
                    className="p-2 text-[#3a3a5c] hover:text-[#4ade80]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => generateKeyMutation.mutate()}
                  disabled={generateKeyMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-[#1e1e35] rounded-lg text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors"
                >
                  {generateKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate API Key
                </button>
              )}
              <p className="text-xs text-[#3a3a5c] mt-3">
                Keep your API key secret. Treat it like a password. If compromised, regenerate immediately.
              </p>
            </div>

            <div className="vx-card p-5">
              <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-3">Quick Start</p>
              <div className="relative">
                <pre className="terminal text-xs overflow-x-auto">{CODE_EXAMPLE}</pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(CODE_EXAMPLE); toast.success('Copied') }}
                  className="absolute top-2 right-2 p-1.5 rounded text-[#3a3a5c] hover:text-[#8888aa] hover:bg-[#1e1e35] transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Docs tab */}
        {activeTab === 'docs' && (
          <div className="vx-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e35]">
              <p className="text-sm font-heading font-semibold text-[#f0f0ff]">REST API Reference</p>
              <p className="text-xs text-[#8888aa] mt-1">Base URL: <code className="font-mono text-[#4ade80]">https://vaultrix.io</code></p>
            </div>
            <div className="divide-y divide-[#1e1e35]">
              {ENDPOINTS.map((ep, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <code className={`text-xs font-mono font-bold w-14 flex-shrink-0 ${METHOD_COLORS[ep.method] ?? 'text-[#8888aa]'}`}>
                    {ep.method}
                  </code>
                  <code className="text-xs font-mono text-[#f0f0ff] flex-1">{ep.path}</code>
                  <span className="text-xs text-[#8888aa]">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Webhooks tab */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4">
            <div className="vx-card p-5">
              <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">Add Webhook Endpoint</p>
              <div className="flex gap-2">
                <input
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.example.com/vaultrix"
                  className="flex-1 px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                />
                <button
                  onClick={addWebhook}
                  className="btn-primary px-4 py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <p className="text-xs text-[#3a3a5c] mt-3">
                Receive POST notifications when scans complete, fail, or when critical findings are detected.
              </p>
            </div>

            <div className="vx-card p-5">
              <div className="flex items-center gap-3 text-[#3a3a5c]">
                <Terminal className="h-5 w-5" />
                <p className="text-sm">No webhooks configured yet</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
