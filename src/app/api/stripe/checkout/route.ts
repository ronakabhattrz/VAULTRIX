import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, err, requireAuth } from '@/lib/api'
import { stripe, PLAN_PRICE_IDS, getOrCreateStripeCustomer } from '@/lib/stripe'
import { db } from '@/lib/db'

const checkoutSchema = z.object({
  priceId: z.string(),
  annual: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid JSON')

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return err('Invalid input')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true },
  })
  if (!user) return err('User not found', 404)

  const customerId = await getOrCreateStripeCustomer(session.userId, user.email!, user.name)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?cancelled=1`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: { userId: session.userId },
  })

  return ok({ url: checkoutSession.url })
}
