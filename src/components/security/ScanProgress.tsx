'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Circle, SkipForward } from 'lucide-react'
import { TerminalOutput } from './TerminalOutput'
import { cn } from '@/lib/utils'
import type { ScanEmitEvent } from '@/lib/scanner/types'

type ModuleStatus = 'queued' | 'running' | 'complete' | 'failed' | 'skipped'

interface ModuleState {
  name: string
  status: ModuleStatus
  findingsCount?: number
  duration?: number
}

interface ScanProgressProps {
  scanId: string
  onComplete?: (data: { score: number; grade: string; pdfUrl?: string }) => void
  onFailed?: (error: string) => void
}

const MODULE_LABELS: Record<string, string> = {
  headers: 'HTTP Security Headers',
  ssl: 'SSL/TLS Certificate',
  cookies: 'Cookie Security',
  dns: 'DNS Configuration',
  ports: 'Open Port Scan',
  content: 'Technology Fingerprinting',
  performance: 'Performance & Compression',
  webapp: 'Web Application Security',
  cors: 'CORS Configuration',
  email: 'Email Security (SPF/DKIM/DMARC)',
  auth: 'Authentication Security',
  api: 'API Exposure Check',
  compliance: 'Compliance Mapping',
}

export function ScanProgress({ scanId, onComplete, onFailed }: ScanProgressProps) {
  const [modules, setModules] = useState<ModuleState[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 0, estimatedSeconds: 0 })
  const [status, setStatus] = useState<'connecting' | 'running' | 'complete' | 'failed'>('connecting')

  const updateModule = useCallback((name: string, update: Partial<ModuleState>) => {
    setModules(prev => {
      const idx = prev.findIndex(m => m.name === name)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], ...update }
      return next
    })
  }, [])

  useEffect(() => {
    const es = new EventSource(`/api/v1/scan/${scanId}/stream`)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ScanEmitEvent

        switch (event.event) {
          case 'started':
            setStatus('running')
            setModules(event.modules.map(name => ({ name, status: 'queued' })))
            setProgress({ completed: 0, total: event.modules.length, estimatedSeconds: 45 })
            break

          case 'module':
            updateModule(event.name, {
              status: event.status as ModuleStatus,
              findingsCount: event.findingsCount,
              duration: event.duration,
            })
            break

          case 'log':
            if (event.message) setLogs(prev => [...prev.slice(-199), event.message])
            break

          case 'progress':
            setProgress({ completed: event.completed, total: event.total, estimatedSeconds: event.estimatedSeconds ?? 0 })
            break

          case 'complete':
            setStatus('complete')
            onComplete?.({ score: event.score, grade: event.grade, pdfUrl: event.pdfUrl })
            es.close()
            break

          case 'failed':
            setStatus('failed')
            onFailed?.(event.error)
            es.close()
            break
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [scanId, onComplete, onFailed, updateModule])

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-[#8888aa] mb-2">
          <span>{progress.completed}/{progress.total} modules complete</span>
          {progress.estimatedSeconds > 0 && status === 'running' && (
            <span>~{progress.estimatedSeconds}s remaining</span>
          )}
        </div>
        <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#4ade80] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Module list */}
      <div className="grid grid-cols-1 gap-1.5">
        {modules.map((mod) => (
          <div
            key={mod.name}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded border transition-colors',
              mod.status === 'running' ? 'border-green-500/30 bg-green-500/5' :
              mod.status === 'complete' ? 'border-[#1e1e35] bg-[#111120]/50' :
              mod.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
              'border-[#1e1e35] bg-transparent'
            )}
          >
            <div className="shrink-0">
              {mod.status === 'running' && <Loader2 className="h-4 w-4 text-green-400 animate-spin" />}
              {mod.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-400" />}
              {mod.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
              {mod.status === 'skipped' && <SkipForward className="h-4 w-4 text-[#3a3a5c]" />}
              {mod.status === 'queued' && <Circle className="h-4 w-4 text-[#3a3a5c]" />}
            </div>

            <span className={cn(
              'text-sm flex-1',
              mod.status === 'running' ? 'text-green-400 font-heading font-medium' :
              mod.status === 'complete' ? 'text-[#f0f0ff]' :
              mod.status === 'failed' ? 'text-red-400' :
              'text-[#3a3a5c]'
            )}>
              {MODULE_LABELS[mod.name] ?? mod.name}
            </span>

            {mod.status === 'complete' && mod.findingsCount !== undefined && (
              <span className="text-xs text-[#8888aa]">
                {mod.findingsCount} finding{mod.findingsCount !== 1 ? 's' : ''}
              </span>
            )}
            {mod.duration && (
              <span className="text-xs text-[#3a3a5c]">{mod.duration}ms</span>
            )}
          </div>
        ))}
      </div>

      {/* Terminal log */}
      {logs.length > 0 && (
        <TerminalOutput lines={logs} maxHeight={200} />
      )}
    </div>
  )
}
