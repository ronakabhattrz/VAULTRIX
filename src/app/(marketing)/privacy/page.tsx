export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-heading font-bold text-[#f0f0ff] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#3a3a5c] mb-10">Last updated: January 1, 2025</p>

      {[
        {
          title: '1. Information We Collect',
          body: 'We collect information you provide directly, such as your name, email address, and payment information when you register or subscribe. We also collect scan targets (URLs) you submit and the results of those scans. Usage data including IP addresses, browser types, and pages visited is collected automatically.',
        },
        {
          title: '2. How We Use Your Information',
          body: 'Your information is used to provide and improve the VAULTRIX service, process payments, send transactional emails (scan results, billing receipts), and comply with legal obligations. We do not sell your personal information to third parties.',
        },
        {
          title: '3. Data Retention',
          body: 'Scan results are retained for 12 months on Free plans and 24 months on paid plans. Account data is retained until account deletion. You may request deletion of your data at any time through the Settings page.',
        },
        {
          title: '4. Security',
          body: 'We implement industry-standard security measures including encryption at rest and in transit, access controls, and regular security audits. However, no method of transmission over the internet is 100% secure.',
        },
        {
          title: '5. Cookies',
          body: 'We use essential cookies for authentication and session management, and optional analytics cookies. You can control cookie preferences in your browser settings.',
        },
        {
          title: '6. Third-Party Services',
          body: 'We use Stripe for payment processing, Neon for database hosting, and Vercel for infrastructure. These services have their own privacy policies. We use Resend for transactional email.',
        },
        {
          title: '7. Your Rights (GDPR)',
          body: 'If you are in the European Economic Area, you have the right to access, rectify, port, and erase your personal data. You may also object to or restrict certain processing. Contact privacy@vaultrix.io to exercise these rights.',
        },
        {
          title: '8. Contact',
          body: 'For privacy-related questions or requests, contact us at privacy@vaultrix.io.',
        },
      ].map(section => (
        <div key={section.title} className="mb-8">
          <h2 className="text-lg font-heading font-semibold text-[#f0f0ff] mb-3">{section.title}</h2>
          <p className="text-sm text-[#8888aa] leading-relaxed">{section.body}</p>
        </div>
      ))}
    </div>
  )
}
