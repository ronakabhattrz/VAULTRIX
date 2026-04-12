import type { Finding, ScannerResult, ComplianceFrameworkResult } from '../types'

interface ComplianceControl {
  id: string
  name: string
  framework: string
  categories: string[]
  severities: string[]
  findingPattern?: RegExp
  findingName?: string
}

const COMPLIANCE_CONTROLS: ComplianceControl[] = [
  // OWASP Top 10 2021
  { id: 'A01:2021', name: 'Broken Access Control', framework: 'OWASP_TOP10_2021', categories: ['Authentication', 'Application'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'A02:2021', name: 'Cryptographic Failures', framework: 'OWASP_TOP10_2021', categories: ['SSL/TLS', 'HTTP Headers'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'A03:2021', name: 'Injection', framework: 'OWASP_TOP10_2021', categories: ['Application'], severities: ['HIGH', 'CRITICAL'], findingPattern: /SQL|injection|command/i },
  { id: 'A04:2021', name: 'Insecure Design', framework: 'OWASP_TOP10_2021', categories: ['Application', 'API Security'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'A05:2021', name: 'Security Misconfiguration', framework: 'OWASP_TOP10_2021', categories: ['HTTP Headers', 'Infrastructure'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'A06:2021', name: 'Vulnerable and Outdated Components', framework: 'OWASP_TOP10_2021', categories: ['Content / Technology'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'A07:2021', name: 'Identification and Authentication Failures', framework: 'OWASP_TOP10_2021', categories: ['Authentication', 'Cookies'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'A08:2021', name: 'Software and Data Integrity Failures', framework: 'OWASP_TOP10_2021', categories: ['Application'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'A09:2021', name: 'Security Logging & Monitoring Failures', framework: 'OWASP_TOP10_2021', categories: ['Infrastructure'], severities: ['MEDIUM'] },
  { id: 'A10:2021', name: 'Server-Side Request Forgery', framework: 'OWASP_TOP10_2021', categories: ['Application'], severities: ['HIGH', 'CRITICAL'] },

  // PCI DSS 4
  { id: 'PCI-1.3', name: 'Network Access Controls', framework: 'PCI_DSS_4', categories: ['Infrastructure / Ports'], severities: ['CRITICAL', 'HIGH'] },
  { id: 'PCI-4.2', name: 'Strong Cryptography in Transit', framework: 'PCI_DSS_4', categories: ['SSL/TLS'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'PCI-6.2', name: 'Sensitive Data Not Exposed', framework: 'PCI_DSS_4', categories: ['Application'], severities: ['CRITICAL'] },
  { id: 'PCI-6.4', name: 'Public-Facing Vulnerabilities Addressed', framework: 'PCI_DSS_4', categories: ['Application', 'HTTP Headers'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'PCI-6.5', name: 'Secure Development Practices', framework: 'PCI_DSS_4', categories: ['Authentication', 'CORS'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'PCI-8.3', name: 'Authentication and Identity Management', framework: 'PCI_DSS_4', categories: ['Authentication', 'Cookies'], severities: ['HIGH', 'CRITICAL'] },

  // GDPR
  { id: 'GDPR-5', name: 'Data Minimization', framework: 'GDPR', categories: ['Application'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'GDPR-25', name: 'Privacy by Design', framework: 'GDPR', categories: ['HTTP Headers', 'Cookies'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'GDPR-32', name: 'Security of Processing', framework: 'GDPR', categories: ['SSL/TLS', 'Authentication'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'GDPR-33', name: 'Personal Data Breach Notification', framework: 'GDPR', categories: ['Application'], severities: ['CRITICAL'] },

  // HIPAA
  { id: 'HIPAA-164.312.a', name: 'Technical Access Controls', framework: 'HIPAA', categories: ['Authentication', 'Infrastructure / Ports'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'HIPAA-164.312.c', name: 'Integrity Controls', framework: 'HIPAA', categories: ['Application', 'HTTP Headers'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'HIPAA-164.312.e', name: 'Transmission Security', framework: 'HIPAA', categories: ['SSL/TLS'], severities: ['HIGH', 'CRITICAL'] },

  // NIST CSF
  { id: 'NIST-PR.DS', name: 'Data Security', framework: 'NIST_CSF', categories: ['SSL/TLS', 'Cookies'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'NIST-PR.AC', name: 'Identity and Access Management', framework: 'NIST_CSF', categories: ['Authentication'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'NIST-DE.CM', name: 'Security Continuous Monitoring', framework: 'NIST_CSF', categories: ['Infrastructure'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'NIST-PR.IP', name: 'Information Protection', framework: 'NIST_CSF', categories: ['HTTP Headers', 'Application'], severities: ['MEDIUM', 'HIGH'] },

  // ISO 27001
  { id: 'ISO-A.10', name: 'Cryptography', framework: 'ISO_27001', categories: ['SSL/TLS'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'ISO-A.12', name: 'Operations Security', framework: 'ISO_27001', categories: ['Infrastructure / Ports', 'Application'], severities: ['HIGH', 'CRITICAL'] },
  { id: 'ISO-A.13', name: 'Communications Security', framework: 'ISO_27001', categories: ['HTTP Headers', 'CORS'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'ISO-A.14', name: 'System Acquisition and Development', framework: 'ISO_27001', categories: ['Application', 'Content / Technology'], severities: ['MEDIUM', 'HIGH'] },
  { id: 'ISO-A.18', name: 'Compliance', framework: 'ISO_27001', categories: ['DNS / Email Security'], severities: ['MEDIUM', 'HIGH'] },
]

function checkControl(control: ComplianceControl, findings: Finding[]): boolean {
  // Control FAILS if there are findings matching this control's category + severity
  const relevantFindings = findings.filter(f => {
    const categoryMatch = control.categories.some(cat =>
      f.category.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(f.category.toLowerCase())
    )
    const severityMatch = control.severities.includes(f.severity)
    const patternMatch = control.findingPattern ? control.findingPattern.test(f.name + ' ' + f.description) : true
    return categoryMatch && severityMatch && patternMatch
  })
  return relevantFindings.length === 0 // passes if no relevant failures
}

export function calculateComplianceScores(findings: Finding[]): Record<string, ComplianceFrameworkResult> {
  const frameworks = ['OWASP_TOP10_2021', 'PCI_DSS_4', 'GDPR', 'HIPAA', 'NIST_CSF', 'ISO_27001']
  const results: Record<string, ComplianceFrameworkResult> = {}

  for (const framework of frameworks) {
    const frameworkControls = COMPLIANCE_CONTROLS.filter(c => c.framework === framework)
    let passed = 0
    let failed = 0
    const details: ComplianceFrameworkResult['details'] = []

    for (const control of frameworkControls) {
      const passes = checkControl(control, findings)
      if (passes) {
        passed++
        details.push({ control: `${control.id}: ${control.name}`, status: 'pass', description: `No relevant findings detected for this control` })
      } else {
        failed++
        const relevantFindings = findings.filter(f =>
          control.categories.some(cat =>
            f.category.toLowerCase().includes(cat.toLowerCase())
          ) && control.severities.includes(f.severity)
        )
        details.push({
          control: `${control.id}: ${control.name}`,
          status: 'fail',
          description: `${relevantFindings.length} finding(s): ${relevantFindings.map(f => f.name).slice(0, 2).join(', ')}${relevantFindings.length > 2 ? ` +${relevantFindings.length - 2} more` : ''}`
        })
      }
    }

    const total = passed + failed
    const score = total > 0 ? Math.round((passed / total) * 100) : 100

    results[framework] = { score, passed, failed, details }
  }

  return results
}

export async function runComplianceModule(findings: Finding[]): Promise<ScannerResult & { complianceScores: Record<string, ComplianceFrameworkResult> }> {
  const start = Date.now()
  const complianceScores = calculateComplianceScores(findings)

  const complianceFindings: Finding[] = []

  // Add compliance summary findings for each framework
  for (const [framework, result] of Object.entries(complianceScores)) {
    if (result.score < 70) {
      const friendlyName = framework.replace(/_/g, ' ')
      complianceFindings.push({
        id: Math.random().toString(36).slice(2, 10),
        category: 'Compliance',
        name: `${friendlyName} Compliance: ${result.score}%`,
        severity: result.score < 50 ? 'HIGH' : 'MEDIUM',
        cvssScore: result.score < 50 ? 6.5 : 4.3,
        cveIds: [],
        description: `${friendlyName} compliance score is ${result.score}%. ${result.failed} of ${result.passed + result.failed} controls are failing.`,
        evidence: `Passed: ${result.passed}, Failed: ${result.failed}`,
        impact: `Non-compliance with ${friendlyName} may result in regulatory penalties or security incidents.`,
        remediation: `Address the following failing controls: ${result.details.filter(d => d.status === 'fail').map(d => d.control).slice(0, 3).join(', ')}`,
        references: [],
      })
    }
  }

  return {
    module: 'compliance',
    findings: complianceFindings,
    duration: Date.now() - start,
    complianceScores,
  }
}
