'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, X } from 'lucide-react'
import { ScanProgress } from '@/components/security/ScanProgress'
import { toast } from 'sonner'

export default function ScanRunningPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.id as string
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    // Poll for completion fallback
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/scan/${scanId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'COMPLETED') {
          clearInterval(interval)
          router.push(`/scan/${scanId}`)
        } else if (data.status === 'FAILED') {
          clearInterval(interval)
          toast.error('Scan failed')
          router.push('/dashboard')
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [scanId, router])

  const handleCancel = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      await fetch(`/api/v1/scan/${scanId}`, { method: 'DELETE' })
      router.push('/dashboard')
    } catch {
      toast.error('Could not cancel scan')
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-start p-4 lg:p-8">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Radar animation header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-[#4ade80]/30"
                initial={{ width: 40, height: 40, opacity: 0.8 }}
                animate={{ width: 80 + i * 30, height: 80 + i * 30, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
              />
            ))}
            <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#4ade80]" />
            </div>
          </div>
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Scanning in progress…</h1>
          <p className="text-sm text-[#8888aa] mt-1">Do not close this tab. You&apos;ll be redirected when complete.</p>
        </div>

        {/* Progress component */}
        <ScanProgress scanId={scanId} onComplete={() => router.push(`/scan/${scanId}`)} />

        {/* Cancel */}
        <div className="text-center mt-6">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 text-xs text-[#3a3a5c] hover:text-red-400 transition-colors mx-auto"
          >
            <X className="h-3.5 w-3.5" />
            {cancelling ? 'Cancelling…' : 'Cancel scan'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
