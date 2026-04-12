import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { db } from '@/lib/db'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const priceId = sub.items.data[0]?.price.id ?? ''
        const plan = getPlanFromPriceId(priceId)
        const currentPeriodEnd = new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000)

        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'ENTERPRISE',
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            currentPeriodEnd,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await db.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            plan: 'FREE',
            stripeSubscriptionId: null,
            subscriptionStatus: 'cancelled',
            currentPeriodEnd: null,
          },
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const user = await db.user.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
          select: { email: true, plan: true },
        })
        if (user?.email) {
          const { sendPlanUpgradedEmail } = await import('@/lib/email')
          await sendPlanUpgradedEmail(user.email, user.plan)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const user = await db.user.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
          select: { email: true },
        })
        if (user?.email) {
          const { resend } = await import('@/lib/email')
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? 'noreply@vaultrix.io',
            to: user.email,
            subject: 'Payment failed — Action required for VAULTRIX',
            html: `<p>Your payment failed. Please update your payment method at <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing">billing settings</a>.</p>`,
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
