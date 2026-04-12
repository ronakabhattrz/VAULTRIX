import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// For BullMQ — uses ioredis
import IORedis from 'ioredis'

let ioRedisClient: IORedis | null = null

export function getIORedis(): IORedis {
  if (!ioRedisClient) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace('https://', 'redis://').replace('http://', 'redis://') ?? 'redis://localhost:6379'
    ioRedisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return ioRedisClient
}
