'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

interface DataPoint {
  date: string
  score: number
}

interface ScoreTrendChartProps {
  data: DataPoint[]
  domain?: string
  height?: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value ?? 0
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="bg-[#111120] border border-[#1e1e35] rounded p-2.5 text-xs">
      <div className="text-[#8888aa] mb-1">{label}</div>
      <div className="font-heading font-bold" style={{ color }}>{score}/100</div>
    </div>
  )
}

export function ScoreTrendChart({ data, domain, height = 200 }: ScoreTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[#8888aa]">
        No scan history yet
      </div>
    )
  }

  const formatted = data.map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
        <XAxis dataKey="date" tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#4ade80"
          strokeWidth={2}
          dot={{ fill: '#4ade80', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#4ade80' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
