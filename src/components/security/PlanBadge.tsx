import { cn } from '@/lib/utils'

type Plan = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'ENTERPRISE'

const PLAN_CONFIG: Record<Plan, { label: string; classes: string }> = {
  FREE:       { label: 'FREE',       classes: 'bg-[#8888aa]/10 text-[#8888aa] border-[#8888aa]/30' },
  STARTER:    { label: 'STARTER',    classes: 'bg-blue-400/10 text-blue-400 border-blue-400/30' },
  PRO:        { label: 'PRO',        classes: 'bg-purple-400/10 text-purple-400 border-purple-400/30' },
  AGENCY:     { label: 'AGENCY',     classes: 'bg-amber-400/10 text-amber-400 border-amber-400/30' },
  ENTERPRISE: { label: 'ENTERPRISE', classes: 'bg-green-400/10 text-green-400 border-green-400/30' },
}

export function PlanBadge({ plan, className }: { plan: string; className?: string }) {
  const config = PLAN_CONFIG[(plan as Plan)] ?? PLAN_CONFIG.FREE
  return (
    <span className={cn('inline-flex items-center border font-heading font-semibold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded', config.classes, className)}>
      {config.label}
    </span>
  )
}
