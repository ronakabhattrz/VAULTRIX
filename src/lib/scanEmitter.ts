import { redis } from './redis'
import type { ScanEmitEvent } from './scanner/types'

const SCAN_CHANNEL_PREFIX = 'scan:'
const EVENT_TTL_SECONDS = 300 // 5 minutes

export async function publishScanEvent(scanId: string, event: ScanEmitEvent): Promise<void> {
  if (!redis) return // Upstash not configured — events are ephemeral, scan still runs

  const channel = `${SCAN_CHANNEL_PREFIX}${scanId}`
  const payload = JSON.stringify(event)

  try {
    await redis.publish(channel, payload)
    // Also push to a list for clients that connect after events are published
    await redis.lpush(`${channel}:history`, payload)
    await redis.expire(`${channel}:history`, EVENT_TTL_SECONDS)
    // Trim to last 100 events
    await redis.ltrim(`${channel}:history`, 0, 99)
  } catch (err) {
    console.error('[scanEmitter] Failed to publish event:', err)
  }
}

export async function getScanHistory(scanId: string): Promise<ScanEmitEvent[]> {
  if (!redis) return []

  try {
    const channel = `${SCAN_CHANNEL_PREFIX}${scanId}`
    const items = await redis.lrange(`${channel}:history`, 0, -1)
    return items
      .reverse()
      .map(item => {
        try {
          return JSON.parse(item) as ScanEmitEvent
        } catch {
          return null
        }
      })
      .filter(Boolean) as ScanEmitEvent[]
  } catch {
    return []
  }
}

export async function clearScanHistory(scanId: string): Promise<void> {
  if (!redis) return
  await redis.del(`${SCAN_CHANNEL_PREFIX}${scanId}:history`)
}
