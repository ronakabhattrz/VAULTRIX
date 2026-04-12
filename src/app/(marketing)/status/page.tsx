export default function StatusPage() {
  const services = [
    { name: 'API', status: 'operational' },
    { name: 'Scan Workers', status: 'operational' },
    { name: 'Dashboard', status: 'operational' },
    { name: 'SSE Streams', status: 'operational' },
    { name: 'Email Delivery', status: 'operational' },
    { name: 'Database', status: 'operational' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">System Status</h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-sm text-[#4ade80] font-heading font-semibold">All systems operational</span>
        </div>
      </div>

      <div className="vx-card overflow-hidden">
        {services.map((s, i) => (
          <div key={s.name} className={`flex items-center justify-between px-5 py-4 ${i < services.length - 1 ? 'border-b border-[#1e1e35]' : ''}`}>
            <span className="text-sm text-[#f0f0ff]">{s.name}</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              <span className="text-xs text-[#4ade80] font-heading font-semibold capitalize">{s.status}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[#3a3a5c] mt-6">Last updated: just now</p>
    </div>
  )
}
