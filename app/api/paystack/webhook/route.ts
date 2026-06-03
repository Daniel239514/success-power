import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// crypto + the service-role Supabase client need Node APIs, so force Node.js
// runtime (not Edge) — same as the Stripe webhook.
export const runtime = 'nodejs'

const secretKey = process.env.PAYSTACK_SECRET_KEY!

// metadata.plan is 'monthly' | 'annual'. Map it to the NGN plan label we store
// and how many days the access should last. ₦ plans get the _ngn suffix so the
// admin dashboard can split revenue by processor; the paywall ignores this and
// only reads subscription_status.
const PLAN_MAP: Record<string, { plan: string; days: number }> = {
  monthly: { plan: 'monthly_ngn', days: 30 },
  annual: { plan: 'annual_ngn', days: 365 },
}

export async function POST(request: NextRequest) {
  // 1. Read the RAW body — the exact bytes Paystack sent. Same gotcha as Stripe:
  //    the signature is computed over these bytes, so parsing to JSON first
  //    would break verification.
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // 2. Verify it really came from Paystack. Unlike Stripe (which has a SDK
  //    helper and a dedicated webhook secret), Paystack signs with YOUR SECRET
  //    KEY: HMAC-SHA512 of the raw body, hex-encoded, compared to the header.
  //    No separate webhook secret to configure.
  const expected = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex')

  if (!signature || signature !== expected) {
    console.error('⚠️  Paystack signature verification FAILED')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  console.log('✅ Paystack webhook received:', event.event)

  try {
    const supabase = createAdminClient()

    switch (event.event) {
      // The "payment succeeded" event — mirror of Stripe's checkout.session.completed.
      case 'charge.success': {
        const data = event.data
        const userId = data.metadata?.supabase_user_id
        const planChoice = data.metadata?.plan as string | undefined
        const mapped = planChoice ? PLAN_MAP[planChoice] : undefined

        if (!userId || !mapped) {
          console.error('charge.success missing user id or plan in metadata — cannot match.')
          break
        }

        // current_period_end = now + 30/365 days. Date math is fine here in
        // app code (this isn't a workflow script).
        const periodEnd = new Date(
          Date.now() + mapped.days * 24 * 60 * 60 * 1000,
        ).toISOString()

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_plan: mapped.plan,
            paystack_customer_code: data.customer?.customer_code ?? null,
            current_period_end: periodEnd,
          })
          .eq('id', userId)

        if (error) {
          console.error('❌ Failed to mark profile active:', error.message)
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        console.log(`🎉 User ${userId} is now active (${mapped.plan}).`)
        break
      }

      // Cancellation / non-renewal. Paystack fires this the moment a
      // subscription is disabled (including by our own /api/paystack/cancel
      // route). The user has already PAID for the current cycle, so we must NOT
      // cut access now — we mark them 'cancelling' and keep current_period_end.
      // The paywall (lib/access.ts) treats 'cancelling' as having access until
      // that date, then locks them out automatically. Paystack sends no event
      // at the real end date, so the date comparison is the only thing needed.
      case 'subscription.disable':
      case 'subscription.not_renew': {
        const customerCode = event.data?.customer?.customer_code
        if (!customerCode) {
          console.error(`${event.event} had no customer_code — cannot match a user.`)
          break
        }

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelling' })
          .eq('paystack_customer_code', customerCode)

        if (error) {
          console.error('❌ Failed to mark profile cancelling:', error.message)
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        console.log('↩️  Paystack subscription cancelling — access kept until period end.')
        break
      }

      default:
        console.log(`(Ignoring unhandled event: ${event.event})`)
    }
  } catch (err) {
    console.error('❌ Paystack webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  // Reply 200 so Paystack stops retrying.
  return NextResponse.json({ received: true })
}
