import type { ScannerOptions, ScanResult, TechStack, Finding } from './types'
import { runHeadersModule } from './modules/headers'
import { runSSLModule } from './modules/ssl'
import { runCookiesModule } from './modules/cookies'
import { runDNSModule } from './modules/dns'
import { runPortsModule } from './modules/ports'
import { runContentModule } from './modules/content'
import { runPerformanceModule } from './modules/performance'
import { runWebAppModule } from './modules/webapp'
import { runCORSModule } from './modules/cors'
import { runEmailModule } from './modules/email'
import { runAuthModule } from './modules/auth'
import { runAPIModule } from './modules/api'
import { runComplianceModule } from './modules/compliance'
import { calculateScore, deduplicateFindings, sortFindings } from './scoring'
import type { ScanPlan } from './types'

const PLAN_MODULES: Record<ScanPlan, string[]> = {
  FREE: ['headers', 'ssl', 'cookies'],
  STARTER: ['headers', 'ssl', 'cookies', 'dns', 'ports', 'content', 'performance'],
  PRO: ['headers', 'ssl', 'cookies', 'dns', 'ports', 'content', 'performance', 'webapp', 'cors', 'email', 'auth'],
  AGENCY: ['headers', 'ssl', 'cookies', 'dns', 'ports', 'content', 'performance', 'webapp', 'cors', 'email', 'auth', 'api', 'compliance'],
  ENTERPRISE: ['headers', 'ssl', 'cookies', 'dns', 'ports', 'content', 'performance', 'webapp', 'cors', 'email', 'auth', 'api', 'compliance'],
}

const TOTAL_TIMEOUT_MS = 45000

export async function runScanner(options: ScannerOptions): Promise<ScanResult> {
  const { url, plan, emit } = options
  const startTime = Date.now()

  const modulesToRun = PLAN_MODULES[plan] ?? PLAN_MODULES['FREE']

  emit({ event: 'started', modules: modulesToRun })

  const allFindings: Finding[] = []
  let techStack: TechStack = {}
  let serverInfo = { ip: '', location: '', software: '' }
  let responseTime = 0

  // Resolve IP
  try {
    const { promises: dns } = await import('dns')
    const hostname = new URL(url).hostname
    const addresses = await dns.resolve4(hostname)
    serverInfo.ip = addresses[0] ?? ''
  } catch {
    // ignore
  }

  const moduleRunners: Record<string, () => Promise<{ module: string; findings: Finding[]; duration: number; error?: string }>> = {
    headers: () => runHeadersModule(url),
    ssl: () => runSSLModule(url),
    cookies: () => runCookiesModule(url),
    dns: () => runDNSModule(url),
    ports: () => runPortsModule(url),
    content: () => runContentModule(url).then(r => { techStack = { ...techStack, ...r.techStack }; return r }),
    performance: () => runPerformanceModule(url).then(r => { responseTime = r.responseTime; return r }),
    webapp: () => runWebAppModule(url),
    cors: () => runCORSModule(url),
    email: () => runEmailModule(url),
    auth: () => runAuthModule(url),
    api: () => runAPIModule(url),
    compliance: async () => {
      // compliance runs after all others, using accumulated findings
      const result = await runComplianceModule(allFindings)
      return { ...result, findings: [...result.findings] }
    },
  }

  // Skip compliance for now — run it after all others
  const initialModules = modulesToRun.filter(m => m !== 'compliance')
  const hasCompliance = modulesToRun.includes('compliance')

  let completedCount = 0
  const totalModules = modulesToRun.length

  // Run initial modules in parallel with per-module timeout
  const modulePromises = initialModules.map(async (moduleName) => {
    emit({ event: 'module', name: moduleName, status: 'running' })
    emit({ event: 'log', message: `[+] Running ${moduleName} checks...`, level: 'info' })

    try {
      const timeoutMs = Math.min(TOTAL_TIMEOUT_MS - (Date.now() - startTime), 20000)
      if (timeoutMs <= 0) {
        emit({ event: 'module', name: moduleName, status: 'skipped' })
        return
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Module timeout')), timeoutMs)
      )

      const result = await Promise.race([moduleRunners[moduleName](), timeoutPromise])

      allFindings.push(...result.findings)
      completedCount++

      emit({
        event: 'module',
        name: moduleName,
        status: result.error ? 'failed' : 'complete',
        findingsCount: result.findings.length,
        duration: result.duration,
      })
      emit({
        event: 'log',
        message: `[${result.error ? '!' : '+'}] ${moduleName}: ${result.findings.length} finding(s) in ${result.duration}ms${result.error ? ` (${result.error})` : ''}`,
        level: result.error ? 'warn' : 'info',
      })
      emit({
        event: 'progress',
        completed: completedCount,
        total: totalModules,
        estimatedSeconds: Math.max(0, Math.round((TOTAL_TIMEOUT_MS - (Date.now() - startTime)) / 1000)),
      })
    } catch (err) {
      completedCount++
      emit({ event: 'module', name: moduleName, status: 'failed' })
      emit({ event: 'log', message: `[!] ${moduleName} failed: ${String(err)}`, level: 'error' })
    }
  })

  await Promise.allSettled(modulePromises)

  // Now run compliance with accumulated findings
  if (hasCompliance) {
    emit({ event: 'module', name: 'compliance', status: 'running' })
    try {
      const complianceResult = await runComplianceModule(allFindings)
      allFindings.push(...complianceResult.findings)
      completedCount++
      emit({ event: 'module', name: 'compliance', status: 'complete', findingsCount: complianceResult.findings.length })

      // Add compliance scores to return value
      const dedupedFindings = sortFindings(deduplicateFindings(allFindings))
      const { score, grade, categoryScores } = calculateScore(dedupedFindings.filter(f => f.severity !== 'INFO'))
      const duration = Date.now() - startTime

      // Server info
      if (techStack.server) serverInfo.software = techStack.server

      emit({ event: 'complete', score, grade })

      return {
        score,
        grade,
        findings: dedupedFindings,
        techStack,
        categoryScores,
        complianceScores: complianceResult.complianceScores,
        serverInfo: { ...serverInfo, responseTime },
        duration,
        modulesRun: modulesToRun,
      }
    } catch (err) {
      emit({ event: 'module', name: 'compliance', status: 'failed' })
    }
  }

  const dedupedFindings = sortFindings(deduplicateFindings(allFindings))
  const { score, grade, categoryScores } = calculateScore(dedupedFindings.filter(f => f.severity !== 'INFO'))
  const duration = Date.now() - startTime

  if (techStack.server) serverInfo.software = techStack.server

  emit({ event: 'complete', score, grade })

  return {
    score,
    grade,
    findings: dedupedFindings,
    techStack,
    categoryScores,
    complianceScores: {},
    serverInfo: { ...serverInfo, responseTime },
    duration,
    modulesRun: modulesToRun,
  }
}
