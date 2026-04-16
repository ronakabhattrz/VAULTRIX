'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, GitBranch, Globe2 } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [showPw, setShowPw] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const res = await signIn('credentials', { ...data, redirect: false })
    if (res?.error) {
      toast.error('Invalid email or password')
      return
    }
    router.push(callbackUrl)
  }

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider)
    await signIn(provider, { callbackUrl })
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
          <p className="text-[#8888aa] text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="vx-card p-8">
          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors disabled:opacity-50">
              {oauthLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
              Google
            </button>
            <button onClick={() => handleOAuth('github')} disabled={!!oauthLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] hover:border-[#2a2a4a] transition-colors disabled:opacity-50">
              {oauthLoading === 'github' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#1e1e35]" />
            <span className="text-xs text-[#3a3a5c]">or continue with email</span>
            <div className="flex-1 h-px bg-[#1e1e35]" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Email</label>
              <input {...register('email')} type="email" autoComplete="email"
                className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                placeholder="you@company.com" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-[#4ade80] hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a5c] hover:text-[#8888aa]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-xs text-[#8888aa] mt-6">
            No account? <Link href="/auth/register" className="text-[#4ade80] hover:underline">Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
