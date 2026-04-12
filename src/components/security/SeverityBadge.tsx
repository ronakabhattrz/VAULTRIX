import { cn } from '@/lib/utils'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

interface SeverityBadgeProps {
  level: Severity
  className?: string
  size?: 'sm' | 'md'
}

const SEVERITY_CONFIG: Record<Severity, { label: string; classes: string }> = {
  CRITICAL: { label: 'CRITICAL', classes: 'bg-red-500/10 text-red-400 border-red-500/30' },
  HIGH:     { label: 'HIGH',     classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  MEDIUM:   { label: 'MEDIUM',   classes: 'bg-blue-400/10 text-blue-400 border-blue-400/30' },
  LOW:      { label: 'LOW',      classes: 'bg-[#8888aa]/10 text-[#8888aa] border-[#8888aa]/30' },
  INFO:     { label: 'INFO',     classes: 'bg-[#8888aa]/8 text-[#8888aa] border-[#8888aa]/20' },
}

export function SeverityBadge({ level, className, size = 'md' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[level]
  return (
    <span
      className={cn(
        'inline-flex items-center border font-heading font-semibold tracking-wide uppercase',
        size === 'md' ? 'px-2 py-0.5 text-xs rounded' : 'px-1.5 py-0 text-[10px] rounded',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
