import axios from 'axios'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function runCORSModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  const attackerOrigin = 'https://attacker-vaultrix-test.com'

  // Test with attacker origin
  let acao: string | undefined
  let acac: string | undefined
  let acam: string | undefined

  try {
    const res = await axios.options(url, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Vaultrix-Security-Scanner/1.0',
        'Origin': attackerOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization',
      },
    })

    acao = res.headers['access-control-allow-origin']
    acac = res.headers['access-control-allow-credentials']
    acam = res.headers['access-control-allow-methods']
  } catch {
    // Try GET instead
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Vaultrix-Security-Scanner/1.0',
          'Origin': attackerOrigin,
        },
      })
      acao = res.headers['access-control-allow-origin']
      acac = res.headers['access-control-allow-credentials']
      acam = res.headers['access-control-allow-methods']
    } catch {
      return { module: 'cors', findings: [], duration: Date.now() - start, error: 'Request failed' }
    }
  }

  if (!acao) {
    return { module: 'cors', findings: [], duration: Date.now() - start }
  }

  const allowsCredentials = acac?.toLowerCase() === 'true'

  // Wildcard with credentials (most critical)
  if (acao === '*' && allowsCredentials) {
    findings.push({
      id: makeId(),
      category: 'CORS',
      name: 'CORS: Wildcard Origin with Credentials Allowed',
      severity: 'CRITICAL',
      cvssScore: 9.8,
      cveIds: [],
      description: 'The server allows CORS with Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true. This is an invalid and dangerous configuration.',
      evidence: `Access-Control-Allow-Origin: ${acao}\nAccess-Control-Allow-Credentials: ${acac}`,
      impact: 'Any website can make authenticated requests to this API on behalf of logged-in users, enabling full account takeover.',
      remediation: 'Never combine wildcard origin with credentials. Use explicit origin allowlist: Access-Control-Allow-Origin: https://yourdomain.com',
      references: ['https://owasp.org/www-project-web-security-testing-guide/', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'],
      owaspId: 'A05:2021',
    })
  } else if (acao === '*') {
    findings.push({
      id: makeId(),
      category: 'CORS',
      name: 'CORS: Wildcard Origin Allowed',
      severity: 'HIGH',
      cvssScore: 7.5,
      cveIds: [],
      description: 'The server uses Access-Control-Allow-Origin: * allowing any website to make cross-origin requests.',
      evidence: `Access-Control-Allow-Origin: *`,
      impact: 'Any website can read responses from this server\'s API endpoints.',
      remediation: 'Restrict CORS to specific trusted origins. Use an allowlist instead of wildcard.',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'],
      owaspId: 'A05:2021',
    })
  }

  // Reflects arbitrary origin
  if (acao === attackerOrigin) {
    findings.push({
      id: makeId(),
      category: 'CORS',
      name: 'CORS: Arbitrary Origin Reflected',
      severity: allowsCredentials ? 'CRITICAL' : 'HIGH',
      cvssScore: allowsCredentials ? 9.8 : 7.5,
      cveIds: [],
      description: `The server reflects the requesting origin in Access-Control-Allow-Origin, allowing any domain to make cross-origin requests${allowsCredentials ? ' with credentials' : ''}.`,
      evidence: `Sent Origin: ${attackerOrigin}\nReceived Access-Control-Allow-Origin: ${acao}\nAccess-Control-Allow-Credentials: ${acac ?? 'not set'}`,
      impact: allowsCredentials
        ? 'Any attacker website can make authenticated API calls on behalf of logged-in victims, enabling data theft and account takeover.'
        : 'Any website can read API responses. If credentials are added later, this becomes critical.',
      remediation: 'Implement a strict origin allowlist and only reflect origins that are explicitly whitelisted.',
      references: ['https://portswigger.net/web-security/cors'],
      owaspId: 'A05:2021',
    })
  }

  // Dangerous methods
  if (acam) {
    const methods = acam.toUpperCase().split(',').map(m => m.trim())
    const dangerousMethods = ['DELETE', 'PUT', 'PATCH']
    const foundDangerous = methods.filter(m => dangerousMethods.includes(m))
    if (foundDangerous.length > 0) {
      findings.push({
        id: makeId(),
        category: 'CORS',
        name: 'CORS: Dangerous HTTP Methods Allowed',
        severity: 'MEDIUM',
        cvssScore: 5.3,
        cveIds: [],
        description: `CORS configuration allows potentially dangerous HTTP methods: ${foundDangerous.join(', ')}`,
        evidence: `Access-Control-Allow-Methods: ${acam}`,
        impact: 'Cross-origin requests with destructive HTTP methods may be possible.',
        remediation: 'Restrict CORS methods to only those required. Remove DELETE, PUT, PATCH unless explicitly needed cross-origin.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'],
        owaspId: 'A05:2021',
      })
    }
  }

  return {
    module: 'cors',
    findings,
    duration: Date.now() - start,
  }
}
