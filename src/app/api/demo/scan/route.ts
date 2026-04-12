import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, urlSchema } from '@/lib/api'
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'
import { runHeadersModule } from '@/lib/scanner/modules/headers'
import { runSSLModule } from '@/lib/scanner/modules/ssl'
import { runCookiesModule } from '@/lib/scanner/modules/cookies'
import { calculateScore } from '@/lib/scanner/scoring'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 d'),
  prefix: 'demo_scan',
})

const demoSchema = z.object({ url: urlSchema })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '127.0.0.1'

  const { success, remaining } = await ratelimit.limit(ip)
  if (!success) {
    return err('Demo scan limit reached (3/day). Sign up for unlimited scans.', 429)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid URL')

  const { url } = parsed.data

  try {
    const [headersResult, sslResult, cookiesResult] = await Promise.allSettled([
      runHeadersModule(url),
      runSSLModule(url),
      runCookiesModule(url),
    ])

    const findings = [
      ...(headersResult.status === 'fulfilled' ? headersResult.value.findings : []),
      ...(sslResult.status === 'fulfilled' ? sslResult.value.findings : []),
      ...(cookiesResult.status === 'fulfilled' ? cookiesResult.value.findings : []),
    ]

    const { score, grade } = calculateScore(findings.filter(f => f.severity !== 'INFO'))

    return ok({
      score,
      grade,
      findingCount: findings.filter(f => f.severity !== 'INFO').length,
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      preview: findings.slice(0, 5).map(f => ({ name: f.name, severity: f.severity })),
      remaining,
      message: 'Sign up to see the full report with all 13 modules.',
    })
  } catch {
    return err('Scan failed. Please try again.')
  }
}
