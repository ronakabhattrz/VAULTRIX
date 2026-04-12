'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Something went wrong')
        return
      }
      setSent(true)
    } catch {
      toast.error('Network error, please try again')
    }
  }

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
          <p className="text-[#8888aa] text-sm mt-2">Reset your password</p>
        </div>

        <div className="vx-card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-[#4ade80]" />
              </div>
              <h2 className="text-[#f0f0ff] font-heading font-semibold text-lg mb-2">Check your inbox</h2>
              <p className="text-[#8888aa] text-sm leading-relaxed mb-6">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-[#f0f0ff]">{getValues('email')}</span>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-[#3a3a5c]">
                Didn&apos;t receive it? Check spam or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-[#4ade80] hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#8888aa] text-sm mb-6">
                Enter the email address for your account and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                    placeholder="you@company.com"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-xs text-[#8888aa] hover:text-[#4ade80] flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
