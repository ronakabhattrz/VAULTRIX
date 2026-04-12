import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'

const navLinks = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/about', label: 'About' },
  { href: '/security', label: 'Security' },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#050508' }}>
      <nav className="border-b border-[#1e1e35] px-6 py-4 flex items-center justify-between sticky top-0 z-30" style={{ background: '#050508' }}>
        <Logo size="sm" />
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-[#8888aa] hover:text-[#f0f0ff] transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-[#8888aa] hover:text-[#f0f0ff] transition-colors">Sign In</Link>
          <Link href="/auth/register" className="btn-primary px-4 py-1.5 rounded-lg font-heading font-semibold text-sm">Start Free</Link>
        </div>
      </nav>
      {children}
      <footer className="border-t border-[#1e1e35] px-6 py-8 text-center">
        <p className="text-xs text-[#3a3a5c]">
          © {new Date().getFullYear()} VAULTRIX. All rights reserved.{' '}
          <Link href="/privacy" className="hover:text-[#8888aa]">Privacy</Link> ·{' '}
          <Link href="/terms" className="hover:text-[#8888aa]">Terms</Link> ·{' '}
          <Link href="/security" className="hover:text-[#8888aa]">Security</Link>
        </p>
      </footer>
    </div>
  )
}
