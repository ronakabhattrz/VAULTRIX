'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Shield, Settings2, LogOut,
  ChevronRight, AlertTriangle
} from 'lucide-react'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',     icon: Users },
  { href: '/admin/scans',     label: 'Scans',     icon: Shield },
  { href: '/admin/system',    label: 'System',    icon: Settings2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) { router.replace('/auth/login'); return }
    if (!(session.user as { isAdmin?: boolean }).isAdmin) { router.replace('/dashboard') }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050508' }}>
        <div className="w-6 h-6 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) return null

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[#1e1e35]" style={{ background: '#080810' }}>

        {/* Logo / Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#1e1e35]">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-heading font-bold text-[#f0f0ff] leading-none">VAULTRIX</p>
            <p className="text-[10px] text-red-400 font-mono mt-0.5">ADMIN PANEL</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                  active
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-[#8888aa] hover:text-[#f0f0ff] hover:bg-[#1e1e35]/50 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-heading font-semibold text-xs tracking-wide">{label}</span>
                {active && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Back to App + Logout */}
        <div className="p-2 border-t border-[#1e1e35] space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-[#8888aa] hover:text-[#f0f0ff] hover:bg-[#1e1e35]/50 transition-all font-heading font-semibold tracking-wide"
          >
            <LayoutDashboard className="h-4 w-4" />
            Back to App
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-[#8888aa] hover:text-red-400 hover:bg-red-500/5 transition-all font-heading font-semibold tracking-wide"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#1e1e35]" style={{ background: '#080810' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              ADMIN
            </span>
            <span className="text-sm text-[#8888aa]">
              {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Admin'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-heading font-semibold text-[#f0f0ff]">{session.user.name}</p>
              <p className="text-[10px] text-[#8888aa]">{session.user.email}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <span className="text-xs font-heading font-bold text-red-400">
                {session.user.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
