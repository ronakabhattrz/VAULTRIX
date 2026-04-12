import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from './db'

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function requireAuth(req?: NextRequest): Promise<{ userId: string; plan: string; isAdmin: boolean } | null> {
  // Try Bearer token first
  const authHeader = req?.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const user = await db.user.findUnique({
      where: { apiKey: token },
      select: { id: true, plan: true, isAdmin: true, isSuspended: true },
    })
    if (!user || user.isSuspended) return null
    return { userId: user.id, plan: user.plan, isAdmin: user.isAdmin }
  }

  // Session
  const session = await auth()
  if (!session?.user?.id) return null
  return {
    userId: session.user.id,
    plan: session.user.plan ?? 'FREE',
    isAdmin: session.user.isAdmin ?? false,
  }
}

export const urlSchema = z.string().url().refine((url) => {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const host = u.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
    // Block private IPs
    const privateRanges = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\.0\.0\.0/]
    if (privateRanges.some(r => r.test(host))) return false
    return true
  } catch {
    return false
  }
}, 'URL must be a valid public HTTP/HTTPS URL')

export const PLAN_SCAN_LIMITS: Record<string, number> = {
  FREE: 3,
  STARTER: 20,
  PRO: 100,
  AGENCY: 500,
  ENTERPRISE: 99999,
}

export async function checkScanQuota(userId: string, plan: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { scanCountThisMonth: true },
  })
  const limit = PLAN_SCAN_LIMITS[plan] ?? 3
  const current = user?.scanCountThisMonth ?? 0
  return { allowed: current < limit, current, limit }
}
