'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Trash2, Loader2, Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'profile' | 'security' | 'notifications' | 'danger'

const profileSchema = z.object({
  name: z.string().min(1).max(80),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [showPw, setShowPw] = useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: session?.user?.name ?? '' },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSave = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/v1/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name }),
      })
      if (!res.ok) throw new Error()
      await update({ name: data.name })
      toast.success('Profile updated')
    } catch {
      toast.error('Could not save profile')
    }
  }

  const onPasswordSave = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Could not change password')
        return
      }
      toast.success('Password changed')
      passwordForm.reset()
    } catch {
      toast.error('Network error')
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-xl font-heading font-bold text-[#f0f0ff]">Settings</h1>
          <p className="text-sm text-[#8888aa] mt-0.5">Manage your account preferences</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="sm:w-44 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0d0d14] border border-[#1e1e35] text-[#f0f0ff]'
                    : 'text-[#8888aa] hover:text-[#f0f0ff]'
                } ${tab.id === 'danger' ? 'text-red-400' : ''}`}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <div className="vx-card p-5">
                <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">Profile Information</p>
                <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      {...profileForm.register('name')}
                      className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      value={session?.user?.email ?? ''}
                      disabled
                      className="w-full px-3 py-2.5 bg-[#050508] border border-[#1e1e35] rounded-lg text-sm text-[#3a3a5c] cursor-not-allowed"
                    />
                    <p className="text-xs text-[#3a3a5c] mt-1">Email cannot be changed</p>
                  </div>
                  <button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 btn-primary rounded-lg font-heading font-semibold text-sm"
                  >
                    {profileForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="vx-card p-5">
                <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-4">Change Password</p>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSave)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        {...passwordForm.register('currentPassword')}
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="w-full px-3 py-2.5 pr-10 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a5c]">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">New Password</label>
                    <input
                      {...passwordForm.register('newPassword')}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-red-400 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[#8888aa] uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input
                      {...passwordForm.register('confirmPassword')}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 bg-[#0d0d14] border border-[#1e1e35] rounded-lg text-sm text-[#f0f0ff] outline-none focus:border-[#4ade80] transition-colors"
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 btn-primary rounded-lg font-heading font-semibold text-sm"
                  >
                    {passwordForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Update Password
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="vx-card p-5 space-y-4">
                <p className="text-sm font-heading font-semibold text-[#f0f0ff]">Notification Preferences</p>
                {[
                  { label: 'Scan completed', desc: 'Email when a scan finishes', key: 'scanComplete' },
                  { label: 'Critical findings', desc: 'Immediate alert for critical vulnerabilities', key: 'critical' },
                  { label: 'Score dropped', desc: 'Alert when your score drops 10+ points', key: 'scoreDrop' },
                  { label: 'Weekly digest', desc: 'Summary of scan activity each week', key: 'weekly' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-[#1e1e35] last:border-0">
                    <div>
                      <p className="text-sm text-[#f0f0ff]">{item.label}</p>
                      <p className="text-xs text-[#3a3a5c]">{item.desc}</p>
                    </div>
                    <button className="w-10 h-6 bg-[#4ade80] rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="vx-card p-5 border-red-500/20">
                <p className="text-sm font-heading font-semibold text-red-400 mb-4">Danger Zone</p>
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-sm font-heading font-semibold text-[#f0f0ff] mb-1">Delete Account</p>
                    <p className="text-xs text-[#8888aa] mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 className="h-4 w-4" />
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
