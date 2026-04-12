import { Shield, Lock, Eye, Server } from 'lucide-react'

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Security at VAULTRIX</h1>
        <p className="text-lg text-[#8888aa]">We hold ourselves to the same standards we help you achieve.</p>
      </div>

      <div className="space-y-6">
        {[
          {
            icon: Lock,
            title: 'Encryption',
            body: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256. API keys are stored as salted hashes. Passwords use bcrypt with a cost factor of 12.',
          },
          {
            icon: Server,
            title: 'Infrastructure',
            body: 'Hosted on Vercel Edge Network with global CDN. Database on Neon (PostgreSQL) with automatic backups. Redis caching via Upstash with encryption at rest.',
          },
          {
            icon: Eye,
            title: 'Access Control',
            body: 'Role-based access control within organizations. JWT sessions with short expiry. All admin actions are audit-logged. Rate limiting on all API endpoints.',
          },
          {
            icon: Shield,
            title: 'Responsible Disclosure',
            body: 'Found a vulnerability? We take security reports seriously. Email security@vaultrix.io with details. We commit to acknowledging reports within 24 hours and resolving critical issues within 72 hours.',
          },
        ].map(item => (
          <div key={item.title} className="vx-card p-6 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-5 w-5 text-[#4ade80]" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-[#f0f0ff] mb-2">{item.title}</h3>
              <p className="text-sm text-[#8888aa] leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
