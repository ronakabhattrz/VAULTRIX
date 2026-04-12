import axios from 'axios'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const GRAPHQL_ENDPOINTS = ['/graphql', '/api/graphql', '/api/v1/graphql', '/query', '/gql']
const SWAGGER_ENDPOINTS = [
  '/api-docs', '/swagger', '/swagger-ui', '/swagger-ui.html',
  '/openapi.json', '/swagger.json', '/v1/docs', '/api/v1/swagger.json',
  '/api/docs', '/docs/api', '/api/swagger',
]

const GRAPHQL_INTROSPECTION_QUERY = JSON.stringify({
  query: `
    query IntrospectionQuery {
      __schema {
        types { name kind }
      }
    }
  `,
})

export async function runAPIModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  // GraphQL introspection
  const graphqlChecks = GRAPHQL_ENDPOINTS.map(async (path) => {
    try {
      const endpoint = new URL(path, url).href
      const res = await axios.post(endpoint, GRAPHQL_INTROSPECTION_QUERY, {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vaultrix-Security-Scanner/1.0',
        },
      })
      if (res.status === 200 && res.data?.data?.__schema) {
        const typeCount = res.data.data.__schema.types?.length ?? 0
        findings.push({
          id: makeId(),
          category: 'API Security',
          name: 'GraphQL Introspection Enabled',
          severity: 'MEDIUM',
          cvssScore: 5.3,
          cveIds: [],
          description: `GraphQL introspection is enabled at ${path}. This exposes the complete API schema to any caller.`,
          evidence: `POST ${endpoint} → HTTP ${res.status}, ${typeCount} types returned`,
          impact: 'Attackers can map the entire API surface, discovering all types, mutations, and queries.',
          remediation: 'Disable introspection in production: in Apollo Server set introspection: false in production.',
          references: ['https://owasp.org/www-project-api-security/'],
          owaspId: 'A01:2021',
        })
      }
    } catch {
      // ignore
    }
  })
  await Promise.allSettled(graphqlChecks)

  // Swagger / OpenAPI exposure
  const swaggerChecks = SWAGGER_ENDPOINTS.map(async (path) => {
    try {
      const endpoint = new URL(path, url).href
      const res = await axios.get(endpoint, {
        timeout: 5000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })
      if (res.status === 200) {
        const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        if (data.includes('swagger') || data.includes('openapi') || data.includes('Swagger UI') || data.includes('"paths"')) {
          findings.push({
            id: makeId(),
            category: 'API Security',
            name: `API Documentation Exposed: ${path}`,
            severity: 'MEDIUM',
            cvssScore: 5.3,
            cveIds: [],
            description: `API documentation (Swagger/OpenAPI) is publicly accessible at ${path}.`,
            evidence: `GET ${endpoint} → HTTP ${res.status}`,
            impact: 'Full API surface exposed to potential attackers, revealing endpoints, parameters, and authentication requirements.',
            remediation: 'Restrict API documentation to authenticated users or internal network access only.',
            references: ['https://owasp.org/www-project-api-security/'],
            owaspId: 'A01:2021',
          })
        }
      }
    } catch {
      // ignore
    }
  })
  await Promise.allSettled(swaggerChecks)

  // Rate limiting check
  try {
    const testEndpoints = ['/api/', '/api/v1/', '/api/v2/', url]
    for (const endpoint of testEndpoints) {
      try {
        const testUrl = endpoint.startsWith('http') ? endpoint : new URL(endpoint, url).href
        const res = await axios.get(testUrl, {
          timeout: 5000,
          validateStatus: () => true,
          headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
        })
        const hasRateLimit = res.headers['x-ratelimit-limit'] || res.headers['x-rate-limit-limit'] || res.headers['ratelimit-limit'] || res.headers['retry-after']
        if (!hasRateLimit) {
          findings.push({
            id: makeId(),
            category: 'API Security',
            name: 'No Rate Limiting Headers Detected',
            severity: 'MEDIUM',
            cvssScore: 5.3,
            cveIds: [],
            description: 'API endpoints do not return rate limiting headers (X-RateLimit-*), suggesting rate limiting may not be enforced.',
            evidence: `GET ${testUrl} — No X-RateLimit-* or Retry-After headers in response`,
            impact: 'Without rate limiting, APIs are vulnerable to brute-force attacks, credential stuffing, and DDoS.',
            remediation: 'Implement API rate limiting and return X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers.',
            references: ['https://owasp.org/www-project-api-security/', 'https://tools.ietf.org/html/rfc6585'],
            owaspId: 'A04:2021',
          })
          break
        }
        break
      } catch {
        continue
      }
    }
  } catch {
    // ignore
  }

  return {
    module: 'api',
    findings,
    duration: Date.now() - start,
  }
}
