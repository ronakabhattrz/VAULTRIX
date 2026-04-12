'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, GitBranch, Globe2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'

const schema = z.object({
  name: z.string().min(1, 'Name required').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'One uppercase letter')
    .regex(/[0-9]/, 'One number'),
  terms: z.literal(true, { error: 'You must accept the terms' }),
})
type FormData = z.infer<typeof schema>

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  const barColor = score === 0 ? '#1e1e35' : score === 1 ? '#ef4444' : score === 2 ? '#f59e0b' : '#4ade80'
  return (
    <div className="mt-2">
      <div className="h-1 bg-[#1e1e35] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(score / 3) * 100}%`, background: barColor }} />
      </div>
      <div className="flex gap-3 mt-1.5">
        {checks.map(c => (
          <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.pass ? 'text-[#4ade80]' : 'text-[#3a3a5c]'}`}>
            <CheckCircle className="h-2.5 w-2.5" />{c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const password = watch('password', '')

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Registration failed')
      return
    }
    await signIn('credentials', { email: data.email, password: data.password, redirect: false })
    router.push('/dashboard')
  }

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#050508' }}>
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="text-center mb-8">
          <Logo size="md" href="/" className="justify-center" />
          <p className="text-[#8888aa] text-sm mt-2">Create your free account</p>
        </div>

        <div className="vx-card p-8">
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
            <div className="flex-1 h-px bg-[#1e1e35]" /><span className="text-xs text-[#3a3a5c]">or</span><div className="flex-1 h-px bg-[#1e1e35]" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Full Name</label>
              <input {...register('name')} type="text" autoComplete="name"
                className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                placeholder="Jane Smith" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Email</label>
              <input {...register('email')} type="email" autoComplete="email"
                className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                placeholder="you@company.com" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors placeholder:text-[#3a3a5c]"
                  placeholder="Create a strong password" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a5c] hover:text-[#8888aa]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input {...register('terms')} type="checkbox" className="mt-0.5 accent-green-400" />
              <span className="text-xs text-[#8888aa] leading-relaxed">
                I agree to the <Link href="/terms" className="text-[#4ade80] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#4ade80] hover:underline">Privacy Policy</Link>. I will only scan websites I own or have explicit permission to test.
              </span>
            </label>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms.message}</p>}

            <button type="submit" disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-xs text-[#8888aa] mt-6">
            Already have an account? <Link href="/auth/login" className="text-[#4ade80] hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
