import * as dns from 'dns/promises'
import axios from 'axios'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

async function getTxtRecord(hostname: string): Promise<string[] | null> {
  try {
    const records = await dns.resolveTxt(hostname)
    return records.map(r => r.join(''))
  } catch {
    return null
  }
}

export async function runEmailModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []
  const domain = extractDomain(url)

  // MTA-STS check
  const mtaStsHostname = `_mta-sts.${domain}`
  const mtaStsRecords = await getTxtRecord(mtaStsHostname)
  const hasMtaSts = mtaStsRecords?.some(r => r.startsWith('v=STSv1'))

  if (!hasMtaSts) {
    // Also check the .well-known URL
    let wellKnownExists = false
    try {
      const mtaStsUrl = `https://mta-sts.${domain}/.well-known/mta-sts.txt`
      const res = await axios.get(mtaStsUrl, { timeout: 5000, validateStatus: () => true })
      wellKnownExists = res.status === 200
    } catch {
      // ignore
    }

    if (!wellKnownExists) {
      findings.push({
        id: makeId(),
        category: 'Email Security',
        name: 'Missing MTA-STS Policy',
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: 'MTA-STS (Mail Transfer Agent Strict Transport Security) is not configured. MTA-STS ensures email is transmitted over encrypted channels.',
        evidence: `No MTA-STS DNS record at _mta-sts.${domain}`,
        impact: 'Email in transit to your domain may be delivered over unencrypted connections, enabling interception.',
        remediation: '1. Create _mta-sts TXT record: v=STSv1; id=20231001000000\n2. Host policy at https://mta-sts.yourdomain.com/.well-known/mta-sts.txt',
        references: ['https://datatracker.ietf.org/doc/html/rfc8461'],
      })
    }
  }

  // TLS-RPT check
  const tlsRptRecords = await getTxtRecord(`_smtp._tls.${domain}`)
  if (!tlsRptRecords?.some(r => r.startsWith('v=TLSRPTv1'))) {
    findings.push({
      id: makeId(),
      category: 'Email Security',
      name: 'Missing TLS-RPT Record',
      severity: 'INFO',
      cvssScore: 2.0,
      cveIds: [],
      description: 'TLS-RPT (SMTP TLS Reporting) is not configured. This reporting mechanism provides visibility into TLS connection failures.',
      evidence: `No TLS-RPT record found at _smtp._tls.${domain}`,
      impact: 'Without TLS-RPT, you have no visibility into TLS negotiation failures for inbound email.',
      remediation: 'Add TLS-RPT DNS record: _smtp._tls.yourdomain.com TXT "v=TLSRPTv1; rua=mailto:tls-reports@yourdomain.com"',
      references: ['https://datatracker.ietf.org/doc/html/rfc8460'],
    })
  }

  // BIMI check
  const bimiRecords = await getTxtRecord(`default._bimi.${domain}`)
  if (!bimiRecords?.some(r => r.startsWith('v=BIMI1'))) {
    findings.push({
      id: makeId(),
      category: 'Email Security',
      name: 'Missing BIMI Record',
      severity: 'INFO',
      cvssScore: 0,
      cveIds: [],
      description: 'BIMI (Brand Indicators for Message Identification) is not configured. BIMI displays your brand logo in email clients.',
      evidence: `No BIMI record found at default._bimi.${domain}`,
      impact: 'Missed opportunity for brand visibility in email clients that support BIMI.',
      remediation: 'Set up BIMI by publishing your logo as an SVG and adding a BIMI DNS record. Requires DMARC p=quarantine or p=reject.',
      references: ['https://bimigroup.org/implementation-guide/'],
    })
  }

  // SPF permissiveness check (additional detail)
  try {
    const txtRecords = await dns.resolveTxt(domain)
    const spfRecord = txtRecords.map(r => r.join('')).find(r => r.startsWith('v=spf1'))
    if (spfRecord) {
      // Check for overly permissive mechanisms
      if (spfRecord.includes(' mx ') || spfRecord.includes(' a ') || spfRecord.includes(' ptr ')) {
        const permissiveMechanisms = []
        if (spfRecord.includes(' mx ')) permissiveMechanisms.push('mx')
        if (spfRecord.includes(' a ')) permissiveMechanisms.push('a')
        if (spfRecord.includes(' ptr ')) permissiveMechanisms.push('ptr')

        findings.push({
          id: makeId(),
          category: 'Email Security',
          name: 'SPF Record Uses Broad Mechanisms',
          severity: 'HIGH',
          cvssScore: 5.3,
          cveIds: [],
          description: `SPF record includes broad mechanisms (${permissiveMechanisms.join(', ')}) that may authorize unintended senders.`,
          evidence: `SPF Record: ${spfRecord}`,
          impact: 'Overly broad SPF rules may inadvertently authorize IP addresses not belonging to your organization.',
          remediation: 'Replace "a" and "mx" with explicit "ip4:" or "include:" directives pointing to your mail servers.',
          references: ['https://www.rfc-editor.org/rfc/rfc7208'],
        })
      }

      // Check for too many DNS lookups (>10 = permanent error)
      const includeMatches = (spfRecord.match(/include:/g) || []).length
      const redirectMatch = spfRecord.includes('redirect=')
      const totalLookups = includeMatches + (redirectMatch ? 1 : 0)
      if (totalLookups > 8) {
        findings.push({
          id: makeId(),
          category: 'Email Security',
          name: 'SPF Record May Exceed DNS Lookup Limit',
          severity: 'MEDIUM',
          cvssScore: 3.7,
          cveIds: [],
          description: `SPF record has approximately ${totalLookups} DNS lookups. RFC 7208 limits SPF to 10 DNS lookups; exceeding this causes a PermError.`,
          evidence: `SPF Record: ${spfRecord}`,
          impact: 'If the 10-lookup limit is exceeded, SPF evaluation fails with PermError, potentially breaking email delivery.',
          remediation: 'Reduce SPF DNS lookups by consolidating include directives or using SPF flattening.',
          references: ['https://www.rfc-editor.org/rfc/rfc7208#section-4.6.4'],
        })
      }
    }
  } catch {
    // ignore
  }

  return {
    module: 'email',
    findings,
    duration: Date.now() - start,
  }
}
