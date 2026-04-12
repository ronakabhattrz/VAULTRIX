import { db } from '../lib/db'
import { enqueueScan } from '../lib/queue'
import { addDays, addWeeks, addMonths } from 'date-fns'

export async function processScheduledScans(): Promise<{ queued: number; errors: number }> {
  const now = new Date()
  let queued = 0
  let errors = 0

  const dueScans = await db.scheduledScan.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    include: {
      user: { select: { id: true, plan: true } },
    },
    take: 50, // Process max 50 at a time
  })

  console.log(`[scheduledWorker] Found ${dueScans.length} due scheduled scans`)

  for (const schedule of dueScans) {
    try {
      // Create a new scan record
      const scan = await db.scan.create({
        data: {
          userId: schedule.userId,
          url: schedule.url,
          domain: schedule.domain,
          status: 'QUEUED',
          scheduledScanId: schedule.id,
        },
      })

      // Enqueue the scan
      await enqueueScan({
        scanId: scan.id,
        url: schedule.url,
        userId: schedule.userId,
        plan: schedule.user.plan,
      })

      // Calculate next run time
      let nextRunAt: Date
      switch (schedule.frequency) {
        case 'DAILY':
          nextRunAt = addDays(now, 1)
          break
        case 'MONTHLY':
          nextRunAt = addMonths(now, 1)
          break
        case 'WEEKLY':
        default:
          nextRunAt = addWeeks(now, 1)
          break
      }

      // Update schedule
      await db.scheduledScan.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt,
        },
      })

      queued++
      console.log(`[scheduledWorker] Queued scan for ${schedule.domain} (scheduleId: ${schedule.id})`)
    } catch (err) {
      errors++
      console.error(`[scheduledWorker] Failed to queue scan for ${schedule.domain}:`, err)
    }
  }

  // Check for score drops — compare with previous scan
  await checkScoreDrops(dueScans)

  return { queued, errors }
}

async function checkScoreDrops(
  schedules: Array<{ id: string; userId: string; domain: string; lastScore: number | null; alertThreshold: number; notifyEmail: string | null }>
): Promise<void> {
  for (const schedule of schedules) {
    if (schedule.lastScore === null) continue

    try {
      // Get the most recently completed scan for this scheduled scan
      const latestScan = await db.scan.findFirst({
        where: {
          userId: schedule.userId,
          domain: schedule.domain,
          status: 'COMPLETED',
          scheduledScanId: schedule.id,
        },
        orderBy: { completedAt: 'desc' },
      })

      if (!latestScan?.score) continue

      const scoreDrop = schedule.lastScore - latestScan.score
      if (scoreDrop >= 10) {
        // Score dropped by 10+ points — send alert
        if (schedule.notifyEmail) {
          const { sendScoreDroppedEmail } = await import('../lib/email')
          await sendScoreDroppedEmail(schedule.notifyEmail, {
            domain: schedule.domain,
            previousScore: schedule.lastScore,
            currentScore: latestScan.score,
            scanId: latestScan.id,
          })
        }

        // Update notification
        await db.notification.create({
          data: {
            userId: schedule.userId,
            title: `Score drop alert: ${schedule.domain}`,
            message: `Security score dropped from ${schedule.lastScore} to ${latestScan.score} (−${scoreDrop} points)`,
            type: 'score_drop',
            link: `/scan/${latestScan.id}`,
          },
        })
      }

      // Update lastScore
      await db.scheduledScan.update({
        where: { id: schedule.id },
        data: { lastScore: latestScan.score },
      })
    } catch (err) {
      console.error(`[scheduledWorker] Score drop check failed for ${schedule.domain}:`, err)
    }
  }
}
