'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Shield, Zap, Globe, Lock, Mail, Server, Code2, CheckCircle, ArrowRight, ChevronDown, ChevronUp, Star, BarChart3 } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { SeverityBadge } from '@/components/security/SeverityBadge'
import { SecurityGauge } from '@/components/security/SecurityGauge'

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 8,
  duration: Math.random() * 12 + 8,
}))

const TERMINAL_LINES = [
  '[+] Initializing VAULTRIX scanner v2.1...',
  '[+] Resolving DNS for example.com...',
  '[+] Connecting to 443/tcp...',
  '[*] TLS 1.3 | Cert expires in 87 days',
  '[+] Checking HTTP security headers...',
  '[!] CRITICAL: Content-Security-Policy missing',
  '[!] HIGH: X-Frame-Options not set',
  '[+] Scanning 23 ports...',
  '[!] CRITICAL: Redis port 6379 open (no auth)',
  '[!] CRITICAL: Elasticsearch 9200 exposed',
  '[+] Analysing cookies...',
  '[!] HIGH: 3 cookies missing HttpOnly flag',
  '[+] Checking SPF/DMARC...',
  '[!] HIGH: DMARC record missing',
  '[+] Scanning web app...',
  '[!] CRITICAL: /.env accessible (HTTP 200)',
  '[*] Subdomain found: staging.example.com',
  '[+] Computing score...',
  '[*] Score: 34/100 — Grade F',
  '[✓] Done: 24 findings (4 critical, 8 high)',
]

function AnimatedTerminal() {
  const [displayed, setDisplayed] = useState<string[]>([])
  const [lineIdx, setLineIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lineIdx >= TERMINAL_LINES.length) {
      const t = setTimeout(() => { setDisplayed([]); setLineIdx(0) }, 2500)
      return () => clearTimeout(t)
    }
    const delay = lineIdx === 0 ? 500 : 150 + Math.random() * 180
    const t = setTimeout(() => {
      setDisplayed(prev => [...prev, TERMINAL_LINES[lineIdx]])
      setLineIdx(i => i + 1)
      ref.current?.scrollTo({ top: 9999, behavior: 'smooth' })
    }, delay)
    return () => clearTimeout(t)
  }, [lineIdx])

  const getColor = (line: string) => {
    if (line.includes('CRITICAL')) return '#ef4444'
    if (line.includes('[!]')) return '#f59e0b'
    if (line.includes('[✓]')) return '#4ade80'
    if (line.includes('[*]')) return '#60a5fa'
    return '#8888aa'
  }

  return (
    <div className="rounded-xl border border-[#1e1e35] overflow-hidden bg-[#0a0a12]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e1e35] bg-[#0d0d14]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-[#8888aa] ml-2 font-mono">vaultrix-scanner</span>
      </div>
      <div ref={ref} className="p-4 h-64 overflow-hidden font-mono text-xs leading-6">
        {displayed.map((line, i) => (
          <div key={i} style={{ color: getColor(line) }}>{line}</div>
        ))}
        {lineIdx < TERMINAL_LINES.length && <div className="cursor-blink" />}
      </div>
    </div>
  )
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let n = 0
    const step = Math.ceil(target / 60)
    const t = setInterval(() => {
      n = Math.min(n + step, target)
      setCount(n)
      if (n >= target) clearInterval(t)
    }, 20)
    return () => clearInterval(t)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const FEATURES = [
  { icon: Lock, name: 'SSL/TLS Analysis', desc: 'Certificate expiry, weak ciphers, TLS version, HSTS.', plan: 'FREE' },
  { icon: Shield, name: 'HTTP Security Headers', desc: 'CSP, HSTS, X-Frame-Options, Referrer-Policy and more.', plan: 'FREE' },
  { icon: Server, name: 'Open Port Scan', desc: 'Redis, MongoDB, Elasticsearch, RDP, SMB exposure.', plan: 'STARTER' },
  { icon: Globe, name: 'DNS Security', desc: 'SPF, DKIM, DMARC, DNSSEC, CAA, subdomain enum.', plan: 'STARTER' },
  { icon: Code2, name: 'Web App Vulnerabilities', desc: 'Exposed files, admin panels, SQL errors, inline secrets.', plan: 'PRO' },
  { icon: Mail, name: 'Email Security', desc: 'SPF/DKIM/DMARC/BIMI/MTA-STS — stop spoofing.', plan: 'PRO' },
  { icon: Zap, name: 'CORS Configuration', desc: 'Wildcard origins, credential leaks, method exposure.', plan: 'PRO' },
  { icon: BarChart3, name: 'Compliance Mapping', desc: 'OWASP, PCI DSS 4, GDPR, HIPAA, NIST CSF, ISO 27001.', plan: 'AGENCY' },
  { icon: Shield, name: 'API Security', desc: 'GraphQL introspection, Swagger exposure, rate limits.', plan: 'AGENCY' },
]

const FAQ = [
  { q: 'Is this safe to use?', a: 'Yes. VAULTRIX performs passive, non-intrusive checks — it reads headers, tests DNS records, and checks for publicly exposed files. We never exploit vulnerabilities or write data to your systems.' },
  { q: 'Will scanning affect my website performance?', a: 'No. Our scan makes a small number of HTTP requests similar to a regular browser visit. There is no load testing, fuzzing, or anything that could impact performance.' },
  { q: 'What makes VAULTRIX different from free tools?', a: 'VAULTRIX runs 13 coordinated modules simultaneously, maps findings to compliance frameworks, provides actionable remediation, generates branded PDF reports, and offers monitoring with alerts.' },
  { q: 'Do you store my website data?', a: 'We store scan results in your account so you can track improvements over time. We never store credentials or user data from your site — only what is publicly accessible during the scan.' },
  { q: 'Can I scan websites I don\'t own?', a: 'No. You must only scan websites you own or have explicit written permission to test. Unauthorized scanning is illegal in most jurisdictions and against our Terms of Service.' },
  { q: 'What\'s in the PDF report?', a: 'Executive summary, risk matrix, all findings with evidence and remediation steps, compliance scores (OWASP/PCI DSS/GDPR/NIST), technology inventory, and top 10 priority fixes.' },
  { q: 'Do you offer a free trial?', a: 'The FREE plan includes 3 scans per month — no credit card required. Upgrade any time for full 13-module scans, scheduling, PDF reports, and API access.' },
  { q: 'Can I use the API to automate scans?', a: 'Yes. Every paid plan includes API access. Trigger scans programmatically, integrate with CI/CD, or build custom dashboards. Full REST API with curl, Node.js, and Python examples.' },
]

const PLANS = [
  { name: 'Free', price: { m: 0, a: 0 }, scans: '3 scans/mo', modules: '3 modules', features: ['Headers, SSL, Cookies', 'Security score', 'In-app report'], cta: 'Get Started', hot: false },
  { name: 'Starter', price: { m: 19, a: 15 }, scans: '20 scans/mo', modules: '7 modules', features: ['+ DNS, Ports, Content', 'Email alerts', 'PDF reports', 'API (200 calls)'], cta: 'Start Free Trial', hot: false },
  { name: 'Pro', price: { m: 49, a: 39 }, scans: '100 scans/mo', modules: '11 modules', features: ['+ Webapp, CORS, Auth', 'Scheduled scans', 'Slack/Webhook alerts', 'API (1000 calls)'], cta: 'Start Free Trial', hot: true },
  { name: 'Agency', price: { m: 149, a: 119 }, scans: '500 scans/mo', modules: 'All 13 modules', features: ['Compliance mapping', 'Team (15 members)', 'White-label PDFs', 'Client portal', 'API (5000 calls)'], cta: 'Start Free Trial', hot: false },
]

export default function LandingPage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scanUrl, setScanUrl] = useState('')

  return (
    <div className="min-h-screen" style={{ background: '#050508' }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-[#1e1e35]/50 backdrop-blur-sm flex items-center" style={{ background: 'rgba(5,5,8,0.92)' }}>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8 text-sm text-[#8888aa]">
            {[['#features', 'Features'], ['#pricing', 'Pricing'], ['/docs', 'Docs'], ['/blog', 'Blog']].map(([h, l]) => (
              <Link key={l} href={h} className="hover:text-[#f0f0ff] transition-colors">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-[#8888aa] hover:text-[#f0f0ff] transition-colors hidden sm:block">Log In</Link>
            <Link href="/auth/register" className="btn-primary text-sm px-4 py-2 rounded-lg inline-flex items-center gap-1.5">
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="particles-bg">
          {PARTICLES.map(p => (
            <span key={p.id} className="particle" style={{ left: `${p.x}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
          ))}
        </div>
        <motion.div className="max-w-5xl mx-auto text-center relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1e1e35] text-xs text-[#8888aa] mb-6">
            <span className="status-dot status-operational" />Scanner online · 47,000+ scans completed
          </div>
          <h1 className="font-heading font-bold leading-tight mb-6" style={{ fontSize: 'clamp(34px, 5.5vw, 58px)' }}>
            Find Vulnerabilities<br /><span style={{ color: '#4ade80' }}>Before Hackers Do</span>
          </h1>
          <p className="text-lg text-[#8888aa] max-w-2xl mx-auto mb-10 leading-relaxed">
            Enterprise-grade web security scanning in under 60 seconds. 13 modules, actionable findings, PDF reports, and compliance mapping.
          </p>
          <div className="max-w-2xl mx-auto flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#0d0d14] border border-[#1e1e35] rounded-xl focus-within:border-[#4ade80] transition-colors">
              <Globe className="h-4 w-4 text-[#3a3a5c] shrink-0" />
              <input type="url" placeholder="https://yoursite.com" value={scanUrl} onChange={e => setScanUrl(e.target.value)}
                className="flex-1 bg-transparent text-[#f0f0ff] text-sm outline-none placeholder:text-[#3a3a5c] font-mono" />
            </div>
            <Link href={scanUrl ? `/auth/register?url=${encodeURIComponent(scanUrl)}` : '/auth/register'}
              className="btn-primary px-5 py-3 rounded-xl font-heading font-semibold text-sm whitespace-nowrap inline-flex items-center gap-2">
              Scan Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs text-[#3a3a5c]">No credit card · 3 free scans · ~60s · Only scan sites you own or have permission to test</p>
          <div className="flex flex-wrap justify-center gap-4 mt-5 text-xs text-[#8888aa]">
            {['SOC2 Compliant', 'GDPR Safe', 'Used by 3,200+ companies'].map(b => (
              <span key={b} className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-[#4ade80]" />{b}</span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Terminal */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <AnimatedTerminal />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl mb-3">13 Security Modules. One Scan.</h2>
          <p className="text-[#8888aa]">Every scan runs multiple parallel checks for a complete security picture.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.name} className="vx-card p-5" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.01 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-[#0d0d14] border border-[#1e1e35]"><f.icon className="h-4 w-4 text-[#4ade80]" /></div>
                <span className={`text-[10px] font-heading font-semibold px-1.5 py-0.5 rounded border ${f.plan === 'FREE' ? 'text-[#8888aa] border-[#2a2a4a]' : f.plan === 'STARTER' ? 'text-blue-400 border-blue-400/30' : f.plan === 'PRO' ? 'text-purple-400 border-purple-400/30' : 'text-amber-400 border-amber-400/30'}`}>{f.plan}</span>
              </div>
              <h3 className="font-heading font-semibold text-sm mb-1.5">{f.name}</h3>
              <p className="text-xs text-[#8888aa] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <h2 className="font-heading font-bold text-3xl text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', icon: Globe, title: 'Enter Your URL', desc: 'Paste any public URL. We resolve DNS, connect to your server, and run all checks in parallel.' },
            { n: '02', icon: Zap, title: 'We Scan 13 Modules', desc: 'SSL, headers, ports, DNS, cookies, CORS, webapp, auth, compliance — done in ~60 seconds.' },
            { n: '03', icon: BarChart3, title: 'Get Your Report', desc: 'Instant score, grade, compliance mapping, and a detailed PDF with step-by-step remediation.' },
          ].map((step, i) => (
            <motion.div key={step.n} className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0d0d14] border border-[#1e1e35] mb-4">
                <step.icon className="h-6 w-6 text-[#4ade80]" />
              </div>
              <div className="font-heading text-[#3a3a5c] text-sm mb-1">{step.n}</div>
              <h3 className="font-heading font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-[#8888aa] leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sample report */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="vx-card p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <SecurityGauge score={62} grade="D" size={140} />
            <div className="flex-1">
              <h3 className="font-heading font-bold text-xl mb-2">Sample Report Preview</h3>
              <p className="text-[#8888aa] text-sm mb-4">This is what a real scan report looks like — every finding includes evidence, impact analysis, and step-by-step remediation.</p>
              <div className="space-y-2">
                {[['Redis Port 6379 Exposed', 'CRITICAL'], ['Missing Content-Security-Policy', 'HIGH'], ['DMARC Record Missing', 'HIGH'], ['Cookies Missing HttpOnly', 'HIGH']].map(([n, s]) => (
                  <div key={n} className="flex items-center gap-3">
                    <SeverityBadge level={s as 'CRITICAL' | 'HIGH'} size="sm" />
                    <span className="text-sm text-[#f0f0ff]">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-10">
          <h2 className="font-heading font-bold text-3xl mb-3">Simple, Transparent Pricing</h2>
          <p className="text-[#8888aa] mb-6">Start free. Upgrade when you need more.</p>
          <div className="inline-flex items-center gap-2 bg-[#0d0d14] border border-[#1e1e35] rounded-lg p-1">
            <button onClick={() => setAnnual(false)} className={`text-sm px-4 py-1.5 rounded transition-all ${!annual ? 'bg-[#1e1e35] text-[#f0f0ff]' : 'text-[#8888aa]'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`text-sm px-4 py-1.5 rounded transition-all ${annual ? 'bg-[#1e1e35] text-[#f0f0ff]' : 'text-[#8888aa]'}`}>Annual <span className="text-[#4ade80]">–20%</span></button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.name} className={`vx-card p-6 flex flex-col ${plan.hot ? 'border-[#4ade80]/40' : ''}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              {plan.hot && <div className="text-xs font-heading font-semibold text-[#4ade80] mb-2">MOST POPULAR</div>}
              <h3 className="font-heading font-bold text-lg mb-1">{plan.name}</h3>
              <div className="mb-3">
                <span className="font-heading font-bold text-3xl">{plan.price.m === 0 ? 'Free' : `$${annual ? plan.price.a : plan.price.m}`}</span>
                {plan.price.m > 0 && <span className="text-[#8888aa] text-sm">/mo</span>}
              </div>
              <div className="text-xs text-[#8888aa] mb-1">{plan.scans}</div>
              <div className="text-xs text-[#8888aa] mb-4">{plan.modules}</div>
              <ul className="space-y-1.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#8888aa]">
                    <CheckCircle className="h-3.5 w-3.5 text-[#4ade80] shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className={`text-sm font-heading font-semibold py-2.5 rounded-lg text-center transition-all ${plan.hot ? 'bg-[#4ade80] text-[#050508] hover:bg-[#22c55e]' : 'border border-[#1e1e35] text-[#f0f0ff] hover:border-[#2a2a4a]'}`}>{plan.cta}</Link>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-sm text-[#8888aa] mt-6">Need more? <Link href="/contact" className="text-[#4ade80] hover:underline">Contact us</Link> for Enterprise.</p>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="font-heading font-bold text-3xl text-center mb-10">Trusted by Security-Conscious Teams</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Sarah Chen', title: 'CTO, FinPay Technologies', av: 'SC', q: 'VAULTRIX found a publicly exposed Redis instance and an open .env file within 60 seconds. The PCI DSS compliance report alone is worth the price.' },
            { name: 'Marcus Webb', title: 'Owner, WebSec Agency', av: 'MW', q: 'I use VAULTRIX for every client onboarding. The white-label PDF reports save hours of manual work, and clients actually understand them.' },
            { name: 'Priya Nair', title: 'Co-founder, SaaSify.io', av: 'PN', q: 'Set up weekly scans for our staging environment. Got an alert when a developer accidentally pushed an exposed API key to production.' },
          ].map((t, i) => (
            <motion.div key={t.name} className="vx-card p-6" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="flex mb-3 gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />)}</div>
              <p className="text-sm text-[#8888aa] leading-relaxed mb-5">"{t.q}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1e1e35] flex items-center justify-center font-heading font-semibold text-sm text-[#4ade80]">{t.av}</div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-[#8888aa]">{t.title}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[{ l: 'Scans Completed', v: 47000, s: '+' }, { l: 'Vulnerabilities Found', v: 2800000, s: '+' }, { l: 'Avg Scan Time', v: 58, s: 's' }, { l: 'Companies Protected', v: 3200, s: '+' }].map(stat => (
            <div key={stat.l} className="vx-card p-5">
              <div className="font-heading font-bold text-2xl text-[#4ade80] mb-1"><AnimatedCounter target={stat.v} suffix={stat.s} /></div>
              <div className="text-xs text-[#8888aa]">{stat.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="font-heading font-bold text-3xl text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="vx-card overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="font-heading font-semibold text-sm">{item.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-[#8888aa] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[#8888aa] shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-[#8888aa] leading-relaxed border-t border-[#1e1e35] pt-4">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <div className="vx-card p-10">
          <h2 className="font-heading font-bold text-3xl mb-3">Start Scanning for Free</h2>
          <p className="text-[#8888aa] mb-8">3 free scans. No credit card. Results in 60 seconds.</p>
          <Link href="/auth/register" className="btn-primary px-8 py-3.5 rounded-xl font-heading font-semibold inline-flex items-center gap-2">
            Scan Your Site Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e35] max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <Logo size="sm" className="mb-3" />
            <p className="text-xs text-[#8888aa] max-w-xs leading-relaxed">Enterprise-grade web security scanning. Find vulnerabilities before attackers do.</p>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-wider mb-3 text-[#8888aa]">Product</h4>
            <ul className="space-y-2">{[['Features', '#features'], ['Pricing', '#pricing'], ['Changelog', '/changelog'], ['Status', '/status'], ['Docs', '/docs']].map(([l, h]) => <li key={l}><Link href={h} className="text-xs text-[#8888aa] hover:text-[#f0f0ff] transition-colors">{l}</Link></li>)}</ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-wider mb-3 text-[#8888aa]">Company</h4>
            <ul className="space-y-2">{[['About', '/about'], ['Blog', '/blog'], ['Security', '/security'], ['Contact', '/contact']].map(([l, h]) => <li key={l}><Link href={h} className="text-xs text-[#8888aa] hover:text-[#f0f0ff] transition-colors">{l}</Link></li>)}</ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-wider mb-3 text-[#8888aa]">Legal</h4>
            <ul className="space-y-2">{[['Privacy', '/privacy'], ['Terms', '/terms'], ['Security', '/security']].map(([l, h]) => <li key={l}><Link href={h} className="text-xs text-[#8888aa] hover:text-[#f0f0ff] transition-colors">{l}</Link></li>)}</ul>
          </div>
        </div>
        <div className="border-t border-[#1e1e35] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#3a3a5c]">© {new Date().getFullYear()} VAULTRIX. All rights reserved.</p>
          <p className="text-xs text-[#3a3a5c] text-center">⚠️ Only scan websites you own or have explicit written permission to test. Unauthorized scanning is illegal.</p>
        </div>
      </footer>
    </div>
  )
}
