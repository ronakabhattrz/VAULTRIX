import { Redis } from '@upstash/redis'

// Upstash REST client — edge-compatible, used for rate limiting in middleware
// Only initialized if env vars are present, so missing config doesn't crash module load
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null
