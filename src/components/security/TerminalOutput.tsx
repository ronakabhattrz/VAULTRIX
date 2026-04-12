'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface TerminalOutputProps {
  lines: string[]
  typewriter?: boolean
  className?: string
  maxHeight?: number
}

export function TerminalOutput({ lines, typewriter = false, className, maxHeight = 300 }: TerminalOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [displayedLines, setDisplayedLines] = useState<string[]>(typewriter ? [] : lines)
  const [currentLine, setCurrentLine] = useState('')
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)

  useEffect(() => {
    if (!typewriter) {
      setDisplayedLines(lines)
      return
    }
    if (lineIdx >= lines.length) return

    const line = lines[lineIdx]
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setCurrentLine(prev => prev + line[charIdx])
        setCharIdx(c => c + 1)
      }, 12)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        setDisplayedLines(prev => [...prev, line])
        setCurrentLine('')
        setCharIdx(0)
        setLineIdx(i => i + 1)
      }, 60)
      return () => clearTimeout(t)
    }
  }, [lines, typewriter, lineIdx, charIdx])

  useEffect(() => {
    if (!typewriter) setDisplayedLines(lines)
  }, [lines, typewriter])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedLines, currentLine])

  const getLineColor = (line: string) => {
    if (line.startsWith('[!]') || line.includes('CRITICAL') || line.includes('ERROR')) return 'text-red-400'
    if (line.startsWith('[+]') || line.includes('complete') || line.includes('COMPLETE')) return 'text-green-400'
    if (line.includes('WARN') || line.includes('HIGH') || line.includes('WARNING')) return 'text-amber-400'
    if (line.startsWith('[*]') || line.includes('INFO')) return 'text-blue-400'
    return 'text-[#8888aa]'
  }

  return (
    <div
      className={cn('terminal overflow-y-auto', className)}
      style={{ maxHeight }}
    >
      {displayedLines.map((line, i) => (
        <div key={i} className={cn('text-xs leading-6', getLineColor(line))}>
          <span className="text-[#3a3a5c] select-none">{'>'} </span>
          {line}
        </div>
      ))}
      {currentLine && (
        <div className={cn('text-xs leading-6', getLineColor(currentLine))}>
          <span className="text-[#3a3a5c] select-none">{'>'} </span>
          {currentLine}
          <span className="cursor-blink" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
