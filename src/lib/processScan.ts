import { db } from './db'
import { runScanner } from './scanner'
import { publishScanEvent } from './scanEmitter'
import type { ScanEmitEvent, ScanPlan } from './scanner/types'

export interface ProcessScanInput {
  scanId: string
  url: string
  userId: string
  plan: string
}

export async function processScan({ scanId, url, userId, plan }: ProcessScanInput): Promise<void> {
  console.log(`[processScan] Starting scan ${scanId} for ${url} (plan: ${plan})`)

  const emit = async (event: ScanEmitEvent) => {
    await publishScanEvent(scanId, event)
  }

  try {
    const result = await runScanner({
      scanId,
      url,
      plan: plan as ScanPlan,
      emit,
    })

    const ipAddress = result.serverInfo.ip || null
    const serverSoftware = result.serverInfo.software || null

    await db.scan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        score: result.score,
        grade: result.grade,
        findings: result.findings as object,
        techStack: result.techStack as object,
        ipAddress,
        serverSoftware,
        scanDuration: result.duration,
        modulesRun: result.modulesRun,
        completedAt: new Date(),
        errorMessage: null,
      },
    })

    if (Object.keys(result.categoryScores).length > 0) {
      await db.scanCategoryScore.createMany({
        data: Object.entries(result.categoryScores).map(([category, score]) => ({
          scanId,
          category,
          score,
        })),
        skipDuplicates: true,
      })
    }

    if (Object.keys(result.complianceScores).length > 0) {
      await db.complianceResult.createMany({
        data: Object.entries(result.complianceScores).map(([framework, data]) => ({
          scanId,
          framework,
          score: data.score,
          passed: data.passed,
          failed: data.failed,
          details: data.details as object,
        })),
        skipDuplicates: true,
      })
    }

    await db.user.update({
      where: { id: userId },
      data: {
        scanCountThisMonth: { increment: 1 },
        totalScans: { increment: 1 },
      },
    })

    await checkAlertRules(scanId, userId, result.findings, result.score)
    await fireWebhooks(userId, 'scan.complete', {
      scanId,
      url,
      score: result.score,
      grade: result.grade,
      criticalCount: result.findings.filter((f: { severity: string }) => f.severity === 'CRITICAL').length,
    })
    await createNotification(userId, scanId, result.score, result.grade)

    console.log(`[processScan] Scan ${scanId} complete. Score: ${result.score} (${result.grade})`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[processScan] Scan ${scanId} failed:`, err)

    await db.scan.update({
      where: { id: scanId },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    })

    await publishScanEvent(scanId, { event: 'failed', error: errorMessage })
    await fireWebhooks(userId, 'scan.failed', { scanId, url, error: errorMessage })

    throw err
  }
}

async function checkAlertRules(
  scanId: string,
  userId: string,
  findings: Array<{ severity: string; name: string; description: string }>,
  score: number
): Promise<void> {
  try {
    const alertRules = await db.alertRule.findMany({
      where: { userId, isActive: true },
    })

    for (const rule of alertRules) {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
      const triggerFindings = findings.filter(f => {
        const fOrder = severityOrder[f.severity as keyof typeof severityOrder] ?? 4
        const ruleOrder = severityOrder[rule.minSeverity as keyof typeof severityOrder] ?? 4
        return fOrder <= ruleOrder
      })

      if (triggerFindings.length === 0) continue

      if (rule.channel === 'EMAIL' && rule.emailTo) {
        const { sendCriticalAlertEmail } = await import('./email')
        await sendCriticalAlertEmail(rule.emailTo, {
          scanId,
          findingCount: triggerFindings.length,
          topFinding: triggerFindings[0],
          score,
        })
      } else if (rule.channel === 'SLACK' && rule.slackUrl) {
        await sendSlackAlert(rule.slackUrl, scanId, triggerFindings.length, score)
      } else if (rule.channel === 'WEBHOOK' && rule.webhookUrl) {
        await fireWebhookUrl(rule.webhookUrl, 'critical.found', {
          scanId,
          findings: triggerFindings.slice(0, 10),
          score,
        })
      }

      await db.scanAlert.create({
        data: {
          scanId,
          channel: rule.channel,
          sentTo: rule.emailTo || rule.slackUrl || rule.webhookUrl,
          status: 'sent',
          payload: { findingCount: triggerFindings.length, score } as object,
        },
      })
    }
  } catch (err) {
    console.error('[processScan] Alert check failed:', err)
  }
}

async function sendSlackAlert(webhookUrl: string, scanId: string, findingCount: number, score: number): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Vaultrix Security Alert* — ${findingCount} critical findings detected. Security score: ${score}/100. <${appUrl}/scan/${scanId}|View Report>`,
      }),
    })
  } catch (err) {
    console.error('[processScan] Slack alert failed:', err)
  }
}

async function fireWebhooks(userId: string, event: string, payload: object): Promise<void> {
  try {
    const webhooks = await db.webhook.findMany({
      where: { userId, isActive: true, events: { has: event } },
    })
    await Promise.allSettled(
      webhooks.map((webhook: { url: string; id: string; secret?: string | null }) =>
        fireWebhookUrl(webhook.url, event, payload, webhook.id, webhook.secret ?? undefined)
      )
    )
  } catch (err) {
    console.error('[processScan] Webhook firing failed:', err)
  }
}

async function fireWebhookUrl(url: string, event: string, payload: object, webhookId?: string, secret?: string): Promise<void> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vaultrix-Webhooks/1.0',
  }

  if (secret) {
    const { createHmac } = await import('crypto')
    const signature = createHmac('sha256', secret).update(body).digest('hex')
    headers['X-Vaultrix-Signature'] = `sha256=${signature}`
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    if (webhookId) {
      await db.webhookLog.create({
        data: {
          webhookId,
          event,
          statusCode: res.status,
          response: res.ok ? 'ok' : await res.text().catch(() => 'error'),
        },
      })
    }
  } catch (err) {
    if (webhookId) {
      await db.webhookLog.create({
        data: { webhookId, event, error: String(err) },
      })
    }
  }
}

async function createNotification(userId: string, scanId: string, score: number, grade: string): Promise<void> {
  try {
    const scan = await db.scan.findUnique({ where: { id: scanId }, select: { domain: true } })
    await db.notification.create({
      data: {
        userId,
        title: `Scan complete: ${scan?.domain ?? 'your site'}`,
        message: `Security score: ${score}/100 (Grade ${grade})`,
        type: 'scan_complete',
        link: `/scan/${scanId}`,
      },
    })
  } catch {
    // ignore
  }
}
