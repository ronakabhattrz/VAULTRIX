import dns from 'node:dns/promises'
import * as net from 'net'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

type MxRecord = { exchange: string; priority: number }
type CaaRecord = { critical: number; issue: string; issuewild: string; iodef: string; contactemail: string; contactphone: string }

async function resolve(hostname: string, type: 'TXT' | 'MX' | 'A' | 'NS'): Promise<string[] | MxRecord[] | null> {
  try {
    if (type === 'TXT') return (await dns.resolveTxt(hostname)).map(r => r.join(''))
    if (type === 'MX') return await dns.resolveMx(hostname)
    if (type === 'A') return await dns.resolve4(hostname)
    if (type === 'NS') return await dns.resolveNs(hostname)
    return null
  } catch {
    return null
  }
}

async function checkSubdomain(sub: string, domain: string): Promise<boolean> {
  try {
    const result = await dns.resolve4(`${sub}.${domain}`)
    return result.length > 0
  } catch {
    return false
  }
}

export async function runDNSModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []
  const domain = extractDomain(url)
  const rootDomain = domain.replace(/^www\./, '')

  // SPF Record
  const txtRecords = await resolve(rootDomain, 'TXT') as string[] | null
  const spfRecord = txtRecords?.find(r => r.startsWith('v=spf1'))

  if (!spfRecord) {
    findings.push({
      id: makeId(),
      category: 'DNS / Email Security',
      name: 'Missing SPF Record',
      severity: 'HIGH',
      cvssScore: 7.5,
      cveIds: [],
      description: 'No SPF (Sender Policy Framework) DNS record found. SPF prevents email spoofing by specifying which mail servers are authorized to send email on behalf of the domain.',
      evidence: `No TXT record starting with "v=spf1" found for ${rootDomain}`,
      impact: 'Attackers can send phishing emails appearing to come from your domain, damaging your brand reputation and deceiving your customers.',
      remediation: 'Create a TXT DNS record: v=spf1 include:_spf.yourmailprovider.com -all',
      references: ['https://www.rfc-editor.org/rfc/rfc7208', 'https://mxtoolbox.com/spf.aspx'],
      owaspId: 'A07:2021',
    })
  } else if (spfRecord.endsWith('~all')) {
    findings.push({
      id: makeId(),
      category: 'DNS / Email Security',
      name: 'SPF Record Uses Soft Fail (~all)',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: `SPF record uses "~all" (soft fail), which marks unauthorized senders but doesn't reject them. Record: ${spfRecord}`,
      evidence: `SPF Record: ${spfRecord}`,
      impact: 'Emails from unauthorized senders are marked but not rejected, reducing SPF effectiveness against spoofing.',
      remediation: 'Change "~all" to "-all" (hard fail) to reject unauthorized senders: v=spf1 ... -all',
      references: ['https://www.rfc-editor.org/rfc/rfc7208'],
    })
  } else if (spfRecord.endsWith('+all')) {
    findings.push({
      id: makeId(),
      category: 'DNS / Email Security',
      name: 'SPF Record Uses Pass All (+all)',
      severity: 'HIGH',
      cvssScore: 7.5,
      cveIds: [],
      description: 'SPF record ends with "+all" which authorizes any server to send email as this domain. This completely defeats the purpose of SPF.',
      evidence: `SPF Record: ${spfRecord}`,
      impact: 'Anyone can send email claiming to be from this domain.',
      remediation: 'Change to "-all" (hard fail) and enumerate legitimate sending sources.',
      references: ['https://www.rfc-editor.org/rfc/rfc7208'],
    })
  }

  // DMARC Record
  let dmarcRecords: string[] | null = null
  try {
    const raw = await dns.resolveTxt(`_dmarc.${rootDomain}`)
    dmarcRecords = raw.map(r => r.join(''))
  } catch {
    dmarcRecords = null
  }

  const dmarcRecord = dmarcRecords?.find(r => r.startsWith('v=DMARC1'))

  if (!dmarcRecord) {
    findings.push({
      id: makeId(),
      category: 'DNS / Email Security',
      name: 'Missing DMARC Record',
      severity: 'HIGH',
      cvssScore: 7.5,
      cveIds: [],
      description: 'No DMARC record found. DMARC (Domain-based Message Authentication, Reporting & Conformance) prevents email spoofing and provides reporting.',
      evidence: `No TXT record found at _dmarc.${rootDomain}`,
      impact: 'Without DMARC, SPF and DKIM results are not used to filter email. Domain spoofing is unconstrained.',
      remediation: 'Add a DMARC record: _dmarc.yourdomain.com TXT "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; pct=100"',
      references: ['https://dmarc.org/resources/deployment-guide/', 'https://mxtoolbox.com/dmarc.aspx'],
    })
  } else {
    const policyMatch = dmarcRecord.match(/p=(\w+)/)
    const policy = policyMatch ? policyMatch[1] : 'none'
    const pctMatch = dmarcRecord.match(/pct=(\d+)/)
    const pct = pctMatch ? parseInt(pctMatch[1]) : 100

    if (policy === 'none') {
      findings.push({
        id: makeId(),
        category: 'DNS / Email Security',
        name: 'DMARC Policy Set to None (Monitor Only)',
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: 'DMARC policy is p=none, meaning unauthorized emails are reported but not rejected or quarantined.',
        evidence: `DMARC Record: ${dmarcRecord}`,
        impact: 'Spoofed emails are not blocked. p=none only provides visibility into spoofing attempts.',
        remediation: 'After reviewing DMARC reports, progress to p=quarantine, then p=reject.',
        references: ['https://dmarc.org/'],
      })
    } else if (policy === 'quarantine') {
      findings.push({
        id: makeId(),
        category: 'DNS / Email Security',
        name: 'DMARC Policy is Quarantine (Not Reject)',
        severity: 'LOW',
        cvssScore: 3.1,
        cveIds: [],
        description: 'DMARC policy is p=quarantine. Unauthorized emails are sent to spam, not rejected.',
        evidence: `DMARC Record: ${dmarcRecord}`,
        impact: 'Some spoofed emails may still reach recipients\' spam folders.',
        remediation: 'Move to p=reject for the strongest protection against domain spoofing.',
        references: ['https://dmarc.org/'],
      })
    } else if (policy === 'reject') {
      findings.push({
        id: makeId(),
        category: 'DNS / Email Security',
        name: 'DMARC Policy is Reject',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'DMARC policy is set to p=reject — the strongest available setting. Unauthorized emails are rejected.',
        evidence: `DMARC Record: ${dmarcRecord}`,
        impact: 'Positive: Maximum email spoofing protection enabled.',
        remediation: 'No action required. Maintain monitoring via rua reports.',
        references: ['https://dmarc.org/'],
      })
    }

    if (pct < 100) {
      findings.push({
        id: makeId(),
        category: 'DNS / Email Security',
        name: `DMARC Coverage Percentage is ${pct}%`,
        severity: 'LOW',
        cvssScore: 2.6,
        cveIds: [],
        description: `DMARC pct=${pct} means the policy only applies to ${pct}% of emails. ${100 - pct}% of unauthorized emails may pass through.`,
        evidence: `DMARC Record: ${dmarcRecord}`,
        impact: 'Partial DMARC enforcement.',
        remediation: 'Set pct=100 once you\'re confident in your DMARC policy.',
        references: ['https://dmarc.org/'],
      })
    }
  }

  // DKIM
  let dkimFound = false
  const commonSelectors = ['default', 'google', 'mail', 'email', 'k1', 'selector1', 'selector2', 'mandrill', 'sendgrid']
  for (const selector of commonSelectors) {
    try {
      const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${rootDomain}`)
      if (dkimRecords.length > 0) {
        dkimFound = true
        break
      }
    } catch {
      continue
    }
  }

  if (!dkimFound) {
    findings.push({
      id: makeId(),
      category: 'DNS / Email Security',
      name: 'DKIM Not Detected',
      severity: 'INFO',
      cvssScore: 2.0,
      cveIds: [],
      description: 'DKIM (DomainKeys Identified Mail) records were not found for common selectors. DKIM adds a cryptographic signature to outgoing emails.',
      evidence: `Checked selectors: ${commonSelectors.join(', ')} at *._domainkey.${rootDomain}`,
      impact: 'Without DKIM, emails cannot be cryptographically verified as originating from your domain.',
      remediation: 'Configure DKIM with your email provider and publish the public key as a DNS TXT record.',
      references: ['https://dkim.org/'],
    })
  }

  // CAA Record
  let caaRecords: { critical: number; issue?: string; issuewild?: string; iodef?: string; contactemail?: string; contactphone?: string }[] | null = null
  try {
    caaRecords = await dns.resolveCaa(rootDomain)
  } catch {
    caaRecords = null
  }

  if (!caaRecords || caaRecords.length === 0) {
    findings.push({
      id: makeId(),
      category: 'DNS',
      name: 'Missing CAA DNS Record',
      severity: 'LOW',
      cvssScore: 3.1,
      cveIds: [],
      description: 'No CAA (Certification Authority Authorization) record found. CAA restricts which Certificate Authorities can issue SSL certificates for your domain.',
      evidence: `No CAA record found for ${rootDomain}`,
      impact: 'Any CA can issue certificates for your domain, increasing risk of fraudulent certificate issuance.',
      remediation: 'Add a CAA record: yourdomain.com CAA 0 issue "letsencrypt.org"',
      references: ['https://letsencrypt.org/docs/caa/'],
    })
  }

  // Subdomain enumeration
  const subdomainsToCheck = [
    'admin', 'api', 'dev', 'staging', 'test', 'mail', 'ftp', 'vpn', 'remote',
    'portal', 'dashboard', 'beta', 'old', 'backup', 'git', 'jenkins', 'jira',
    'confluence', 'smtp', 'pop', 'imap', 'ns1', 'ns2', 'mx', 'webmail',
    'cpanel', 'whm', 'phpmyadmin', 'db', 'mysql', 'redis', 'mongo',
    'elasticsearch', 'kibana', 'grafana', 'prometheus',
  ]

  const foundSubdomains: string[] = []
  const subdomainChecks = subdomainsToCheck.map(async (sub) => {
    const found = await checkSubdomain(sub, rootDomain)
    if (found) foundSubdomains.push(`${sub}.${rootDomain}`)
  })
  await Promise.allSettled(subdomainChecks)

  if (foundSubdomains.length > 0) {
    findings.push({
      id: makeId(),
      category: 'DNS',
      name: 'Subdomains Discovered via DNS Enumeration',
      severity: 'INFO',
      cvssScore: 3.1,
      cveIds: [],
      description: `DNS enumeration discovered ${foundSubdomains.length} active subdomain(s). These may represent attack surface.`,
      evidence: `Found subdomains:\n${foundSubdomains.join('\n')}`,
      impact: 'Each subdomain represents potential attack surface. Developer/staging subdomains may have weaker security controls.',
      remediation: 'Review each subdomain for necessity. Ensure all public-facing subdomains have proper security controls. Consider DNSSEC.',
      references: [],
    })
  }

  return {
    module: 'dns',
    findings,
    duration: Date.now() - start,
  }
}
