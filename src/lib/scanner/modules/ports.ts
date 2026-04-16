import * as net from 'net'
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

async function checkPort(host: string, port: number, timeoutMs = 3000): Promise<{ open: boolean; banner?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let banner = ''
    let resolved = false
    let connected = false

    const done = (open: boolean, b?: string) => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve({ open, banner: b })
      }
    }

    socket.setTimeout(timeoutMs)

    socket.once('connect', () => {
      connected = true
      socket.setTimeout(1500)
    })

    socket.once('data', (data) => {
      banner = data.toString('utf8', 0, 256).replace(/[\r\n]/g, ' ').trim()
      done(true, banner)
    })

    socket.once('timeout', () => {
      if (banner) done(true, banner)
      else if (!connected) done(false)
      else done(true)
    })

    socket.once('error', () => {
      done(false)
    })

    socket.once('close', () => {
      if (!resolved) done(connected)
    })

    socket.connect(port, host)
  })
}

const DANGEROUS_PORTS: Array<{
  port: number
  service: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO'
  cvssScore: number
  cveIds: string[]
  description: string
  impact: string
  remediation: string
}> = [
  {
    port: 21,
    service: 'FTP',
    severity: 'HIGH',
    cvssScore: 7.5,
    cveIds: [],
    description: 'FTP (File Transfer Protocol) is running and publicly accessible. FTP transmits credentials and data in plaintext.',
    impact: 'Credentials can be sniffed, files can be downloaded or uploaded, server can be compromised.',
    remediation: 'Replace FTP with SFTP (SSH File Transfer Protocol) or FTPS. If FTP is necessary, restrict access via firewall.',
  },
  {
    port: 22,
    service: 'SSH',
    severity: 'INFO',
    cvssScore: 2.0,
    cveIds: [],
    description: 'SSH (Secure Shell) is accessible from the internet. While SSH is encrypted, unnecessary exposure increases attack surface.',
    impact: 'Brute-force attacks against SSH are common. Exposed SSH increases attack surface.',
    remediation: 'Restrict SSH access to known IP addresses via firewall rules. Use key-based authentication and disable password auth.',
  },
  {
    port: 23,
    service: 'Telnet',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cveIds: [],
    description: 'Telnet is running and publicly accessible. Telnet transmits all data including credentials in plaintext.',
    impact: 'Complete plaintext credential capture. Remote code execution if authenticated.',
    remediation: 'Immediately disable Telnet. Replace with SSH for remote administration.',
  },
  {
    port: 25,
    service: 'SMTP',
    severity: 'HIGH',
    cvssScore: 7.5,
    cveIds: [],
    description: 'SMTP port 25 is open. This may allow open relay, enabling spam sending.',
    impact: 'May be used as an open relay to send spam, damaging IP reputation.',
    remediation: 'Configure SMTP to require authentication. Close port 25 externally and use port 587 for submission.',
  },
  {
    port: 110,
    service: 'POP3',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    cveIds: [],
    description: 'POP3 is accessible. Standard POP3 on port 110 is unencrypted.',
    impact: 'Email credentials and content may be transmitted in plaintext.',
    remediation: 'Use POP3S (port 995) with TLS encryption instead.',
  },
  {
    port: 143,
    service: 'IMAP',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    cveIds: [],
    description: 'IMAP is accessible on the standard unencrypted port.',
    impact: 'Email credentials and content may be transmitted in plaintext.',
    remediation: 'Use IMAPS (port 993) with TLS encryption instead.',
  },
  {
    port: 389,
    service: 'LDAP',
    severity: 'HIGH',
    cvssScore: 7.5,
    cveIds: [],
    description: 'LDAP is publicly accessible. This could expose directory information and user credentials.',
    impact: 'Directory enumeration, credential harvesting, and potential authentication bypass.',
    remediation: 'Restrict LDAP access to internal networks only. Use LDAPS (port 636) with TLS.',
  },
  {
    port: 445,
    service: 'SMB',
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cveIds: ['CVE-2017-0144', 'CVE-2020-0796'],
    description: 'SMB (Server Message Block) is accessible from the internet. This port is associated with EternalBlue (WannaCry/NotPetya) and other critical exploits.',
    impact: 'Remote code execution, ransomware infection, lateral movement, complete system compromise.',
    remediation: 'Block port 445 immediately at the firewall. Never expose SMB to the public internet.',
  },
  {
    port: 3306,
    service: 'MySQL',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cveIds: [],
    description: 'MySQL database port is publicly accessible. This directly exposes the database to the internet.',
    impact: 'Database contents can be accessed directly. Brute force attacks, SQL injection, and data exfiltration.',
    remediation: 'Block port 3306 at the firewall. Only allow connections from application servers via VPC/internal network.',
  },
  {
    port: 3389,
    service: 'RDP',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cveIds: ['CVE-2019-0708', 'CVE-2020-0609'],
    description: 'RDP (Remote Desktop Protocol) is accessible from the internet. RDP has numerous critical vulnerabilities including BlueKeep.',
    impact: 'Remote code execution, ransomware delivery, credential brute-forcing, complete system takeover.',
    remediation: 'Block port 3389 externally. Use a VPN or bastion host for remote administration.',
  },
  {
    port: 5432,
    service: 'PostgreSQL',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cveIds: [],
    description: 'PostgreSQL database is publicly accessible on port 5432.',
    impact: 'Database exposure to brute-force attacks and direct exploitation.',
    remediation: 'Block port 5432 at the firewall. Database should only be accessible from application tier.',
  },
  {
    port: 5900,
    service: 'VNC',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    cveIds: ['CVE-2019-15694'],
    description: 'VNC (Virtual Network Computing) is publicly accessible. VNC provides full graphical remote control.',
    impact: 'Complete desktop access with weak or no authentication. Frequently exploited.',
    remediation: 'Block VNC externally. Use VPN-protected access or strong authentication.',
  },
  {
    port: 6379,
    service: 'Redis',
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cveIds: ['CVE-2022-0543'],
    description: 'Redis is publicly accessible without authentication. This is a critical misconfiguration.',
    impact: 'Complete data exfiltration, remote code execution via Redis configuration commands, server takeover.',
    remediation: 'Block port 6379 externally. Configure Redis with a strong requirepass password and bind to localhost only.',
  },
  {
    port: 8080,
    service: 'HTTP Alt',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    cveIds: [],
    description: 'An alternate HTTP port (8080) is accessible. This may expose admin panels, development servers, or proxy interfaces.',
    impact: 'Potential exposure of admin interfaces, internal services, or development builds.',
    remediation: 'Review what is running on port 8080. Restrict access if not intended to be public.',
  },
  {
    port: 8443,
    service: 'HTTPS Alt',
    severity: 'INFO',
    cvssScore: 2.0,
    cveIds: [],
    description: 'An alternate HTTPS port (8443) is accessible.',
    impact: 'May expose additional services or admin interfaces.',
    remediation: 'Review services on port 8443 and ensure proper authentication.',
  },
  {
    port: 9200,
    service: 'Elasticsearch',
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cveIds: [],
    description: 'Elasticsearch REST API is publicly accessible without authentication. Thousands of Elasticsearch databases have been breached.',
    impact: 'Full data breach — all indexed documents are accessible without credentials.',
    remediation: 'Block port 9200 externally. Configure Elasticsearch security/X-Pack with authentication.',
  },
  {
    port: 27017,
    service: 'MongoDB',
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cveIds: [],
    description: 'MongoDB is publicly accessible. Unauthenticated access has led to millions of exposed records.',
    impact: 'All database collections accessible without authentication. Ransom attacks are common.',
    remediation: 'Block port 27017 externally. Enable MongoDB authentication and bind to localhost.',
  },
  {
    port: 9092,
    service: 'Kafka',
    severity: 'HIGH',
    cvssScore: 7.5,
    cveIds: [],
    description: 'Apache Kafka broker is publicly accessible.',
    impact: 'Unauthorized consumption or production of messages, data exfiltration, denial of service.',
    remediation: 'Block Kafka ports externally. Configure SASL authentication and TLS encryption.',
  },
  {
    port: 5672,
    service: 'RabbitMQ',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    cveIds: [],
    description: 'RabbitMQ AMQP port is publicly accessible.',
    impact: 'Unauthorized message queue access, potential data exposure.',
    remediation: 'Restrict RabbitMQ access to internal networks. Use TLS and strong credentials.',
  },
]

export async function runPortsModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []
  const hostname = extractHostname(url)

  const portChecks = DANGEROUS_PORTS.map(async (portInfo) => {
    const result = await checkPort(hostname, portInfo.port)
    if (result.open) {
      const bannerEvidence = result.banner ? `\nBanner: ${result.banner}` : ''
      findings.push({
        id: makeId(),
        category: 'Infrastructure / Ports',
        name: `Port ${portInfo.port} (${portInfo.service}) Open`,
        severity: portInfo.severity,
        cvssScore: portInfo.cvssScore,
        cveIds: portInfo.cveIds,
        description: portInfo.description,
        evidence: `Host: ${hostname}:${portInfo.port} — Connection accepted${bannerEvidence}`,
        impact: portInfo.impact,
        remediation: portInfo.remediation,
        references: [],
        pciDss: portInfo.port === 445 || portInfo.port === 3306 ? ['1.3.2'] : undefined,
      })
    }
  })

  await Promise.allSettled(portChecks)

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    module: 'ports',
    findings,
    duration: Date.now() - start,
  }
}
