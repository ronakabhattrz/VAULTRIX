import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Finding, ScannerResult } from '../types'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

const SENSITIVE_FILES = [
  '/.env', '/.env.local', '/.env.production', '/.env.development',
  '/.git/config', '/.git/HEAD', '/config.php', '/wp-config.php',
  '/database.yml', '/settings.py', '/web.config', '/docker-compose.yml',
  '/Dockerfile', '/.DS_Store', '/backup.sql', '/dump.sql', '/phpinfo.php',
  '/.htaccess', '/credentials.json', '/secrets.yaml', '/private_key.pem',
  '/id_rsa', '/.ssh/authorized_keys', '/config.js', '/config.json',
  '/.npmrc', '/.netrc',
]

const ADMIN_PATHS = [
  '/admin', '/wp-admin', '/administrator', '/admin.php', '/login',
  '/cpanel', '/phpmyadmin', '/adminer.php', '/manager', '/backend',
  '/admin/login', '/user/login', '/auth/login',
]

const SQL_ERROR_PATTERNS = [
  /SQL syntax.*MySQL/i, /mysql_fetch/i, /ORA-\d{5}/i, /PostgreSQL ERROR/i,
  /SQLite3::/i, /SQLSTATE/i, /Unclosed quotation mark/i,
  /supplied argument is not a valid MySQL/i, /pg_query\(\)/i,
]

const ERROR_PATTERNS = [
  /Stack trace:/i, /Fatal error:/i, /Warning:.*in.*on line/i,
  /Notice:.*in.*on line/i, /Exception in thread/i, /Traceback \(most recent call last\)/i,
]

const SECRET_PATTERNS = [
  /apiKey\s*[=:]\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
  /secret\s*[=:]\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /token\s*[=:]\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
  /AWS_ACCESS_KEY_ID\s*[=:]\s*['"](AKIA[A-Z0-9]{16})['"]/,
  /private_key\s*[=:]\s*['"][^'"]{20,}['"]/i,
  /auth_token\s*[=:]\s*['"][^'"]{20,}['"]/i,
]

export async function runWebAppModule(url: string): Promise<ScannerResult> {
  const start = Date.now()
  const findings: Finding[] = []

  let html = ''
  let headers: Record<string, string> = {}

  try {
    const res = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      validateStatus: () => true,
    })
    html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    headers = Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), String(v)]))
  } catch {
    return { module: 'webapp', findings: [], duration: Date.now() - start, error: 'Failed to fetch page' }
  }

  const $ = cheerio.load(html)

  // SQL injection indicators
  for (const pattern of SQL_ERROR_PATTERNS) {
    if (pattern.test(html)) {
      findings.push({
        id: makeId(),
        category: 'Application',
        name: 'SQL Error Message Exposed',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveIds: [],
        description: 'The page contains SQL error messages, indicating potential SQL injection vulnerabilities or unhandled database errors.',
        evidence: html.substring(html.search(pattern), html.search(pattern) + 200),
        impact: 'SQL errors reveal database type, query structure, and table names. May indicate exploitable SQL injection.',
        remediation: 'Implement proper error handling. Never display raw SQL errors to users. Use parameterized queries.',
        references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
        owaspId: 'A03:2021',
      })
      break
    }
  }

  // Error messages
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(html)) {
      findings.push({
        id: makeId(),
        category: 'Application',
        name: 'Server Error / Stack Trace Exposed',
        severity: 'HIGH',
        cvssScore: 6.5,
        cveIds: [],
        description: 'Server error messages or stack traces are visible in the page response.',
        evidence: html.substring(html.search(pattern), html.search(pattern) + 300),
        impact: 'Stack traces reveal file paths, code structure, and technology versions, aiding attackers.',
        remediation: 'Configure proper error handling and display generic error pages to users. Log detailed errors server-side only.',
        references: ['https://owasp.org/www-project-web-security-testing-guide/'],
        owaspId: 'A05:2021',
      })
      break
    }
  }

  // Directory listing
  if (/<title>Index of \//i.test(html) || /\[To Parent Directory\]/i.test(html)) {
    findings.push({
      id: makeId(),
      category: 'Application',
      name: 'Directory Listing Enabled',
      severity: 'HIGH',
      cvssScore: 7.5,
      cveIds: [],
      description: 'The web server has directory listing enabled, exposing file and directory structure.',
      evidence: 'Page title contains "Index of /" or directory listing markup detected',
      impact: 'Attackers can browse server files, discover sensitive configuration files, backups, and source code.',
      remediation: 'Disable directory listing in the web server configuration. For Apache: Options -Indexes. For Nginx: autoindex off.',
      references: ['https://owasp.org/www-project-web-security-testing-guide/'],
      owaspId: 'A05:2021',
    })
  }

  // Sensitive file exposure
  const sensitiveChecks = SENSITIVE_FILES.map(async (path) => {
    try {
      const fileUrl = new URL(path, url).href
      const res = await axios.head(fileUrl, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })
      if (res.status === 200) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: `Sensitive File Exposed: ${path}`,
          severity: 'CRITICAL',
          cvssScore: 9.1,
          cveIds: [],
          description: `The sensitive file "${path}" is publicly accessible on the web server.`,
          evidence: `GET ${fileUrl} → HTTP ${res.status}`,
          impact: 'Exposed configuration files, credentials, database dumps, or SSH keys can lead to complete system compromise.',
          remediation: `Block access to ${path} via web server configuration or .htaccess. Remove sensitive files from the web root. Use a firewall WAF rule.`,
          references: ['https://owasp.org/www-project-web-security-testing-guide/'],
          owaspId: 'A05:2021',
          pciDss: ['6.2.4'],
        })
      }
    } catch {
      // ignore connection errors
    }
  })
  await Promise.allSettled(sensitiveChecks)

  // Admin panel discovery
  const adminChecks = ADMIN_PATHS.map(async (path) => {
    try {
      const adminUrl = new URL(path, url).href
      const res = await axios.get(adminUrl, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })
      if (res.status === 200) {
        const adminHtml = typeof res.data === 'string' ? res.data : ''
        const hasLoginForm = /input.*type.*password/i.test(adminHtml) || /login|sign in|username/i.test(adminHtml)
        if (hasLoginForm) {
          findings.push({
            id: makeId(),
            category: 'Application',
            name: `Admin Panel Discovered: ${path}`,
            severity: 'HIGH',
            cvssScore: 7.5,
            cveIds: [],
            description: `An admin panel was found at "${path}". Publicly accessible admin panels are a high-value attack target.`,
            evidence: `GET ${adminUrl} → HTTP ${res.status}, login form detected`,
            impact: 'Brute-force attacks, credential stuffing, and exploitation of admin panel vulnerabilities.',
            remediation: 'Restrict admin panel access to specific IP addresses or VPN. Implement rate limiting and 2FA.',
            references: ['https://owasp.org/www-project-web-security-testing-guide/'],
            owaspId: 'A01:2021',
          })
        }
      }
    } catch {
      // ignore
    }
  })
  await Promise.allSettled(adminChecks)

  // Inline secrets in script blocks
  const scripts: string[] = []
  $('script').each((_, el) => {
    const content = $(el).html()
    if (content) scripts.push(content)
  })

  for (const script of scripts) {
    for (const pattern of SECRET_PATTERNS) {
      const match = script.match(pattern)
      if (match) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: 'Potential Secret/API Key in Client-Side JavaScript',
          severity: 'CRITICAL',
          cvssScore: 9.1,
          cveIds: [],
          description: 'A potential API key, password, or secret was found in client-side JavaScript code.',
          evidence: match[0].substring(0, 100),
          impact: 'Exposed credentials can be used by attackers to access APIs, services, or accounts.',
          remediation: 'Remove all secrets from client-side code. Use server-side API proxying. Rotate any exposed credentials immediately.',
          references: ['https://owasp.org/www-top-10/A02_2021-Cryptographic_Failures/'],
          owaspId: 'A02:2021',
        })
        break
      }
    }
  }

  // HTML comments with sensitive data
  const commentPattern = /<!--([\s\S]*?)-->/g
  const sensitiveCommentPatterns = [/password/i, /secret/i, /api.*key/i, /TODO.*fix/i, /192\.168\./, /10\.\d+\.\d+\.\d+/, /internal/i]
  let commentMatch
  while ((commentMatch = commentPattern.exec(html)) !== null) {
    const comment = commentMatch[1]
    for (const pattern of sensitiveCommentPatterns) {
      if (pattern.test(comment)) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: 'Sensitive Information in HTML Comments',
          severity: 'MEDIUM',
          cvssScore: 4.3,
          cveIds: [],
          description: 'Sensitive information was found in HTML comments that are visible to any user who views the page source.',
          evidence: `Comment: ${comment.trim().substring(0, 200)}`,
          impact: 'Internal information, credentials, or system details may be exposed to attackers.',
          remediation: 'Remove all sensitive information from HTML comments before deploying to production.',
          references: ['https://owasp.org/www-project-web-security-testing-guide/'],
          owaspId: 'A05:2021',
        })
        break
      }
    }
  }

  // Mixed content
  if (url.startsWith('https://')) {
    const mixedContentPattern = /src\s*=\s*["']http:\/\//gi
    if (mixedContentPattern.test(html)) {
      findings.push({
        id: makeId(),
        category: 'Application',
        name: 'Mixed Content — HTTP Resources on HTTPS Page',
        severity: 'MEDIUM',
        cvssScore: 4.3,
        cveIds: [],
        description: 'The HTTPS page loads some resources over HTTP, undermining transport security.',
        evidence: 'Found src="http://..." in HTTPS page',
        impact: 'HTTP resources can be intercepted and modified, injecting malicious content into an otherwise secure page.',
        remediation: 'Update all resource URLs to use HTTPS.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content'],
        owaspId: 'A02:2021',
      })
    }
  }

  // robots.txt sensitive paths
  try {
    const robotsUrl = new URL('/robots.txt', url).href
    const robotsRes = await axios.get(robotsUrl, {
      timeout: 5000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
    })
    if (robotsRes.status === 200 && typeof robotsRes.data === 'string') {
      const sensitiveRobotPaths = ['admin', 'backup', 'config', 'private', 'internal', 'staging', 'api', 'secret']
      const disallowLines = robotsRes.data.match(/Disallow:\s*(.+)/gi) || []
      const sensitiveFound = disallowLines
        .map(l => l.replace(/Disallow:\s*/i, '').trim())
        .filter(path => sensitiveRobotPaths.some(s => path.toLowerCase().includes(s)))

      if (sensitiveFound.length > 0) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: 'Sensitive Paths Exposed in robots.txt',
          severity: 'INFO',
          cvssScore: 2.6,
          cveIds: [],
          description: 'The robots.txt file reveals paths that may contain sensitive content. While intended to be disallowed for crawlers, these paths are visible to anyone.',
          evidence: `Sensitive paths in robots.txt:\n${sensitiveFound.join('\n')}`,
          impact: 'Attackers can use robots.txt as a roadmap to discover hidden administrative areas.',
          remediation: 'Do not rely on robots.txt to hide sensitive areas. Use proper authentication and access controls.',
          references: ['https://owasp.org/www-project-web-security-testing-guide/'],
        })
      }
    }
  } catch {
    // ignore
  }

  // SRI missing for external scripts
  const externalScriptsWithoutSRI: string[] = []
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || ''
    const integrity = $(el).attr('integrity')
    if ((src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) && !integrity) {
      externalScriptsWithoutSRI.push(src)
    }
  })
  if (externalScriptsWithoutSRI.length > 0) {
    findings.push({
      id: makeId(),
      category: 'Application',
      name: 'External Scripts Missing Subresource Integrity (SRI)',
      severity: 'MEDIUM',
      cvssScore: 5.4,
      cveIds: [],
      description: `${externalScriptsWithoutSRI.length} external script(s) are loaded without Subresource Integrity (SRI) checks.`,
      evidence: `Scripts without SRI:\n${externalScriptsWithoutSRI.slice(0, 5).join('\n')}`,
      impact: 'If the CDN serving these scripts is compromised, malicious code can be injected into your site.',
      remediation: 'Add integrity and crossorigin attributes to external scripts. Generate SRI hashes at https://www.srihash.org/',
      references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity'],
      owaspId: 'A08:2021',
    })
  }

  // WordPress-specific checks
  const isWordPress = html.includes('/wp-content/') || html.includes('/wp-includes/') || $('meta[name="generator"]').attr('content')?.includes('WordPress')
  if (isWordPress) {
    // User enumeration
    try {
      const wpUsersUrl = new URL('/wp-json/wp/v2/users', url).href
      const wpUsersRes = await axios.get(wpUsersUrl, {
        timeout: 5000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })
      if (wpUsersRes.status === 200 && Array.isArray(wpUsersRes.data)) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: 'WordPress REST API User Enumeration',
          severity: 'HIGH',
          cvssScore: 5.3,
          cveIds: [],
          description: 'The WordPress REST API endpoint /wp-json/wp/v2/users is accessible and returns user information.',
          evidence: `GET /wp-json/wp/v2/users → HTTP ${wpUsersRes.status}, ${wpUsersRes.data.length} user(s) returned`,
          impact: 'Attackers can enumerate valid usernames for brute-force attacks.',
          remediation: 'Disable user enumeration via REST API using a security plugin or custom code: remove_filter("rest_endpoints", ...).',
          references: ['https://www.wpbeginner.com/wp-tutorials/how-to-disable-wordpress-rest-api/'],
          owaspId: 'A01:2021',
        })
      }
    } catch {
      // ignore
    }

    // xmlrpc.php
    try {
      const xmlrpcUrl = new URL('/xmlrpc.php', url).href
      const xmlrpcRes = await axios.get(xmlrpcUrl, {
        timeout: 5000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Vaultrix-Security-Scanner/1.0' },
      })
      if (xmlrpcRes.status === 200 && String(xmlrpcRes.data).includes('XML-RPC')) {
        findings.push({
          id: makeId(),
          category: 'Application',
          name: 'WordPress XML-RPC Enabled',
          severity: 'MEDIUM',
          cvssScore: 5.3,
          cveIds: ['CVE-2014-5266'],
          description: 'WordPress XML-RPC is enabled at /xmlrpc.php. This can be abused for brute-force attacks and DDoS amplification.',
          evidence: `GET /xmlrpc.php → HTTP ${xmlrpcRes.status}`,
          impact: 'Brute-force attacks can be amplified via the multicall method. Can be used for WordPress takeover.',
          remediation: 'Disable XML-RPC if not needed using a security plugin or: add_filter("xmlrpc_enabled", "__return_false");',
          references: ['https://make.wordpress.org/core/2020/11/10/wordpress-5-6-field-guide/#xmlrpc'],
          owaspId: 'A01:2021',
        })
      }
    } catch {
      // ignore
    }
  }

  // CSRF token check on forms
  const forms: ReturnType<typeof $>[] = []
  $('form').each((_, el) => { forms.push($(el)) })

  for (const $form of forms) {
    const hasPasswordField = $form.find('input[type="password"]').length > 0
    const formAction = $form.attr('action') || ''
    const hasCsrfToken = $form.find('input[name*="csrf"], input[name*="token"], input[name*="nonce"], input[name*="_token"]').length > 0

    if (hasPasswordField && !hasCsrfToken) {
      findings.push({
        id: makeId(),
        category: 'Application',
        name: 'Form Missing CSRF Token',
        severity: 'HIGH',
        cvssScore: 6.5,
        cveIds: [],
        description: 'A form with a password field does not appear to include a CSRF token.',
        evidence: `Form action: ${formAction || '(same page)'} — No CSRF token input found`,
        impact: 'Without CSRF protection, attackers can trick authenticated users into submitting forms via cross-site request forgery.',
        remediation: 'Add a CSRF token to all state-changing forms. Use frameworks\' built-in CSRF protection.',
        references: ['https://owasp.org/www-community/attacks/csrf'],
        owaspId: 'A01:2021',
      })
    }

    if (hasPasswordField && formAction.startsWith('http://')) {
      findings.push({
        id: makeId(),
        category: 'Application',
        name: 'Login Form Submits to HTTP (Not HTTPS)',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveIds: [],
        description: 'A login form submits credentials over HTTP (unencrypted).',
        evidence: `Form action: ${formAction}`,
        impact: 'Credentials transmitted in plaintext can be intercepted by anyone on the network.',
        remediation: 'Change form action to use HTTPS.',
        references: ['https://owasp.org/www-project-web-security-testing-guide/'],
        owaspId: 'A02:2021',
      })
    }
  }

  return {
    module: 'webapp',
    findings,
    duration: Date.now() - start,
  }
}
