import Link from 'next/link'
import { Code2, BookOpen, Zap, Webhook } from 'lucide-react'

const sections = [
  {
    title: 'Getting Started',
    icon: Zap,
    links: [
      { label: 'Quick Start Guide', href: '#quickstart' },
      { label: 'Authentication', href: '#auth' },
      { label: 'Your First Scan', href: '#first-scan' },
    ],
  },
  {
    title: 'API Reference',
    icon: Code2,
    links: [
      { label: 'POST /api/v1/scan', href: '#scan-create' },
      { label: 'GET /api/v1/scan/:id', href: '#scan-get' },
      { label: 'GET /api/v1/scans', href: '#scans-list' },
      { label: 'SSE Stream', href: '#sse' },
    ],
  },
  {
    title: 'Integrations',
    icon: Webhook,
    links: [
      { label: 'Webhooks', href: '#webhooks' },
      { label: 'GitHub Actions', href: '#github-actions' },
      { label: 'CI/CD Integration', href: '#cicd' },
    ],
  },
]

const CODE_EXAMPLE = `// Start a scan
const response = await fetch('https://vaultrix.io/api/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    target: 'https://example.com',
    profile: 'standard', // quick | standard | deep | full
  }),
})

const { scanId } = await response.json()

// Stream results in real-time
const eventSource = new EventSource(
  \`https://vaultrix.io/api/v1/scan/\${scanId}/stream\`,
  { headers: { Authorization: 'Bearer YOUR_API_KEY' } }
)

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(data) // { type: 'progress', progress: 45, ... }
}`

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Documentation</h1>
        <p className="text-lg text-[#8888aa]">Everything you need to integrate VAULTRIX into your workflow.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {sections.map(section => (
          <div key={section.title} className="vx-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="h-5 w-5 text-[#4ade80]" />
              <h3 className="font-heading font-semibold text-[#f0f0ff]">{section.title}</h3>
            </div>
            <ul className="space-y-2">
              {section.links.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-[#8888aa] hover:text-[#4ade80] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="vx-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-[#4ade80]" />
          <h2 className="font-heading font-semibold text-[#f0f0ff]">Quick Start Example</h2>
        </div>
        <pre className="terminal text-xs overflow-x-auto">{CODE_EXAMPLE}</pre>
      </div>

      <div className="mt-8 p-6 border border-[#1e1e35] rounded-xl text-center">
        <p className="text-sm text-[#8888aa] mb-4">Need help integrating? Our team is ready to assist.</p>
        <Link href="/contact" className="btn-primary px-6 py-2.5 rounded-lg font-heading font-semibold text-sm inline-block">
          Contact Support
        </Link>
      </div>
    </div>
  )
}
