import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'
import { auth } from '@/lib/auth'

const demoRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 d'),
  prefix: 'rl:demo',
})

const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:auth',
})

const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'rl:api',
})

const PROTECTED_ROUTES = ['/dashboard', '/scan', '/reports', '/scheduled', '/api-access', '/team', '/clients', '/billing', '/settings']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Security headers on all responses
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Bot detection
  const ua = request.headers.get('user-agent') ?? ''
  const isBot = /^(curl|wget|python-requests|scrapy|go-http|java|libwww|lwp)/i.test(ua)
  if (isBot && pathname.startsWith('/api/') && !pathname.startsWith('/api/v1/') && !pathname.startsWith('/api/auth/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'

  // Rate limiting for demo scan
  if (pathname === '/api/demo/scan' && request.method === 'POST') {
    const { success } = await demoRatelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 })
    }
  }

  // Rate limiting for auth routes
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    const { success } = await authRatelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Try again in 15 minutes.' }, { status: 429 })
    }
  }

  // Rate limiting for API v1
  if (pathname.startsWith('/api/v1/')) {
    const { success } = await apiRatelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded (100 req/min)' }, { status: 429 })
    }
  }

  // Auth protection for dashboard routes
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  const isAdmin = ADMIN_ROUTES.some(r => pathname.startsWith(r))

  if (isProtected || isAdmin) {
    const session = await auth()
    if (!session?.user?.id) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (isAdmin && !session.user.isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect logged-in users away from auth pages
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const session = await auth()
    if (session?.user?.id) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
