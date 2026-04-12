'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Shield, FileText, Calendar, Code2, Users, Briefcase,
  CreditCard, Settings, LogOut, Menu, X, Bell, ChevronDown, Zap,
  AlertTriangle, Crown
} from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { PlanBadge } from '@/components/security/PlanBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/scan/new', icon: Shield, label: 'New Scan' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/scheduled', icon: Calendar, label: 'Scheduled' },
  { href: '/api-access', icon: Code2, label: 'API Access' },
]

const teamItems = [
  { href: '/team', icon: Users, label: 'Team', plans: ['AGENCY', 'ENTERPRISE'] },
  { href: '/clients', icon: Briefcase, label: 'Clients', plans: ['AGENCY', 'ENTERPRISE'] },
]

const accountItems = [
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({
  href, icon: Icon, label, active, locked
}: {
  href: string; icon: React.ElementType; label: string; active: boolean; locked?: boolean
}) {
  return (
    <Link
      href={locked ? '/billing' : href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
        active
          ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20'
          : 'text-[#8888aa] hover:text-[#f0f0ff] hover:bg-[#0d0d14]',
        locked && 'opacity-50'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {locked && <Crown className="h-3 w-3 text-[#f59e0b]" />}
    </Link>
  )
}

function ScanCreditsBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const isUnlimited = limit === -1
  const isLow = !isUnlimited && pct > 80

  return (
    <div className="px-3 py-3 border border-[#1e1e35] rounded-lg bg-[#0d0d14]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[#8888aa]">Scans this month</span>
        {isLow && <AlertTriangle className="h-3 w-3 text-[#f59e0b]" />}
      </div>
      {isUnlimited ? (
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#4ade80]" />
          <span className="text-xs text-[#4ade80] font-mono">Unlimited</span>
        </div>
      ) : (
        <>
          <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: isLow ? '#f59e0b' : '#4ade80',
              }}
            />
          </div>
          <span className="text-xs font-mono text-[#8888aa]">{used} / {limit}</span>
        </>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const plan = (session?.user as { plan?: string })?.plan ?? 'FREE'
  const isAgencyPlus = ['AGENCY', 'ENTERPRISE'].includes(plan)

  const scansUsed = (session?.user as { scansThisMonth?: number })?.scansThisMonth ?? 0
  const scanLimit = plan === 'FREE' ? 5 : plan === 'STARTER' ? 50 : plan === 'PRO' ? 200 : -1

  const activeHref = '/' + pathname.split('/').slice(1).join('/')

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1e1e35]">
        <Logo size="sm" href="/dashboard" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
          />
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">Teams & Clients</p>
        </div>
        {teamItems.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
            locked={!isAgencyPlus}
          />
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-heading font-semibold text-[#3a3a5c] uppercase tracking-wider">Account</p>
        </div>
        {accountItems.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Scan credits */}
      <div className="px-3 pb-3">
        <ScanCreditsBar used={scansUsed} limit={scanLimit} />
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-[#1e1e35] pt-3">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#0d0d14] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#1e1e35] border border-[#2a2a4a] flex items-center justify-center text-xs font-heading font-bold text-[#4ade80] flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-[#f0f0ff] truncate">{session?.user?.name ?? 'User'}</p>
              <div className="mt-0.5">
                <PlanBadge plan={plan} />
              </div>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-[#3a3a5c] transition-transform', userMenuOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full left-0 right-0 mb-1 bg-[#0d0d14] border border-[#1e1e35] rounded-lg overflow-hidden shadow-xl z-50"
              >
                <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:bg-[#1e1e35] transition-colors">
                  <Settings className="h-3.5 w-3.5" /> Settings
                </Link>
                <Link href="/billing" className="flex items-center gap-2 px-3 py-2 text-sm text-[#8888aa] hover:text-[#f0f0ff] hover:bg-[#1e1e35] transition-colors">
                  <CreditCard className="h-3.5 w-3.5" /> Billing
                </Link>
                <div className="border-t border-[#1e1e35]" />
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#1e1e35] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050508' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-[#1e1e35]">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 border-r border-[#1e1e35] lg:hidden"
              style={{ background: '#050508' }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-[#8888aa] hover:text-[#f0f0ff]"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-[#1e1e35] flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-[#8888aa] hover:text-[#f0f0ff]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="flex items-center gap-3">
            <Link
              href="/scan/new"
              className="hidden sm:flex btn-primary px-4 py-1.5 rounded-lg font-heading font-semibold text-xs items-center gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" />
              New Scan
            </Link>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0d0d14] text-[#8888aa] hover:text-[#f0f0ff] transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
