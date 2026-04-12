import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export function Logo({ className, size = 'md', href = '/' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-3xl' },
  }
  const s = sizes[size]

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Shield SVG */}
      <svg width={s.icon} height={s.icon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 3L5 9V20C5 28.284 11.716 35.82 20 38C28.284 35.82 35 28.284 35 20V9L20 3Z"
          fill="#0d0d14"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M14 20L18 24L26 16"
          stroke="#4ade80"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 3L5 9V20C5 28.284 11.716 35.82 20 38C28.284 35.82 35 28.284 35 20V9L20 3Z"
          fill="url(#shield-gradient)"
          opacity="0.2"
        />
        <defs>
          <linearGradient id="shield-gradient" x1="20" y1="3" x2="20" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="1" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <span className={cn('font-heading font-bold tracking-wider text-[#f0f0ff]', s.text)}>
        VAULTRIX
      </span>
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}
