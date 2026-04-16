import { Worker, Job } from 'bullmq'
import { db } from '../lib/db'
import { processScan } from '../lib/processScan'
import { getIORedis } from '../lib/ioredis'
import type { ScanJobData } from '../lib/queue'

const CONCURRENCY = 3

async function processScanJob(job: Job<ScanJobData>): Promise<void> {
  const { scanId, url, userId, plan } = job.data

  // Atomic claim — prevents double-processing if the Vercel process endpoint also fired
  const claimed = await db.scan.updateMany({
    where: { id: scanId, status: 'QUEUED' },
    data: { status: 'RUNNING' },
  })

  if (claimed.count === 0) {
    console.log(`[worker] Scan ${scanId} already claimed — skipping`)
    return
  }

  await processScan({ scanId, url, userId, plan })
}

export function startScanWorker() {
  const connection = getIORedis()
  const worker = new Worker<ScanJobData>('scan-queue', processScanJob, {
    connection,
    concurrency: CONCURRENCY,
    limiter: { max: 10, duration: 60000 },
  })

  worker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`))
  worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err))
  worker.on('error', (err) => console.error('[worker] Worker error:', err))

  console.log('[worker] Scan worker started with concurrency', CONCURRENCY)
  return worker
}
