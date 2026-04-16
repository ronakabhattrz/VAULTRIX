import IORedis from 'ioredis'

let ioRedisClient: IORedis | null = null

export function getIORedis(): IORedis {
  if (!ioRedisClient) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
    ioRedisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      connectTimeout: 5000,
      commandTimeout: 5000,
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    })
  }
  return ioRedisClient
}
