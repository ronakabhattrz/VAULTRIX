'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

type State = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        if (res.ok) {
          setState('success')
          setTimeout(() => router.push('/dashboard'), 2500)
        } else {
          const json = await res.json().catch(() => ({}))
          setMessage(json.error ?? 'Verification failed')
          setState('error')
        }
      })
      .catch(() => {
        setMessage('Network error')
        setState('error')
      })
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050508' }}>
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <Logo size="md" href="/" className="justify-center" />
        </div>

        <div className="vx-card p-10">
          {state === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-[#4ade80] mx-auto mb-4" />
              <p className="text-[#f0f0ff] font-heading font-semibold text-lg">Verifying your email…</p>
              <p className="text-[#8888aa] text-sm mt-2">This will only take a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-[#4ade80]" />
              </div>
              <p className="text-[#f0f0ff] font-heading font-semibold text-lg">Email verified!</p>
              <p className="text-[#8888aa] text-sm mt-2">Redirecting you to the dashboard…</p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-[#f0f0ff] font-heading font-semibold text-lg">Verification failed</p>
              <p className="text-[#8888aa] text-sm mt-2 mb-6">{message || 'The link may have expired or already been used.'}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm"
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
