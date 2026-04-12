'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink, CheckCircle, Circle } from 'lucide-react'
import { SeverityBadge } from './SeverityBadge'
import { cn } from '@/lib/utils'
import type { Finding } from '@/lib/scanner/types'

interface FindingCardProps {
  finding: Finding
  expandable?: boolean
  onMarkFixed?: (id: string) => void
  className?: string
}

export function FindingCard({ finding, expandable = true, onMarkFixed, className }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'vx-card transition-all duration-200',
        finding.isFixed && 'opacity-60',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn('flex items-start gap-3 p-4', expandable && 'cursor-pointer')}
        onClick={() => expandable && setExpanded(e => !e)}
      >
        <SeverityBadge level={finding.severity} className="mt-0.5 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              'font-heading text-sm font-semibold leading-snug',
              finding.severity === 'CRITICAL' ? 'text-red-400' :
              finding.severity === 'HIGH' ? 'text-amber-400' :
              finding.severity === 'MEDIUM' ? 'text-blue-400' : 'text-[#f0f0ff]'
            )}>
              {finding.name}
            </h4>
            <div className="flex items-center gap-2 shrink-0">
              {finding.cvssScore > 0 && (
                <span className="text-xs text-[#8888aa] font-mono">CVSS {finding.cvssScore.toFixed(1)}</span>
              )}
              {finding.cveIds?.length > 0 && (
                <div className="flex gap-1">
                  {finding.cveIds.slice(0, 2).map(cve => (
                    <a
                      key={cve}
                      href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {cve}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#8888aa]">{finding.category}</span>
            {finding.owaspId && (
              <span className="text-xs text-[#3a3a5c] border border-[#1e1e35] rounded px-1">{finding.owaspId}</span>
            )}
          </div>

          {!expanded && (
            <p className="text-xs text-[#8888aa] mt-1.5 line-clamp-2 leading-relaxed">
              {finding.description}
            </p>
          )}
        </div>

        {expandable && (
          <ChevronDown
            className={cn('h-4 w-4 text-[#8888aa] shrink-0 mt-0.5 transition-transform', expanded && 'rotate-180')}
          />
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#1e1e35] pt-4">
              {/* Description */}
              <div>
                <h5 className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Description</h5>
                <p className="text-sm text-[#f0f0ff] leading-relaxed">{finding.description}</p>
              </div>

              {/* Evidence */}
              {finding.evidence && (
                <div>
                  <h5 className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Evidence</h5>
                  <pre className="terminal text-xs overflow-x-auto whitespace-pre-wrap break-all">{finding.evidence}</pre>
                </div>
              )}

              {/* Impact */}
              <div>
                <h5 className="text-xs font-heading font-semibold text-amber-400/80 uppercase tracking-wider mb-1.5">Impact</h5>
                <p className="text-sm text-[#f0f0ff] leading-relaxed">{finding.impact}</p>
              </div>

              {/* Remediation */}
              <div>
                <h5 className="text-xs font-heading font-semibold text-green-400/80 uppercase tracking-wider mb-1.5">Remediation</h5>
                <p className="text-sm text-[#f0f0ff] leading-relaxed whitespace-pre-line">{finding.remediation}</p>
              </div>

              {/* References */}
              {finding.references?.length > 0 && (
                <div>
                  <h5 className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">References</h5>
                  <div className="flex flex-wrap gap-2">
                    {finding.references.map((ref, i) => (
                      <a
                        key={i}
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(ref).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {onMarkFixed && (
                <button
                  onClick={() => onMarkFixed(finding.id)}
                  className={cn(
                    'flex items-center gap-2 text-xs font-heading font-semibold px-3 py-1.5 rounded border transition-all',
                    finding.isFixed
                      ? 'border-[#1e1e35] text-[#8888aa] hover:border-[#2a2a4a]'
                      : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                  )}
                >
                  {finding.isFixed ? (
                    <><CheckCircle className="h-3.5 w-3.5" /> Marked as Fixed</>
                  ) : (
                    <><Circle className="h-3.5 w-3.5" /> Mark as Fixed</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
