import axios from 'axios'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

interface ParsedCookie {
  name: string
  value: string
  secure: boolean
  httpOnly: boolean
  sameSite?: string
  domain?: string
  maxAge?: number
  path?: string
  raw: string
}

function parseCookieHeader(setCookieHeader: string | string[]): ParsedCookie[] {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  return headers.map((raw) => {
    const parts = raw.split(';').map(p => p.trim())
    const [nameValue, ...attributes] = parts
    const eqIdx = nameValue.indexOf('=')
    const name = eqIdx > -1 ? nameValue.substring(0, eqIdx) : nameValue
    const value = eqIdx > -1 ? nameValue.substring(eqIdx + 1) : ''

    const attrsLower = attributes.map(a => a.toLowerCase())
    const secure = attrsLower.some(a => a === 'secure')
    const httpOnly = attrsLower.some(a => a === 'httponly')
    const sameSiteAttr = attributes.find(a => a.toLowerCase().startsWith('samesite='))
    const sameSite = sameSiteAttr ? sameSiteAttr.split('=')[1]?.trim() : undefined
    const domainAttr = attributes.find(a => a.toLowerCase().startsWith('domain='))
    const domain = domainAttr ? domainAttr.split('=')[1]?.trim() : undefined
    const maxAgeAttr = attributes.find(a => a.toLowerCase().startsWith('max-age='))
    const maxAge = maxAgeAttr ? parseInt(maxAgeAttr.split('=')[1]) : undefined

    return { name, value, secure, httpOnly, sameSite, domain, maxAge, path: undefined, raw }
  })
}

export async function runCookiesModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  let rawSetCookies: string[] = []
  const isHttps = url.startsWith('https://')

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
    })

    const setCookie = res.headers['set-cookie']
    if (!setCookie) {
      return { module: 'cookies', findings: [], duration: Date.now() - start }
    }
    rawSetCookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  } catch {
    return { module: 'cookies', findings: [], duration: Date.now() - start, error: 'Failed to fetch' }
  }

  const cookies = parseCookieHeader(rawSetCookies)

  for (const cookie of cookies) {
    // Missing Secure flag
    if (!cookie.secure && isHttps) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Cookie Missing Secure Flag: ${cookie.name}`,
        severity: 'HIGH',
        cvssScore: 6.1,
        cveIds: [],
        description: `The cookie "${cookie.name}" is set without the Secure flag, allowing it to be transmitted over unencrypted HTTP connections.`,
        evidence: `Set-Cookie: ${cookie.raw.substring(0, 150)}`,
        impact: 'Cookie can be transmitted over HTTP, allowing interception by network attackers.',
        remediation: `Add the Secure flag: Set-Cookie: ${cookie.name}=...; Secure; HttpOnly; SameSite=Strict`,
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security'],
        owaspId: 'A02:2021',
        pciDss: ['6.5.10'],
      })
    }

    // Missing HttpOnly flag
    if (!cookie.httpOnly) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Cookie Missing HttpOnly Flag: ${cookie.name}`,
        severity: 'HIGH',
        cvssScore: 6.1,
        cveIds: [],
        description: `The cookie "${cookie.name}" is set without the HttpOnly flag, making it accessible to JavaScript.`,
        evidence: `Set-Cookie: ${cookie.raw.substring(0, 150)}`,
        impact: 'XSS attacks can steal this cookie value, enabling session hijacking.',
        remediation: `Add the HttpOnly flag: Set-Cookie: ${cookie.name}=...; HttpOnly; Secure; SameSite=Strict`,
        references: ['https://owasp.org/www-community/HttpOnly'],
        owaspId: 'A07:2021',
      })
    }

    // Missing SameSite
    if (!cookie.sameSite) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Cookie Missing SameSite Attribute: ${cookie.name}`,
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: `The cookie "${cookie.name}" does not have a SameSite attribute, which helps prevent CSRF attacks.`,
        evidence: `Set-Cookie: ${cookie.raw.substring(0, 150)}`,
        impact: 'Without SameSite, cookies are sent with cross-site requests, enabling CSRF attacks.',
        remediation: `Add SameSite attribute: Set-Cookie: ${cookie.name}=...; SameSite=Strict or SameSite=Lax`,
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite'],
        owaspId: 'A01:2021',
      })
    }

    // SameSite=None without Secure
    if (cookie.sameSite?.toLowerCase() === 'none' && !cookie.secure) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Cookie SameSite=None Without Secure: ${cookie.name}`,
        severity: 'HIGH',
        cvssScore: 6.5,
        cveIds: [],
        description: `The cookie "${cookie.name}" is set with SameSite=None but without the Secure flag. Browsers may block this cookie.`,
        evidence: `Set-Cookie: ${cookie.raw.substring(0, 150)}`,
        impact: 'Invalid cookie configuration; modern browsers will reject this cookie.',
        remediation: 'If SameSite=None is required for cross-site usage, also add the Secure flag.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite'],
        owaspId: 'A05:2021',
      })
    }

    // Long session cookie max-age
    if (cookie.maxAge && cookie.maxAge > 86400 && (cookie.name.toLowerCase().includes('sess') || cookie.name.toLowerCase().includes('auth') || cookie.name.toLowerCase().includes('login'))) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Session Cookie with Long Expiry: ${cookie.name}`,
        severity: 'MEDIUM',
        cvssScore: 3.7,
        cveIds: [],
        description: `The session cookie "${cookie.name}" has a max-age of ${Math.floor(cookie.maxAge / 86400)} days, longer than recommended for session cookies.`,
        evidence: `Set-Cookie: ${cookie.raw.substring(0, 150)}`,
        impact: 'Stolen session cookies remain valid for a long time, extending the attack window.',
        remediation: 'Use session-scoped cookies (no max-age/expires) or limit to 24 hours for session identifiers.',
        references: ['https://owasp.org/www-project-web-security-testing-guide/'],
        owaspId: 'A07:2021',
      })
    }

    // Predictable cookie names
    const predictableNames = ['PHPSESSID', 'JSESSIONID', 'ASP.NET_SessionId', 'CFID', 'CFTOKEN']
    if (predictableNames.some(n => cookie.name.toUpperCase() === n.toUpperCase())) {
      findings.push({
        id: makeId(),
        category: 'Cookies',
        name: `Predictable/Framework-Identifying Cookie Name: ${cookie.name}`,
        severity: 'INFO',
        cvssScore: 2.0,
        cveIds: [],
        description: `The cookie "${cookie.name}" uses a framework-default name that reveals the server-side technology.`,
        evidence: `Cookie name: ${cookie.name}`,
        impact: 'Technology fingerprinting enables targeted attacks.',
        remediation: 'Configure your framework to use a custom, non-identifying session cookie name.',
        references: [],
      })
    }
  }

  return {
    module: 'cookies',
    findings,
    duration: Date.now() - start,
  }
}
