import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as const,
  typescript: true,
})

export const PLAN_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  STARTER: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID!,
  },
  PRO: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  },
  AGENCY: {
    monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID!,
  },
}

export const PLAN_LIMITS: Record<string, { scans: number; apiCalls: number }> = {
  FREE: { scans: 3, apiCalls: 0 },
  STARTER: { scans: 20, apiCalls: 200 },
  PRO: { scans: 100, apiCalls: 1000 },
  AGENCY: { scans: 500, apiCalls: 5000 },
  ENTERPRISE: { scans: 99999, apiCalls: 99999 },
}

export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, prices] of Object.entries(PLAN_PRICE_IDS)) {
    if (prices.monthly === priceId || prices.annual === priceId) return plan
  }
  return 'FREE'
}

export async function getOrCreateStripeCustomer(userId: string, email: string, name?: string | null): Promise<string> {
  const { db } = await import('./db')
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })

  if (user?.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  })

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}
