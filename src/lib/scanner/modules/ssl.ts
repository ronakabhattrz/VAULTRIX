import * as tls from 'tls'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

interface CertInfo {
  valid_to: string
  valid_from: string
  subject: { CN?: string; O?: string }
  issuer: { CN?: string; O?: string }
  serialNumber?: string
  fingerprint?: string
  bits?: number
  sigalg?: string
  subjectaltname?: string
}

async function getTLSInfo(hostname: string, port = 443): Promise<{ cert: CertInfo | null; protocol: string | null; cipher: tls.CipherNameAndProtocol | null; authorized: boolean; error?: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ cert: null, protocol: null, cipher: null, authorized: false, error: 'Connection timeout' })
    }, 10000)

    try {
      const socket = tls.connect(
        port,
        hostname,
        {
          rejectUnauthorized: false,
          servername: hostname,
          timeout: 8000,
        },
        () => {
          clearTimeout(timeout)
          const cert = socket.getPeerCertificate(true) as unknown as CertInfo
          const protocol = socket.getProtocol()
          const cipher = socket.getCipher()
          const authorized = socket.authorized

          socket.destroy()
          resolve({ cert, protocol, cipher, authorized })
        }
      )

      socket.on('error', (err) => {
        clearTimeout(timeout)
        resolve({ cert: null, protocol: null, cipher: null, authorized: false, error: err.message })
      })
    } catch (err) {
      clearTimeout(timeout)
      resolve({ cert: null, protocol: null, cipher: null, authorized: false, error: String(err) })
    }
  })
}

export async function runSSLModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  if (!url.startsWith('https://')) {
    findings.push({
      id: makeId(),
      category: 'SSL/TLS',
      name: 'Site Not Using HTTPS',
      severity: 'CRITICAL',
      cvssScore: 9.1,
      cveIds: [],
      description: 'The website is not using HTTPS. All data transmitted between the browser and server is unencrypted.',
      evidence: `URL: ${url}`,
      impact: 'All user data, including login credentials and sensitive information, is transmitted in plaintext and can be intercepted by attackers.',
      remediation: 'Obtain an SSL/TLS certificate (free via Let\'s Encrypt) and configure the server to redirect all HTTP traffic to HTTPS.',
      references: ['https://letsencrypt.org/', 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
      owaspId: 'A02:2021',
      pciDss: ['4.2.1'],
    })
    return { module: 'ssl', findings, duration: Date.now() - start }
  }

  const hostname = extractHostname(url)
  const { cert, protocol, cipher, authorized, error } = await getTLSInfo(hostname)

  if (error && !cert) {
    return { module: 'ssl', findings, duration: Date.now() - start, error: `SSL check failed: ${error}` }
  }

  // Certificate expiry
  if (cert) {
    const expiryDate = new Date(cert.valid_to)
    const now = new Date()
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry <= 0) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expired',
        severity: 'CRITICAL',
        cvssScore: 9.8,
        cveIds: [],
        description: `The SSL certificate expired ${Math.abs(daysUntilExpiry)} days ago on ${expiryDate.toDateString()}.`,
        evidence: `Certificate valid_to: ${cert.valid_to}`,
        impact: 'Browsers will show security warnings, users will not be able to connect, and all HTTPS protections are negated.',
        remediation: 'Renew the SSL certificate immediately. Consider using auto-renewal via Let\'s Encrypt and certbot.',
        references: ['https://letsencrypt.org/'],
        owaspId: 'A02:2021',
        pciDss: ['4.2.1'],
      })
    } else if (daysUntilExpiry <= 7) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expires in 7 Days or Less',
        severity: 'CRITICAL',
        cvssScore: 8.1,
        cveIds: [],
        description: `The SSL certificate expires in ${daysUntilExpiry} days on ${expiryDate.toDateString()}.`,
        evidence: `Certificate valid_to: ${cert.valid_to}`,
        impact: 'Imminent certificate expiry will cause browser security warnings and loss of HTTPS protection.',
        remediation: 'Renew the SSL certificate immediately.',
        references: ['https://letsencrypt.org/'],
        owaspId: 'A02:2021',
      })
    } else if (daysUntilExpiry <= 30) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expires Soon (< 30 Days)',
        severity: 'HIGH',
        cvssScore: 6.5,
        cveIds: [],
        description: `The SSL certificate expires in ${daysUntilExpiry} days on ${expiryDate.toDateString()}.`,
        evidence: `Certificate valid_to: ${cert.valid_to}`,
        impact: 'Certificate will expire soon, causing HTTPS to fail.',
        remediation: 'Renew the SSL certificate before it expires.',
        references: ['https://letsencrypt.org/'],
        owaspId: 'A02:2021',
      })
    } else if (daysUntilExpiry <= 60) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expires Within 60 Days',
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: `The SSL certificate expires in ${daysUntilExpiry} days on ${expiryDate.toDateString()}.`,
        evidence: `Certificate valid_to: ${cert.valid_to}`,
        impact: 'Certificate renewal should be scheduled to avoid service disruption.',
        remediation: 'Plan certificate renewal within the next 30 days.',
        references: [],
        owaspId: 'A02:2021',
      })
    } else if (daysUntilExpiry <= 90) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expires Within 90 Days',
        severity: 'LOW',
        cvssScore: 2.6,
        cveIds: [],
        description: `The SSL certificate expires in ${daysUntilExpiry} days.`,
        evidence: `Certificate valid_to: ${cert.valid_to}`,
        impact: 'Monitor and renew before expiry.',
        remediation: 'Schedule certificate renewal.',
        references: [],
      })
    }

    // Self-signed certificate
    if (!authorized && cert.issuer && cert.subject) {
      const issuerCN = cert.issuer.CN || ''
      const subjectCN = cert.subject.CN || ''
      if (issuerCN === subjectCN || (cert.issuer.O === cert.subject.O && !issuerCN.includes('Let\'s Encrypt') && !issuerCN.includes('DigiCert') && !issuerCN.includes('Comodo') && !issuerCN.includes('GlobalSign') && !issuerCN.includes('Sectigo'))) {
        findings.push({
          id: makeId(),
          category: 'SSL/TLS',
          name: 'Self-Signed SSL Certificate',
          severity: 'CRITICAL',
          cvssScore: 8.1,
          cveIds: [],
          description: 'The SSL certificate is self-signed and not trusted by browsers or operating systems.',
          evidence: `Issuer: ${issuerCN}, Subject: ${subjectCN}`,
          impact: 'Browsers display certificate warnings. Users may be subjected to man-in-the-middle attacks as they cannot verify server identity.',
          remediation: 'Replace with a certificate from a trusted CA. Free certificates are available from Let\'s Encrypt.',
          references: ['https://letsencrypt.org/'],
          owaspId: 'A02:2021',
          pciDss: ['4.2.1'],
        })
      }
    }

    // Check CN matches hostname
    const certCN = cert.subject?.CN || ''
    const altNames = cert.subjectaltname || ''
    const hostnameWithoutWww = hostname.replace(/^www\./, '')
    const certCoversHost =
      certCN === hostname ||
      certCN === `*.${hostnameWithoutWww}` ||
      altNames.includes(hostname) ||
      altNames.includes(`*.${hostnameWithoutWww}`)

    if (!certCoversHost && certCN) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSL Certificate Subject/CN Mismatch',
        severity: 'HIGH',
        cvssScore: 7.4,
        cveIds: [],
        description: `The certificate CN "${certCN}" does not match the hostname "${hostname}".`,
        evidence: `Certificate CN: ${certCN}, Hostname: ${hostname}, SANs: ${altNames.substring(0, 200)}`,
        impact: 'Browsers will display security errors. This may indicate a misconfiguration or a man-in-the-middle attack.',
        remediation: 'Obtain a certificate that includes the correct hostname as a Subject Alternative Name.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Certificate_Transparency'],
        owaspId: 'A02:2021',
      })
    }

    // Wildcard cert info
    if (certCN && certCN.startsWith('*.')) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'Wildcard SSL Certificate Detected',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: `A wildcard certificate is in use: ${certCN}`,
        evidence: `Certificate CN: ${certCN}`,
        impact: 'Wildcard certificates cover all subdomains. A compromise of any subdomain could expose the private key for all subdomains.',
        remediation: 'Consider using individual certificates per subdomain for better isolation, especially for high-security subdomains.',
        references: [],
      })
    }

    // Signature algorithm
    if (cert.sigalg) {
      const sigAlg = cert.sigalg.toLowerCase()
      if (sigAlg.includes('sha1') || sigAlg.includes('md5')) {
        findings.push({
          id: makeId(),
          category: 'SSL/TLS',
          name: 'Weak Certificate Signature Algorithm',
          severity: 'HIGH',
          cvssScore: 7.5,
          cveIds: ['CVE-2005-4900', 'CVE-2015-7575'],
          description: `The certificate uses a weak signature algorithm: ${cert.sigalg}. SHA-1 and MD5 are cryptographically broken.`,
          evidence: `Signature Algorithm: ${cert.sigalg}`,
          impact: 'Weak signature algorithms can be forged, allowing attackers to create fraudulent certificates.',
          remediation: 'Reissue the certificate with SHA-256 or stronger signature algorithm.',
          references: ['https://sha256.io/'],
          owaspId: 'A02:2021',
        })
      }
    }

    // Key size
    if (cert.bits && cert.bits < 2048) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'Insufficient Certificate Key Size',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveIds: [],
        description: `The certificate uses a ${cert.bits}-bit key, which is below the minimum recommended size of 2048 bits.`,
        evidence: `Key size: ${cert.bits} bits`,
        impact: 'Small key sizes are computationally feasible to break with modern hardware.',
        remediation: 'Reissue the certificate with at least a 2048-bit RSA key or 256-bit ECDSA key.',
        references: ['https://www.keylength.com/'],
        owaspId: 'A02:2021',
      })
    }
  }

  // TLS protocol version
  if (protocol) {
    const protocolLower = protocol.toLowerCase()
    if (protocolLower.includes('sslv3') || protocolLower === 'ssl3') {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'SSLv3 Protocol Supported (POODLE)',
        severity: 'CRITICAL',
        cvssScore: 9.3,
        cveIds: ['CVE-2014-3566'],
        description: 'The server supports SSLv3, which is vulnerable to the POODLE attack (CVE-2014-3566).',
        evidence: `Negotiated protocol: ${protocol}`,
        impact: 'Attackers can perform a padding oracle attack to decrypt encrypted SSLv3 traffic.',
        remediation: 'Disable SSLv3 immediately. Only TLS 1.2 and 1.3 should be enabled.',
        references: ['https://nvd.nist.gov/vuln/detail/CVE-2014-3566'],
        owaspId: 'A02:2021',
        pciDss: ['4.2.1'],
      })
    } else if (protocolLower.includes('tlsv1') && !protocolLower.includes('tlsv1.2') && !protocolLower.includes('tlsv1.3')) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'TLS 1.0 Protocol in Use',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveIds: ['CVE-2011-3389'],
        description: 'The server negotiated TLS 1.0, which is deprecated and prohibited by PCI DSS v4.',
        evidence: `Negotiated protocol: ${protocol}`,
        impact: 'TLS 1.0 is vulnerable to BEAST attack and various other vulnerabilities. PCI DSS compliance requires TLS 1.2 minimum.',
        remediation: 'Disable TLS 1.0 and 1.1. Configure server to only support TLS 1.2 and 1.3.',
        references: ['https://nvd.nist.gov/vuln/detail/CVE-2011-3389'],
        owaspId: 'A02:2021',
        pciDss: ['4.2.1'],
      })
    } else if (protocolLower === 'tlsv1.1') {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'TLS 1.1 Protocol in Use',
        severity: 'HIGH',
        cvssScore: 6.5,
        cveIds: [],
        description: 'TLS 1.1 is deprecated and should not be used. Only TLS 1.2 and 1.3 are considered secure.',
        evidence: `Negotiated protocol: ${protocol}`,
        impact: 'Deprecated protocol with known vulnerabilities.',
        remediation: 'Disable TLS 1.1. Enable TLS 1.2 and 1.3 only.',
        references: ['https://datatracker.ietf.org/doc/html/rfc8996'],
        owaspId: 'A02:2021',
        pciDss: ['4.2.1'],
      })
    } else if (protocolLower === 'tlsv1.2') {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'TLS 1.2 Only — Upgrade to TLS 1.3 Recommended',
        severity: 'MEDIUM',
        cvssScore: 3.7,
        cveIds: [],
        description: 'The server supports TLS 1.2 but not TLS 1.3. TLS 1.3 offers improved security and performance.',
        evidence: `Highest negotiated protocol: ${protocol}`,
        impact: 'Missing out on TLS 1.3 security improvements (reduced handshake latency, eliminated legacy cipher suites, improved forward secrecy).',
        remediation: 'Enable TLS 1.3 support on your web server.',
        references: ['https://datatracker.ietf.org/doc/html/rfc8446'],
        owaspId: 'A02:2021',
      })
    } else if (protocolLower.includes('tlsv1.3')) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'TLS 1.3 Supported',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'The server supports TLS 1.3, the latest and most secure version of the TLS protocol.',
        evidence: `Negotiated protocol: ${protocol}`,
        impact: 'Positive: Enhanced forward secrecy, faster handshake, elimination of weak cipher suites.',
        remediation: 'No action required. Continue to maintain TLS 1.3 support.',
        references: ['https://datatracker.ietf.org/doc/html/rfc8446'],
      })
    }
  }

  // Weak ciphers
  if (cipher) {
    const cipherName = cipher.name.toUpperCase()
    const weakCiphers = ['RC4', 'DES', 'EXPORT', 'NULL', 'ANON', '3DES', 'MD5']
    const isWeak = weakCiphers.some(wc => cipherName.includes(wc))
    if (isWeak) {
      findings.push({
        id: makeId(),
        category: 'SSL/TLS',
        name: 'Weak Cipher Suite in Use',
        severity: 'CRITICAL',
        cvssScore: 8.8,
        cveIds: [],
        description: `The server negotiated a weak cipher suite: ${cipher.name}`,
        evidence: `Cipher: ${cipher.name}, Protocol: ${cipher.version}`,
        impact: 'Weak ciphers can be broken by attackers, enabling decryption of intercepted traffic.',
        remediation: 'Disable weak cipher suites. Only allow ECDHE-* and DHE-* cipher suites with AES-GCM or AES-256.',
        references: ['https://ciphersuite.info/'],
        owaspId: 'A02:2021',
        pciDss: ['4.2.1'],
      })
    }
  }

  return {
    module: 'ssl',
    findings,
    duration: Date.now() - start,
  }
}
