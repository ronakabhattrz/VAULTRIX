export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-heading font-bold text-[#f0f0ff] mb-2">Terms of Service</h1>
      <p className="text-sm text-[#3a3a5c] mb-10">Last updated: January 1, 2025</p>

      {[
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing or using VAULTRIX, you agree to be bound by these Terms. If you do not agree, do not use the service.',
        },
        {
          title: '2. Permitted Use',
          body: 'You may only use VAULTRIX to scan websites and web applications that you own or have explicit written authorization to test. Unauthorized scanning of third-party systems is strictly prohibited and may violate laws including the Computer Fraud and Abuse Act (CFAA) and similar legislation in your jurisdiction.',
        },
        {
          title: '3. Prohibited Activities',
          body: 'You must not use VAULTRIX to: (a) scan systems you do not own or lack permission to test; (b) conduct denial-of-service attacks; (c) attempt to exploit vulnerabilities discovered through the service without authorization; (d) reverse-engineer or resell the service; (e) violate any applicable law or regulation.',
        },
        {
          title: '4. Account Responsibility',
          body: 'You are responsible for maintaining the security of your account credentials and for all activity under your account. Notify us immediately of any unauthorized use.',
        },
        {
          title: '5. Service Availability',
          body: 'We strive for high availability but do not guarantee uninterrupted service. Scheduled maintenance windows will be communicated in advance where possible.',
        },
        {
          title: '6. Data and Privacy',
          body: 'Your use of the service is also governed by our Privacy Policy. Scan results are stored on your behalf and subject to retention policies outlined in the Privacy Policy.',
        },
        {
          title: '7. Limitation of Liability',
          body: 'VAULTRIX is provided "as is." To the maximum extent permitted by law, we disclaim all warranties and limit liability to the amount paid by you in the 12 months preceding the claim.',
        },
        {
          title: '8. Termination',
          body: 'We reserve the right to suspend or terminate accounts that violate these Terms without notice. You may cancel your subscription at any time through the Billing page.',
        },
        {
          title: '9. Governing Law',
          body: 'These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.',
        },
        {
          title: '10. Contact',
          body: 'For legal inquiries, contact legal@vaultrix.io.',
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
