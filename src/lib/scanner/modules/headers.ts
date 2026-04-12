import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

interface HeaderAnalysis {
  headers: Record<string, string>
  url: string
}

export async function runHeadersModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  let headers: Record<string, string> = {}
  let responseHeaders: Headers | null = null

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
    })
    responseHeaders = res.headers
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
  } catch {
    return { module: 'headers', findings: [], duration: Date.now() - start, error: 'Failed to fetch URL' }
  }

  // Content-Security-Policy
  const csp = headers['content-security-policy']
  if (!csp) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Content-Security-Policy Header',
      severity: 'HIGH',
      cvssScore: 6.1,
      cveIds: [],
      description: 'The Content-Security-Policy (CSP) header is not set. CSP prevents cross-site scripting (XSS) and other code injection attacks.',
      evidence: 'Header "Content-Security-Policy" not present in response',
      impact: 'Attackers may inject and execute malicious scripts in users\' browsers, leading to data theft, session hijacking, or malware distribution.',
      remediation: 'Add a Content-Security-Policy header. Start with: Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP', 'https://owasp.org/www-community/controls/Content_Security_Policy'],
      owaspId: 'A05:2021',
    })
  } else {
    if (csp.includes("'unsafe-inline'") && csp.includes('script-src')) {
      findings.push({
        id: makeId(),
        category: 'HTTP Headers',
        name: 'CSP Allows unsafe-inline Scripts',
        severity: 'MEDIUM',
        cvssScore: 5.4,
        cveIds: [],
        description: "The Content-Security-Policy header allows 'unsafe-inline' for scripts, which weakens XSS protection.",
        evidence: `Content-Security-Policy: ${csp.substring(0, 150)}`,
        impact: 'Inline JavaScript execution is permitted, which partially defeats the purpose of CSP for XSS prevention.',
        remediation: "Remove 'unsafe-inline' from script-src and use nonces or hashes instead.",
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src'],
        owaspId: 'A05:2021',
      })
    }
    if (csp.includes("'unsafe-eval'")) {
      findings.push({
        id: makeId(),
        category: 'HTTP Headers',
        name: 'CSP Allows unsafe-eval',
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: "The Content-Security-Policy allows 'unsafe-eval', enabling dynamic code execution via eval() and similar functions.",
        evidence: `Content-Security-Policy: ${csp.substring(0, 150)}`,
        impact: 'Dynamic code execution is permitted, which can be exploited via DOM-based XSS.',
        remediation: "Remove 'unsafe-eval' from the CSP directive and refactor code that uses eval().",
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy'],
        owaspId: 'A05:2021',
      })
    }
  }

  // Strict-Transport-Security
  const hsts = headers['strict-transport-security']
  if (!hsts) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Strict-Transport-Security (HSTS) Header',
      severity: 'HIGH',
      cvssScore: 6.5,
      cveIds: [],
      description: 'The HTTP Strict-Transport-Security (HSTS) header is not set. This header instructs browsers to only connect via HTTPS.',
      evidence: 'Header "Strict-Transport-Security" not present in response',
      impact: 'Users may be vulnerable to SSL-stripping attacks and downgrade attacks that force HTTP connections.',
      remediation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security', 'https://hstspreload.org/'],
      owaspId: 'A02:2021',
      pciDss: ['6.5.10'],
    })
  } else {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i)
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0
    if (maxAge < 15768000) {
      findings.push({
        id: makeId(),
        category: 'HTTP Headers',
        name: 'HSTS max-age Too Short',
        severity: 'LOW',
        cvssScore: 3.1,
        cveIds: [],
        description: `HSTS max-age is set to ${maxAge} seconds (${Math.floor(maxAge / 86400)} days), which is below the recommended 6 months (15768000 seconds).`,
        evidence: `Strict-Transport-Security: ${hsts}`,
        impact: 'Short HSTS lifetime reduces protection window between browser visits.',
        remediation: 'Increase max-age to at least 15768000 (6 months), ideally 31536000 (1 year).',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
        owaspId: 'A02:2021',
      })
    }
    if (!hsts.includes('includeSubDomains')) {
      findings.push({
        id: makeId(),
        category: 'HTTP Headers',
        name: 'HSTS Missing includeSubDomains',
        severity: 'LOW',
        cvssScore: 2.6,
        cveIds: [],
        description: 'The HSTS header does not include the includeSubDomains directive, leaving subdomains unprotected.',
        evidence: `Strict-Transport-Security: ${hsts}`,
        impact: 'Subdomains may still be accessible over HTTP and subject to downgrade attacks.',
        remediation: 'Add includeSubDomains to the HSTS header.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
        owaspId: 'A02:2021',
      })
    }
    if (hsts.includes('preload')) {
      findings.push({
        id: makeId(),
        category: 'HTTP Headers',
        name: 'HSTS Preload Enabled',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'HSTS preload is configured. This is a positive security signal.',
        evidence: `Strict-Transport-Security: ${hsts}`,
        impact: 'Site is eligible for HSTS preload list submission, providing stronger security.',
        remediation: 'Submit the domain to https://hstspreload.org/ if not already done.',
        references: ['https://hstspreload.org/'],
      })
    }
  }

  // X-Frame-Options
  const xfo = headers['x-frame-options']
  const hasFrameAncestors = csp && csp.includes('frame-ancestors')
  if (!xfo && !hasFrameAncestors) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing X-Frame-Options Header (Clickjacking)',
      severity: 'HIGH',
      cvssScore: 6.1,
      cveIds: ['CVE-2009-2478'],
      description: 'The X-Frame-Options header is absent and no frame-ancestors CSP directive is set. This allows the page to be embedded in iframes on other domains.',
      evidence: 'Headers "X-Frame-Options" and "frame-ancestors" CSP directive not present',
      impact: 'Attackers can embed your page in an invisible iframe overlay to trick users into performing actions (clickjacking).',
      remediation: 'Add: X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN. Alternatively, use CSP: frame-ancestors \'none\'',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options', 'https://owasp.org/www-community/attacks/Clickjacking'],
      owaspId: 'A05:2021',
    })
  }

  // X-Content-Type-Options
  const xcto = headers['x-content-type-options']
  if (!xcto || xcto.toLowerCase() !== 'nosniff') {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing or Invalid X-Content-Type-Options Header',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: 'The X-Content-Type-Options header is not set to "nosniff". This allows browsers to MIME-sniff responses away from the declared content type.',
      evidence: xcto ? `X-Content-Type-Options: ${xcto}` : 'Header not present',
      impact: 'Malicious files may be interpreted as JavaScript or HTML, enabling code execution attacks.',
      remediation: 'Add: X-Content-Type-Options: nosniff',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
      owaspId: 'A05:2021',
    })
  }

  // Referrer-Policy
  const referrerPolicy = headers['referrer-policy']
  if (!referrerPolicy) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Referrer-Policy Header',
      severity: 'LOW',
      cvssScore: 3.1,
      cveIds: [],
      description: 'The Referrer-Policy header is not set. Browsers may send sensitive URL information in the Referer header to third parties.',
      evidence: 'Header "Referrer-Policy" not present in response',
      impact: 'Sensitive URL parameters (tokens, IDs) may leak to third-party sites via the Referer header.',
      remediation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
      owaspId: 'A05:2021',
    })
  } else if (referrerPolicy.toLowerCase().includes('unsafe-url')) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Referrer-Policy Set to unsafe-url',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: 'The Referrer-Policy is set to "unsafe-url" which sends full URLs including paths and query strings to all destinations.',
      evidence: `Referrer-Policy: ${referrerPolicy}`,
      impact: 'Sensitive URL data may be exposed to external parties.',
      remediation: 'Change to: Referrer-Policy: strict-origin-when-cross-origin',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
      owaspId: 'A05:2021',
    })
  }

  // Permissions-Policy
  if (!headers['permissions-policy']) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Permissions-Policy Header',
      severity: 'LOW',
      cvssScore: 2.6,
      cveIds: [],
      description: 'The Permissions-Policy (formerly Feature-Policy) header is not set. This header controls browser feature access.',
      evidence: 'Header "Permissions-Policy" not present in response',
      impact: 'Browser features like camera, microphone, and geolocation may be accessible without restriction.',
      remediation: 'Add: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy'],
      owaspId: 'A05:2021',
    })
  }

  // Cross-Origin-Opener-Policy
  if (!headers['cross-origin-opener-policy']) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Cross-Origin-Opener-Policy Header',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: 'The Cross-Origin-Opener-Policy (COOP) header is not set. This header prevents cross-origin windows from accessing the global object.',
      evidence: 'Header "Cross-Origin-Opener-Policy" not present in response',
      impact: 'Cross-origin attacks via window.opener may be possible, enabling Spectre-based side-channel attacks.',
      remediation: 'Add: Cross-Origin-Opener-Policy: same-origin',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy'],
      owaspId: 'A05:2021',
    })
  }

  // Cross-Origin-Resource-Policy
  if (!headers['cross-origin-resource-policy']) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Missing Cross-Origin-Resource-Policy Header',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: 'The Cross-Origin-Resource-Policy (CORP) header is not set. This allows the resource to be loaded by cross-origin requests.',
      evidence: 'Header "Cross-Origin-Resource-Policy" not present in response',
      impact: 'Resources may be included in cross-origin contexts, exposing sensitive content to Spectre attacks.',
      remediation: 'Add: Cross-Origin-Resource-Policy: same-origin',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy'],
      owaspId: 'A05:2021',
    })
  }

  // Server header information disclosure
  const serverHeader = headers['server']
  if (serverHeader && /[0-9]/.test(serverHeader)) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Server Header Reveals Version Information',
      severity: 'MEDIUM',
      cvssScore: 5.3,
      cveIds: [],
      description: `The Server header discloses the web server software and version: "${serverHeader}"`,
      evidence: `Server: ${serverHeader}`,
      impact: 'Attackers can identify specific version vulnerabilities and target known exploits for the disclosed server version.',
      remediation: 'Configure your web server to suppress or minimize the Server header. For Nginx: server_tokens off; For Apache: ServerTokens Prod',
      references: ['https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server'],
      owaspId: 'A05:2021',
    })
  } else if (serverHeader) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Server Header Present',
      severity: 'LOW',
      cvssScore: 2.6,
      cveIds: [],
      description: `The Server header is present and reveals server software: "${serverHeader}"`,
      evidence: `Server: ${serverHeader}`,
      impact: 'Minor information disclosure about server software type.',
      remediation: 'Consider removing or minimizing the Server header.',
      references: ['https://owasp.org/www-project-web-security-testing-guide/'],
      owaspId: 'A05:2021',
    })
  }

  // X-Powered-By
  const poweredBy = headers['x-powered-by']
  if (poweredBy) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'X-Powered-By Header Discloses Technology',
      severity: 'LOW',
      cvssScore: 2.6,
      cveIds: [],
      description: `The X-Powered-By header reveals the server-side technology: "${poweredBy}"`,
      evidence: `X-Powered-By: ${poweredBy}`,
      impact: 'Technology disclosure aids attackers in identifying potential attack vectors.',
      remediation: 'Remove the X-Powered-By header. For Express: app.disable("x-powered-by")',
      references: ['https://owasp.org/www-project-web-security-testing-guide/'],
      owaspId: 'A05:2021',
    })
  }

  // Via header
  const via = headers['via']
  if (via) {
    findings.push({
      id: makeId(),
      category: 'HTTP Headers',
      name: 'Via Header Reveals Internal Infrastructure',
      severity: 'INFO',
      cvssScore: 2.0,
      cveIds: [],
      description: `The Via header reveals internal proxy infrastructure: "${via}"`,
      evidence: `Via: ${via}`,
      impact: 'Internal network topology disclosure.',
      remediation: 'Configure proxies to suppress the Via header.',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Via'],
    })
  }

  return {
    module: 'headers',
    findings,
    duration: Date.now() - start,
  }
}
