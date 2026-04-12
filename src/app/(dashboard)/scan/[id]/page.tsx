'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Shield, Share2, Download, RefreshCw, ChevronDown, ChevronRight, Loader2,
  Globe, Server, Lock, Code2, Wifi, Mail, KeyRound, FileText, CheckSquare,
  AlertTriangle
} from 'lucide-react'
import { SecurityGauge } from '@/components/security/SecurityGauge'
import { SeverityBadge } from '@/components/security/SeverityBadge'
import { FindingCard } from '@/components/security/FindingCard'
import { toast } from 'sonner'

const CATEGORIES = [
  { key: 'headers', label: 'Headers', icon: Globe },
  { key: 'ssl', label: 'SSL/TLS', icon: Lock },
  { key: 'dns', label: 'DNS', icon: Server },
  { key: 'ports', label: 'Ports', icon: Wifi },
  { key: 'webapp', label: 'Web App', icon: Code2 },
  { key: 'cookies', label: 'Cookies', icon: KeyRound },
  { key: 'cors', label: 'CORS', icon: Globe },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'auth', label: 'Auth', icon: KeyRound },
  { key: 'api', label: 'API', icon: Code2 },
  { key: 'content', label: 'Content', icon: FileText },
  { key: 'performance', label: 'Performance', icon: RefreshCw },
  { key: 'compliance', label: 'Compliance', icon: CheckSquare },
]

const COMPLIANCE_FRAMEWORKS = ['OWASP_TOP10_2021', 'PCI_DSS_4', 'GDPR', 'HIPAA', 'NIST_CSF', 'ISO_27001']

const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const

function ScoreBand({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8888aa]">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export default function ScanResultPage() {
  const params = useParams()
  const scanId = params.id as string
  const [activeTab, setActiveTab] = useState<'findings' | 'compliance' | 'tech'>('findings')
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_FILTERS[number]>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sharing, setSharing] = useState(false)

  const { data: scan, isLoading, error } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/scan/${scanId}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
  })

  const handleShare = async () => {
    setSharing(true)
    try {
      const res = await fetch(`/api/v1/scan/${scanId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { shareUrl } = await res.json()
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    } catch {
      toast.error('Could not create share link')
    } finally {
      setSharing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#4ade80]" />
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-[#f0f0ff] font-heading font-semibold">Scan not found</p>
        <p className="text-[#8888aa] text-sm mt-1">This scan may have been deleted or doesn&apos;t exist.</p>
      </div>
    )
  }

  const findings = scan.findings ?? []
  const filteredFindings = findings.filter((f: { severity: Severity; category: string }) => {
    const sev = severityFilter === 'ALL' || f.severity === severityFilter
    const cat = categoryFilter === 'ALL' || f.category === categoryFilter
    return sev && cat
  })

  const severityCounts = findings.reduce((acc: Record<string, number>, f: { severity: string }) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const gradeColor = scan.score >= 80 ? '#4ade80' : scan.score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6"
      >
        <div className="min-w-0">
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff] truncate">
            {scan.url.replace(/^https?:\/\//, '')}
          </h1>
          <p className="text-xs text-[#8888aa] mt-1 font-mono">{scan.url}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-3 py-2 border border-[#1e1e35] rounded-lg text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share
          </button>
          <a
            href={`/api/v1/scan/${scanId}/pdf`}
            className="flex items-center gap-2 px-3 py-2 border border-[#1e1e35] rounded-lg text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors"
          >
            <Download className="h-4 w-4" />
            PDF
          </a>
        </div>
      </motion.div>

      {/* Score + Category scores */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="vx-card p-6 flex flex-col items-center justify-center">
          <SecurityGauge score={scan.score ?? 0} grade={scan.grade ?? '?'} size={160} />
          <div className="mt-3 text-center">
            <p className="text-xs text-[#8888aa]">Security Grade</p>
            <p className="text-3xl font-heading font-bold mt-1" style={{ color: gradeColor }}>{scan.grade ?? '?'}</p>
          </div>
        </div>

        <div className="lg:col-span-2 vx-card p-5">
          <p className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-4">Category Scores</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {(scan.categoryScores ?? []).map((cs: { category: string; score: number }) => {
              const cat = CATEGORIES.find(c => c.key === cs.category.toLowerCase())
              const col = cs.score >= 80 ? '#4ade80' : cs.score >= 60 ? '#f59e0b' : '#ef4444'
              return <ScoreBand key={cs.category} label={cat?.label ?? cs.category} score={cs.score} color={col} />
            })}
          </div>
        </div>
      </div>

      {/* Finding counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]).map(s => (
          <button
            key={s}
            onClick={() => setSeverityFilter(v => v === s ? 'ALL' : s)}
            className={`vx-card p-4 text-center transition-all ${severityFilter === s ? 'ring-1 ring-[#4ade80]/40' : ''}`}
          >
            <p className={`text-2xl font-heading font-bold severity-${s.toLowerCase()}`}>
              {severityCounts[s] ?? 0}
            </p>
            <p className="text-[10px] text-[#3a3a5c] mt-0.5 font-heading uppercase tracking-wider">{s}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0d0d14] rounded-lg border border-[#1e1e35] mb-6 w-fit">
        {(['findings', 'compliance', 'tech'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-[#1e1e35] text-[#f0f0ff]'
                : 'text-[#3a3a5c] hover:text-[#8888aa]'
            }`}
          >
            {tab === 'findings' ? 'Findings' : tab === 'compliance' ? 'Compliance' : 'Tech Stack'}
          </button>
        ))}
      </div>

      {/* Findings tab */}
      {activeTab === 'findings' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-1 flex-wrap">
              {SEVERITY_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2.5 py-1 rounded text-[10px] font-heading font-semibold uppercase tracking-wider border transition-all ${
                    severityFilter === s
                      ? 'bg-[#1e1e35] border-[#2a2a4a] text-[#f0f0ff]'
                      : 'border-[#1e1e35] text-[#3a3a5c] hover:text-[#8888aa]'
                  }`}
                >
                  {s}{s !== 'ALL' && severityCounts[s] ? ` (${severityCounts[s]})` : ''}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-[#1e1e35] bg-[#0d0d14] text-[10px] font-heading font-semibold uppercase tracking-wider text-[#8888aa] outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key.toUpperCase()}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            {filteredFindings.length === 0 ? (
              <div className="vx-card p-8 text-center">
                <Shield className="h-8 w-8 text-[#4ade80] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[#3a3a5c]">No findings match the current filters</p>
              </div>
            ) : (
              filteredFindings.map((f: { id: string; severity: Severity; title?: string; name?: string; category: string; description?: string; evidence?: string; impact?: string; remediation?: string; references?: string[]; cvss?: number; cvssScore?: number; cve?: string; cveIds?: string[] }) => {
                const finding = {
                  id: f.id,
                  severity: f.severity,
                  name: f.name ?? f.title ?? 'Unnamed finding',
                  category: f.category,
                  description: f.description ?? '',
                  evidence: f.evidence ?? '',
                  impact: f.impact ?? '',
                  remediation: f.remediation ?? '',
                  references: f.references ?? [],
                  cvssScore: f.cvssScore ?? f.cvss ?? 0,
                  cveIds: f.cveIds ?? (f.cve ? [f.cve] : []),
                }
                return <FindingCard key={finding.id} finding={finding} />
              })
            )}
          </div>
        </div>
      )}

      {/* Compliance tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {COMPLIANCE_FRAMEWORKS.map(fw => {
            const result = (scan.complianceResults ?? []).find(
              (r: { framework: string }) => r.framework === fw
            )
            if (!result) return null
            const pct = Math.round((result.passedControls / result.totalControls) * 100)
            const col = pct >= 80 ? '#4ade80' : pct >= 60 ? '#f59e0b' : '#ef4444'

            return (
              <div key={fw} className="vx-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-heading font-semibold text-[#f0f0ff]">{fw.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[#8888aa] mt-0.5">
                      {result.passedControls} / {result.totalControls} controls passed
                    </p>
                  </div>
                  <span className="text-2xl font-heading font-bold" style={{ color: col }}>{pct}%</span>
                </div>
                <div className="h-2 bg-[#1e1e35] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
                </div>
                {result.failedControls?.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-[#8888aa] cursor-pointer hover:text-[#f0f0ff] flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      {result.failedControls.length} failed control{result.failedControls.length > 1 ? 's' : ''}
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {result.failedControls.map((ctrl: string) => (
                        <li key={ctrl} className="text-xs text-red-400 pl-4">• {ctrl}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )
          })}
          {!(scan.complianceResults ?? []).length && (
            <div className="vx-card p-8 text-center text-[#3a3a5c] text-sm">
              Compliance scan requires PRO plan or higher
            </div>
          )}
        </div>
      )}

      {/* Tech stack tab */}
      {activeTab === 'tech' && (
        <div className="vx-card p-5">
          {scan.techStack ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(scan.techStack as Record<string, string | string[]>).map(([k, v]) => {
                if (!v || (Array.isArray(v) && v.length === 0)) return null
                return (
                  <div key={k} className="flex flex-col gap-1">
                    <span className="text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">{k}</span>
                    <span className="text-sm text-[#f0f0ff] font-mono">
                      {Array.isArray(v) ? v.join(', ') : String(v)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#3a3a5c] text-center py-4">No tech stack data available</p>
          )}
        </div>
      )}
    </div>
  )
}
