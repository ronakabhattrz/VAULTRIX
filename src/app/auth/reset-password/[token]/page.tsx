'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'

const schema = z.object({
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[0-9]/, 'One number'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Reset failed')
        return
      }
      setDone(true)
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
          <p className="text-[#8888aa] text-sm mt-2">Set a new password</p>
        </div>

        <div className="vx-card p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-[#4ade80]" />
              </div>
              <h2 className="text-[#f0f0ff] font-heading font-semibold text-lg mb-2">Password updated!</h2>
              <p className="text-[#8888aa] text-sm mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm"
              >
                Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a5c] hover:text-[#8888aa]"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <input
                  {...register('confirm')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  placeholder="Repeat your password"
                />
                {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password
              </button>
            </form>
          )}

          {!done && (
            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-xs text-[#8888aa] hover:text-[#4ade80] flex items-center justify-center gap-1 transition-colors">
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
