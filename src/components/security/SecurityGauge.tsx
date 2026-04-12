'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SecurityGaugeProps {
  score: number
  grade: string
  size?: number
  showLabel?: boolean
  className?: string
}

function getGradeColor(score: number): string {
  if (score >= 90) return '#4ade80'
  if (score >= 80) return '#86efac'
  if (score >= 70) return '#f59e0b'
  if (score >= 60) return '#f97316'
  return '#ef4444'
}

export function SecurityGauge({ score, grade, size = 150, showLabel = true, className }: SecurityGaugeProps) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  // Use 270 degrees (3/4 circle)
  const arcLength = circumference * 0.75
  const strokeDashoffset = useMotionValue(arcLength)
  const color = getGradeColor(score)

  useEffect(() => {
    const targetOffset = arcLength - (score / 100) * arcLength
    animate(strokeDashoffset, targetOffset, { duration: 1.2, ease: 'easeOut' })
  }, [score, arcLength, strokeDashoffset])

  const cx = size / 2
  const cy = size / 2

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        {/* Background arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#1e1e35"
          strokeWidth={size > 100 ? 10 : 7}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={size > 100 ? 10 : 7}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>

      {/* Center text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: 'none' }}
      >
        <span
          className="font-heading font-bold leading-none"
          style={{ fontSize: size * 0.22, color }}
        >
          {score}
        </span>
        {showLabel && (
          <span
            className="font-heading font-bold leading-none mt-0.5"
            style={{ fontSize: size * 0.13, color }}
          >
            {grade}
          </span>
        )}
      </div>
    </div>
  )
}
