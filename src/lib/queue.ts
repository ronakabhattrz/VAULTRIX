import { Queue } from 'bullmq'
import { getIORedis } from './redis'

export interface ScanJobData {
  scanId: string
  url: string
  userId: string
  plan: string
}

export interface ScheduledScanJobData {
  scheduledScanId: string
  url: string
  userId: string
}

let scanQueue: Queue<ScanJobData> | null = null

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>('scan-queue', {
      connection: getIORedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })
  }
  return scanQueue
}

export async function enqueueScan(data: ScanJobData): Promise<string> {
  const queue = getScanQueue()
  const job = await queue.add('scan', data, {
    jobId: data.scanId,
  })
  return job.id ?? data.scanId
}
