import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Stripe + the service-role Supabase client both need Node APIs, so force the
// Node.js runtime (not Edge).
export const runtime = 'nodejs'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  // 1. Read the RAW body — the exact bytes Stripe sent. We must NOT parse it to
  //    JSON first: the signature is computed over these exact bytes, so any
  //    reformatting (spaces, key order) would break verification.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // 2. Verify the event really came from Stripe (not a forger). This recomputes
  //    the fingerprint with our signing secret and compares it. If it doesn't
  //    match, we reject with 400 and never touch the database.
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('⚠️  Webhook signature verification FAILED:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  console.log('✅ Webhook received:', event.type)

  const supabase = createAdminClient()

  // 3. React only to the events we care about.
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan ?? null

      if (!userId) {
        console.error('No supabase_user_id in session metadata — cannot match a user.')
        break
      }

      // The period end lives on the subscription's first item (Stripe v22).
      let currentPeriodEnd: string | null = null
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        )
        const periodEndUnix = subscription.items.data[0]?.current_period_end
        if (periodEndUnix) {
          currentPeriodEnd = new Date(periodEndUnix * 1000).toISOString()
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: plan,
          stripe_customer_id: session.customer as string,
          current_period_end: currentPeriodEnd,
        })
        .eq('id', userId)

      if (error) {
        console.error('❌ Failed to mark profile active:', error.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      console.log(`🎉 User ${userId} is now active (${plan}).`)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.supabase_user_id

      const update = {
        subscription_status: 'free',
        subscription_plan: null,
        current_period_end: null,
      }

      // Prefer the user id we stored in metadata; fall back to matching the
      // Stripe customer id we saved when they subscribed.
      const { error } = userId
        ? await supabase.from('profiles').update(update).eq('id', userId)
        : await supabase
            .from('profiles')
            .update(update)
            .eq('stripe_customer_id', subscription.customer as string)

      if (error) {
        console.error('❌ Failed to downgrade profile:', error.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      console.log('↩️  Subscription cancelled — user set back to free.')
      break
    }

    default:
      console.log(`(Ignoring unhandled event: ${event.type})`)
  }

  // 4. Always reply 200 for events we accepted, so Stripe stops retrying.
  return NextResponse.json({ received: true })
}
