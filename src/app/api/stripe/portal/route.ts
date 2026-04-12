import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { stripeCustomerId: true },
  })

  if (!user?.stripeCustomerId) return err('No billing account found')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  })

  return ok({ url: portalSession.url })
}
