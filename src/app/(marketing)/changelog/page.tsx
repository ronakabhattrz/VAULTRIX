const CHANGELOG = [
  {
    version: '2.0.0',
    date: 'January 2025',
    changes: [
      'Launched VAULTRIX 2.0 with completely rebuilt scanning engine',
      'Added 13 security modules including CORS, API, and compliance scanning',
      'Introduced real-time scan progress via Server-Sent Events',
      'Added compliance mapping for OWASP 2021, PCI DSS 4, GDPR, HIPAA, NIST CSF, ISO 27001',
      'New scoring engine with CVSS-weighted scoring',
      'Team and client management for Agency plans',
    ],
    type: 'major',
  },
  {
    version: '1.5.0',
    date: 'November 2024',
    changes: [
      'Added PDF report generation with Puppeteer',
      'Introduced scheduled scans (daily/weekly/monthly)',
      'Added score trend visualization',
      'REST API v1 with full documentation',
    ],
    type: 'minor',
  },
  {
    version: '1.2.0',
    date: 'September 2024',
    changes: [
      'Google and GitHub OAuth sign-in',
      'Magic link authentication via email',
      'Webhook notifications for scan completion',
      'API key management',
    ],
    type: 'minor',
  },
]

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Changelog</h1>
        <p className="text-[#8888aa]">What&apos;s new in VAULTRIX</p>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1e1e35]" />
        <div className="space-y-10">
          {CHANGELOG.map(release => (
            <div key={release.version} className="relative pl-12">
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 top-1.5 ${
                release.type === 'major' ? 'bg-[#4ade80] border-[#4ade80]' : 'bg-[#0d0d14] border-[#3a3a5c]'
              }`} />
              <div className="flex items-center gap-3 mb-3">
                <span className="font-heading font-bold text-[#f0f0ff]">v{release.version}</span>
                <span className="text-xs text-[#3a3a5c]">{release.date}</span>
                {release.type === 'major' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-heading font-semibold uppercase">Major</span>
                )}
              </div>
              <ul className="space-y-2">
                {release.changes.map(change => (
                  <li key={change} className="text-sm text-[#8888aa] flex items-start gap-2">
                    <span className="text-[#4ade80] mt-1.5">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
