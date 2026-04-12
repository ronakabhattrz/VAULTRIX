import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const LOGIN_PATHS = [
  '/login', '/signin', '/auth/login', '/user/login', '/account/login',
  '/wp-login.php', '/admin/login', '/auth', '/sign-in',
]

const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/

export async function runAuthModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  // Check JWT in URL query params
  try {
    const urlObj = new URL(url)
    for (const [key, value] of Array.from(urlObj.searchParams.entries())) {
      if (JWT_REGEX.test(value)) {
        findings.push({
          id: makeId(),
          category: 'Authentication',
          name: 'JWT Token Exposed in URL',
          severity: 'HIGH',
          cvssScore: 7.5,
          cveIds: [],
          description: `A JWT token was found in the URL query parameter "${key}". Tokens in URLs are logged by servers, browsers, and proxies.`,
          evidence: `URL contains JWT in parameter: ${key}=eyJ...`,
          impact: 'JWT tokens in URLs may appear in server logs, browser history, and referrer headers, leading to token theft.',
          remediation: 'Never pass authentication tokens in URLs. Use Authorization headers or secure cookies instead.',
          references: ['https://owasp.org/www-community/vulnerabilities/Insufficient_Session-ID_Length'],
          owaspId: 'A07:2021',
        })
      }
    }
  } catch {
    // ignore
  }

  // Check for login pages
  let mainHtml = ''
  try {
    const mainRes = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
    })
    mainHtml = typeof mainRes.data === 'string' ? mainRes.data : ''
  } catch {
    return { module: 'auth', findings, duration: Date.now() - start }
  }

  // Check login on HTTP
  if (!url.startsWith('https://') && /<input[^>]+type\s*=\s*['"]?password['"]?/i.test(mainHtml)) {
    findings.push({
      id: makeId(),
      category: 'Authentication',
      name: 'Login Page Accessible Over HTTP (No Encryption)',
      severity: 'CRITICAL',
      cvssScore: 9.1,
      cveIds: [],
      description: 'A login form with a password field was found on an HTTP (unencrypted) page.',
      evidence: `URL: ${url} — Found password input on HTTP page`,
      impact: 'Credentials transmitted in plaintext are visible to any network observer.',
      remediation: 'Implement HTTPS for all pages containing login forms. Redirect HTTP to HTTPS.',
      references: ['https://owasp.org/www-project-web-security-testing-guide/'],
      owaspId: 'A02:2021',
      pciDss: ['4.2.1'],
    })
  }

  // Check additional login paths
  const loginPageChecks = LOGIN_PATHS.map(async (path) => {
    try {
      const loginUrl = new URL(path, url).href
      const res = await axios.get(loginUrl, {
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })

      if (res.status !== 200) return
      const loginHtml = typeof res.data === 'string' ? res.data : ''
      const $ = cheerio.load(loginHtml)

      // Check autocomplete on password fields
      $('input[type="password"]').each((_, el) => {
        const autocomplete = $(el).attr('autocomplete')
        if (!autocomplete || autocomplete.toLowerCase() !== 'new-password') {
          findings.push({
            id: makeId(),
            category: 'Authentication',
            name: `Password Field Autocomplete Not Disabled: ${path}`,
            severity: 'LOW',
            cvssScore: 2.6,
            cveIds: [],
            description: `The password field on ${path} does not explicitly disable autocomplete, allowing browsers to save passwords.`,
            evidence: `Input found at ${loginUrl}: autocomplete="${autocomplete ?? 'not set'}"`,
            impact: 'On shared computers, saved passwords could expose accounts.',
            remediation: 'For login forms set autocomplete="off" on the form or autocomplete="current-password" on the input.',
            references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion'],
            owaspId: 'A07:2021',
          })
        }
      })

      // Check for password field with type="text"
      $('input[name*="password"], input[id*="password"]').each((_, el) => {
        const type = $(el).attr('type')
        if (type === 'text' || !type) {
          findings.push({
            id: makeId(),
            category: 'Authentication',
            name: `Password Field Not Masked: ${path}`,
            severity: 'HIGH',
            cvssScore: 6.5,
            cveIds: [],
            description: `A password input field on ${path} uses type="text" instead of type="password", displaying the password in plaintext.`,
            evidence: `<input name/id contains "password" with type="${type ?? 'text'}" at ${loginUrl}`,
            impact: 'Passwords visible on screen (shoulder surfing), stored in browser history as form data.',
            remediation: 'Change input type to "password" for all password fields.',
            references: [],
            owaspId: 'A07:2021',
          })
        }
      })

      // Check for rate limiting headers
      const hasRateLimit = res.headers['x-ratelimit-limit'] || res.headers['retry-after']
      if (!hasRateLimit && (/<input[^>]+type\s*=\s*['"]?password['"]?/i.test(loginHtml))) {
        findings.push({
          id: makeId(),
          category: 'Authentication',
          name: `Login Page Without Visible Rate Limiting: ${path}`,
          severity: 'MEDIUM',
          cvssScore: 5.3,
          cveIds: [],
          description: `The login page at ${path} does not return rate limiting headers, suggesting brute-force protection may not be implemented.`,
          evidence: `GET ${loginUrl} → HTTP ${res.status}, no X-RateLimit-* headers`,
          impact: 'Attackers can attempt unlimited password guesses, enabling brute-force and credential stuffing attacks.',
          remediation: 'Implement account lockout or rate limiting. Use CAPTCHA after failed attempts. Consider fail2ban or similar solutions.',
          references: ['https://owasp.org/www-project-web-security-testing-guide/'],
          owaspId: 'A07:2021',
        })
      }
    } catch {
      // ignore
    }
  })

  await Promise.allSettled(loginPageChecks)

  return {
    module: 'auth',
    findings,
    duration: Date.now() - start,
  }
}
