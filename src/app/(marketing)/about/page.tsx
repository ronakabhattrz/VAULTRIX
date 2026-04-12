import Link from 'next/link'
import { Shield, Zap, Globe, Lock } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">
          Built for security-conscious teams
        </h1>
        <p className="text-lg text-[#8888aa] max-w-xl mx-auto">
          VAULTRIX was built to make enterprise-grade web security scanning accessible to every developer and security team.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-16">
        {[
          { icon: Shield, title: 'Comprehensive Coverage', body: '13 scanner modules covering OWASP Top 10, SSL/TLS, DNS, ports, cookies, CORS, and more.' },
          { icon: Zap, title: 'Fast Results', body: 'Most scans complete in under 60 seconds with real-time progress via Server-Sent Events.' },
          { icon: Lock, title: 'Compliance Mapping', body: 'Automatic mapping to OWASP 2021, PCI DSS 4, GDPR, HIPAA, NIST CSF, and ISO 27001.' },
          { icon: Globe, title: 'API-First', body: 'Full REST API with API key authentication. Integrate into your CI/CD pipeline in minutes.' },
        ].map(item => (
          <div key={item.title} className="vx-card p-6">
            <item.icon className="h-6 w-6 text-[#4ade80] mb-3" />
            <h3 className="font-heading font-semibold text-[#f0f0ff] mb-2">{item.title}</h3>
            <p className="text-sm text-[#8888aa]">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="vx-card p-8 text-center">
        <p className="text-lg font-heading font-semibold text-[#f0f0ff] mb-2">Ready to secure your web presence?</p>
        <p className="text-sm text-[#8888aa] mb-6">Start with a free account. No credit card required.</p>
        <Link href="/auth/register" className="btn-primary px-6 py-3 rounded-lg font-heading font-semibold inline-block">
          Get Started Free
        </Link>
      </div>
    </div>
  )
}
