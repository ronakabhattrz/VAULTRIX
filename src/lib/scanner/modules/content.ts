import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Finding, ScannerResult, TechStack } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

// jQuery versions with known vulnerabilities
const VULNERABLE_JQUERY_VERSIONS: Record<string, string[]> = {
  '1.': ['CVE-2019-11358', 'CVE-2020-11022', 'CVE-2020-11023'],
  '2.': ['CVE-2019-11358', 'CVE-2020-11022', 'CVE-2020-11023'],
  '3.0': ['CVE-2019-11358'],
  '3.1': ['CVE-2019-11358'],
  '3.2': ['CVE-2019-11358'],
  '3.3': ['CVE-2019-11358'],
  '3.4': ['CVE-2020-11022', 'CVE-2020-11023'],
}

function detectJQueryVersion(html: string, scripts: string[]): { version: string; vulnerable: boolean; cves: string[] } | null {
  // Check meta or inline patterns
  const jqueryVersionPatterns = [
    /jquery[.\-\/](\d+\.\d+\.?\d*)(\.min)?\.js/i,
    /jQuery v(\d+\.\d+\.?\d*)/i,
    /\* jQuery JavaScript Library v(\d+\.\d+\.?\d*)/i,
  ]

  for (const pattern of jqueryVersionPatterns) {
    const match = html.match(pattern) || scripts.join('\n').match(pattern)
    if (match) {
      const version = match[1]
      const vulnerable = parseFloat(version) < 3.5
      const cves = vulnerable ? (VULNERABLE_JQUERY_VERSIONS[version.substring(0, 3)] || VULNERABLE_JQUERY_VERSIONS[version.substring(0, 2)]) ?? [] : []
      return { version, vulnerable, cves }
    }
  }
  return null
}

export async function runContentModule(url: string): Promise<ScannerResult & { techStack: TechStack }> {
  const start = Date.now()
  const findings: Finding[] = []
  const techStack: TechStack = { analytics: [], libraries: [] }

  let html = ''
  let headers: Record<string, string> = {}

  try {
    const res = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
    })
    html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    headers = Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), String(v)]))
  } catch {
    return { module: 'content', findings: [], duration: Date.now() - start, techStack, error: 'Failed to fetch' }
  }

  const $ = cheerio.load(html)

  // CMS Detection
  if (html.includes('/wp-content/') || html.includes('/wp-includes/')) {
    techStack.cms = 'WordPress'
    const generatorMeta = $('meta[name="generator"]').attr('content')
    if (generatorMeta?.includes('WordPress')) {
      const versionMatch = generatorMeta.match(/WordPress (\d+\.\d+\.?\d*)/)
      if (versionMatch) {
        techStack.cms = `WordPress ${versionMatch[1]}`
        findings.push({
          id: makeId(),
          category: 'Content / Technology',
          name: `WordPress Version Disclosed: ${versionMatch[1]}`,
          severity: 'MEDIUM',
          cvssScore: 5.3,
          cveIds: [],
          description: `WordPress version ${versionMatch[1]} is disclosed via the meta generator tag.`,
          evidence: `<meta name="generator" content="${generatorMeta}">`,
          impact: 'Version disclosure enables targeted attacks against known WordPress vulnerabilities.',
          remediation: 'Remove the generator meta tag: remove_action("wp_head", "wp_generator");',
          references: ['https://wordpress.org/support/article/hardening-wordpress/'],
          owaspId: 'A05:2021',
        })
      }
    }
  } else if (html.includes('/sites/all/') || html.includes('Drupal.settings') || html.includes('/misc/drupal.js')) {
    techStack.cms = 'Drupal'
  } else if (html.includes('Joomla') || html.includes('/media/jui/') || html.includes('joomla')) {
    techStack.cms = 'Joomla'
  } else if (html.includes('Magento') || html.includes('mage/') || html.includes('Mage.Cookies')) {
    techStack.cms = 'Magento'
  } else if (html.includes('Shopify.theme') || html.includes('cdn.shopify.com')) {
    techStack.cms = 'Shopify'
  } else if (html.includes('static.wixstatic.com')) {
    techStack.cms = 'Wix'
  } else if (html.includes('squarespace.com') || html.includes('sqsp.net')) {
    techStack.cms = 'Squarespace'
  }

  // Framework Detection (from HTML patterns + headers)
  const poweredBy = headers['x-powered-by'] || ''
  if (poweredBy.toLowerCase().includes('express') || html.includes('Express')) {
    techStack.framework = 'Express.js'
  } else if (poweredBy.toLowerCase().includes('next.js') || headers['x-nextjs-cache'] || headers['x-vercel-id']) {
    techStack.framework = 'Next.js'
  } else if (html.includes('__nuxt') || html.includes('_nuxt/')) {
    techStack.framework = 'Nuxt.js'
  } else if (poweredBy.toLowerCase().includes('php') || headers['x-php-version']) {
    const phpVersion = headers['x-php-version'] || poweredBy.match(/PHP\/([\d.]+)/i)?.[1]
    techStack.framework = phpVersion ? `PHP ${phpVersion}` : 'PHP'
  } else if (poweredBy.toLowerCase().includes('asp.net') || headers['x-aspnet-version'] || headers['x-aspnetmvc-version']) {
    techStack.framework = 'ASP.NET'
  } else if (html.includes('django') || headers['x-django-debug'] || html.includes('csrftoken')) {
    techStack.framework = 'Django'
  } else if (html.includes('_rails') || headers['x-runtime']?.includes('.')) {
    techStack.framework = 'Ruby on Rails'
  } else if (html.includes('Laravel') || headers['set-cookie']?.includes('laravel_session')) {
    techStack.framework = 'Laravel'
  }

  // Server Detection
  const server = headers['server'] || ''
  if (server.toLowerCase().includes('nginx')) techStack.server = 'Nginx'
  else if (server.toLowerCase().includes('apache')) techStack.server = 'Apache'
  else if (server.toLowerCase().includes('iis')) techStack.server = 'IIS'
  else if (server.toLowerCase().includes('litespeed')) techStack.server = 'LiteSpeed'
  else if (server.toLowerCase().includes('cloudflare')) techStack.server = 'Cloudflare'

  // CDN Detection
  if (headers['cf-ray'] || headers['cf-cache-status']) techStack.cdn = 'Cloudflare'
  else if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) techStack.cdn = 'CloudFront'
  else if (headers['x-fastly-request-id'] || headers['fastly-debug-digest']) techStack.cdn = 'Fastly'
  else if (headers['x-akamai-transformed'] || headers['x-check-cacheable']) techStack.cdn = 'Akamai'

  // WAF Detection (positive signals)
  if (headers['cf-ray']) {
    techStack.waf = 'Cloudflare'
    findings.push({
      id: makeId(),
      category: 'Infrastructure',
      name: 'Cloudflare WAF Detected',
      severity: 'INFO',
      cvssScore: 0,
      cveIds: [],
      description: 'Cloudflare WAF/CDN is in front of this site, providing DDoS protection and security filtering.',
      evidence: `cf-ray header present: ${headers['cf-ray']}`,
      impact: 'Positive: Enhanced protection against common web attacks.',
      remediation: 'Ensure WAF rules are properly configured and up to date.',
      references: ['https://www.cloudflare.com/waf/'],
    })
  } else if (html.includes('sucuri') || headers['x-sucuri-id']) {
    techStack.waf = 'Sucuri'
    findings.push({
      id: makeId(),
      category: 'Infrastructure',
      name: 'Sucuri WAF Detected',
      severity: 'INFO',
      cvssScore: 0,
      cveIds: [],
      description: 'Sucuri WAF is protecting this site.',
      evidence: 'Sucuri headers/signatures detected',
      impact: 'Positive: Web Application Firewall is active.',
      remediation: 'Keep WAF rules updated.',
      references: ['https://sucuri.net/'],
    })
  }

  // Analytics Detection
  if (html.includes('google-analytics.com') || html.includes('gtag/js') || html.includes('GA_TRACKING_ID') || html.includes('UA-') || html.includes('G-')) {
    techStack.analytics?.push('Google Analytics')
  }
  if (html.includes('googletagmanager.com')) techStack.analytics?.push('Google Tag Manager')
  if (html.includes('hotjar.com')) techStack.analytics?.push('Hotjar')
  if (html.includes('mixpanel.com')) techStack.analytics?.push('Mixpanel')
  if (html.includes('posthog.com')) techStack.analytics?.push('PostHog')

  // JavaScript Library Detection
  const jqueryInfo = detectJQueryVersion(html, [])
  if (jqueryInfo) {
    techStack.libraries?.push({ name: 'jQuery', version: jqueryInfo.version, vulnerable: jqueryInfo.vulnerable })
    if (jqueryInfo.vulnerable) {
      findings.push({
        id: makeId(),
        category: 'Content / Technology',
        name: `Outdated jQuery Version: ${jqueryInfo.version}`,
        severity: 'MEDIUM',
        cvssScore: 6.1,
        cveIds: jqueryInfo.cves,
        description: `jQuery version ${jqueryInfo.version} is in use. This version has known security vulnerabilities.`,
        evidence: `jQuery version ${jqueryInfo.version} detected in page source`,
        impact: 'XSS vulnerabilities in jQuery prototype pollution can be exploited.',
        remediation: 'Upgrade jQuery to version 3.5.0 or later.',
        references: ['https://jquery.com/upgrade-guide/3.5/'],
        owaspId: 'A06:2021',
      })
    }
  }

  // Angular, React, Vue detection
  if (html.includes('ng-app') || html.includes('ng-controller') || html.includes('angular.min.js')) {
    techStack.libraries?.push({ name: 'AngularJS' })
  }
  if (html.includes('react.min.js') || html.includes('react.development.js') || html.includes('__REACT_DEVTOOLS')) {
    techStack.libraries?.push({ name: 'React' })
  }
  if (html.includes('vue.min.js') || html.includes('__vue__') || html.includes('vue.global.js')) {
    techStack.libraries?.push({ name: 'Vue.js' })
  }

  // JS source maps
  const sourceMapRefs = html.match(/\/\/# sourceMappingURL=([^\s]+\.map)/g) || []
  if (sourceMapRefs.length > 0) {
    findings.push({
      id: makeId(),
      category: 'Application',
      name: 'JavaScript Source Maps Exposed',
      severity: 'MEDIUM',
      cvssScore: 4.3,
      cveIds: [],
      description: `${sourceMapRefs.length} JavaScript source map reference(s) found in production code.`,
      evidence: sourceMapRefs.slice(0, 3).join('\n'),
      impact: 'Source maps allow attackers to read the original, unminified source code, revealing business logic and potential vulnerabilities.',
      remediation: 'Remove source map references from production bundles. Configure webpack/build tools to exclude source maps in production.',
      references: ['https://owasp.org/www-project-web-security-testing-guide/'],
      owaspId: 'A05:2021',
    })
  }

  // HTTP/2 detection
  const altSvc = headers['alt-svc']
  if (altSvc?.includes('h2') || headers['upgrade']?.includes('h2')) {
    techStack.libraries?.push({ name: 'HTTP/2' })
    findings.push({
      id: makeId(),
      category: 'Performance',
      name: 'HTTP/2 Supported',
      severity: 'INFO',
      cvssScore: 0,
      cveIds: [],
      description: 'The server supports HTTP/2, improving performance and security.',
      evidence: `alt-svc: ${altSvc || 'HTTP/2 upgrade header present'}`,
      impact: 'Positive: HTTP/2 provides better multiplexing, header compression, and performance.',
      remediation: 'No action required.',
      references: [],
    })
  }

  return {
    module: 'content',
    findings,
    duration: Date.now() - start,
    techStack,
  }
}
