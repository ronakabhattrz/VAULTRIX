'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
})
type FormData = z.infer<typeof schema>

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    // In production, this would send via Resend
    console.log('Contact form:', data)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    toast.success('Message sent!')
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Contact Us</h1>
          <p className="text-lg text-[#8888aa]">We&apos;d love to hear from you.</p>
        </div>

        <div className="vx-card p-8">
          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-[#4ade80] mx-auto mb-4" />
              <h2 className="text-lg font-heading font-semibold text-[#f0f0ff] mb-2">Message sent!</h2>
              <p className="text-sm text-[#8888aa]">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Name</label>
                  <input {...register('name')} className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors" />
                  {errors.name && <p className="text-xs text-red-400 mt-1">Required</p>}
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Email</label>
                  <input {...register('email')} type="email" className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors" />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Subject</label>
                <input {...register('subject')} className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Message</label>
                <textarea {...register('message')} rows={5} className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors resize-none" />
                {errors.message && <p className="text-xs text-red-400 mt-1">Please provide a message</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-2.5 rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Message
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
