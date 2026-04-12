'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

function MagicLinkContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="vx-card p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-4">
        <Mail className="h-7 w-7 text-[#4ade80]" />
      </div>
      <h1 className="text-[#f0f0ff] font-heading font-semibold text-xl mb-2">Check your email</h1>
      <p className="text-[#8888aa] text-sm leading-relaxed mb-1">
        We&apos;ve sent a magic sign-in link to
      </p>
      {email && (
        <p className="text-[#f0f0ff] font-mono text-sm mb-4">{email}</p>
      )}
      <p className="text-[#8888aa] text-sm leading-relaxed mb-6">
        Click the link in the email to sign in. The link expires in 24 hours and can only be used once.
      </p>

      <div className="p-4 bg-[#0d0d14] rounded-lg border border-[#1e1e35] text-left mb-6">
        <p className="text-xs text-[#8888aa] font-heading font-semibold uppercase tracking-wider mb-2">Didn&apos;t receive it?</p>
        <ul className="text-xs text-[#3a3a5c] space-y-1">
          <li>• Check your spam or junk folder</li>
          <li>• Make sure the email address is correct</li>
          <li>• The email may take a minute to arrive</li>
        </ul>
      </div>

      <Link
        href="/auth/login"
        className="text-xs text-[#8888aa] hover:text-[#4ade80] flex items-center justify-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to sign in
      </Link>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050508' }}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <Logo size="md" href="/" className="justify-center" />
          <p className="text-[#8888aa] text-sm mt-2">Magic link sent</p>
        </div>
        <Suspense fallback={<div className="vx-card p-10" />}>
          <MagicLinkContent />
        </Suspense>
      </motion.div>
    </div>
  )
}
