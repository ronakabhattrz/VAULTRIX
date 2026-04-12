import axios from 'axios'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function runPerformanceModule(url: string): Promise<ScannerResult & { responseTime: number }> {
  const start = Date.now()
  const findings: Finding[] = []
  let responseTime = 0

  try {
    const reqStart = Date.now()
    const res = await axios.get(url, {
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      decompress: true,
    })
    responseTime = Date.now() - reqStart

    const resHeaders = Object.fromEntries(
      Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), String(v)])
    )

    // Response time
    if (responseTime > 3000) {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: `Slow Server Response Time: ${responseTime}ms`,
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: `The server took ${responseTime}ms to respond, which is above the 3000ms threshold.`,
        evidence: `Response time: ${responseTime}ms`,
        impact: 'Slow response times affect user experience and SEO rankings.',
        remediation: 'Optimize server performance. Consider CDN, caching, database query optimization.',
        references: ['https://web.dev/ttfb/'],
      })
    }

    // Compression
    const contentEncoding = resHeaders['content-encoding']
    if (!contentEncoding || (!contentEncoding.includes('gzip') && !contentEncoding.includes('br'))) {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: 'Response Compression Not Enabled',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'The server does not appear to use gzip or Brotli compression for responses.',
        evidence: `Content-Encoding: ${contentEncoding ?? 'not present'}`,
        impact: 'Uncompressed responses consume more bandwidth and load slower for users.',
        remediation: 'Enable Brotli (preferred) or gzip compression on your web server. For Nginx: gzip on; brotli on;',
        references: ['https://web.dev/uses-text-compression/'],
      })
    } else {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: `Response Compression Enabled: ${contentEncoding}`,
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: `Server uses ${contentEncoding} compression, reducing transfer sizes.`,
        evidence: `Content-Encoding: ${contentEncoding}`,
        impact: 'Positive: Compressed responses improve page load times.',
        remediation: 'No action required.',
        references: [],
      })
    }

    // CDN detection
    const hasCDN = resHeaders['cf-ray'] || resHeaders['x-amz-cf-id'] || resHeaders['x-fastly-request-id'] || resHeaders['x-cache'] || resHeaders['x-cdn']
    if (hasCDN) {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: 'CDN Detected',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'A Content Delivery Network (CDN) is in use.',
        evidence: `CDN headers detected: ${Object.entries(resHeaders).filter(([k]) => ['cf-ray', 'x-amz-cf-id', 'x-fastly-request-id', 'x-cache'].includes(k)).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        impact: 'Positive: CDN provides better performance and some DDoS protection.',
        remediation: 'No action required.',
        references: [],
      })
    }

    // HTTP/2
    const altSvc = resHeaders['alt-svc']
    if (altSvc?.includes('h2') || altSvc?.includes('h3')) {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: `Modern Protocol Supported: ${altSvc?.includes('h3') ? 'HTTP/3 (QUIC)' : 'HTTP/2'}`,
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: `The server advertises support for ${altSvc?.includes('h3') ? 'HTTP/3 via QUIC' : 'HTTP/2'}.`,
        evidence: `alt-svc: ${altSvc}`,
        impact: 'Positive: Modern protocols provide better performance.',
        remediation: 'No action required.',
        references: [],
      })
    }

    // Cache-Control
    const cacheControl = resHeaders['cache-control']
    if (!cacheControl) {
      findings.push({
        id: makeId(),
        category: 'Performance',
        name: 'Missing Cache-Control Header',
        severity: 'INFO',
        cvssScore: 0,
        cveIds: [],
        description: 'No Cache-Control header is set, leaving caching behavior up to browsers.',
        evidence: 'Header "Cache-Control" not present',
        impact: 'Unpredictable caching behavior may affect performance.',
        remediation: 'Set appropriate Cache-Control headers. For static assets: max-age=31536000,immutable. For dynamic: no-store or max-age=0,must-revalidate.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control'],
      })
    }
  } catch (err) {
    return {
      module: 'performance',
      findings,
      duration: Date.now() - start,
      responseTime,
      error: `Request failed: ${String(err)}`,
    }
  }

  return {
    module: 'performance',
    findings,
    duration: Date.now() - start,
    responseTime,
  }
}
