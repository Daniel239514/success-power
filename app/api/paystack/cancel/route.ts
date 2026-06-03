import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription, disableSubscription } from '@/lib/paystack'

// The "Cancel subscription" confirmation modal POSTs here. We disable the
// subscription at Paystack (no more charges) and mark the profile 'cancelling'
// — they keep access until current_period_end, after which the paywall locks
// them out by date (see lib/access.ts). We set the status here directly rather
// than waiting on the webhook so the UI updates immediately; the webhook then
// arrives and sets the same value (idempotent).
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('paystack_customer_code, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.paystack_customer_code) {
    return NextResponse.json(
      { error: 'No Paystack subscription to cancel.' },
      { status: 400 },
    )
  }

  try {
    const sub = await getActiveSubscription(profile.paystack_customer_code)
    if (!sub) {
      return NextResponse.json(
        { error: 'No active subscription found.' },
        { status: 404 },
      )
    }

    // Disable at Paystack. This also triggers a subscription.disable webhook.
    await disableSubscription(sub.subscriptionCode, sub.emailToken)

    // Mark cancelling now so /profile reflects it without waiting on the webhook.
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelling' })
      .eq('id', user.id)

    if (error) {
      console.error('❌ Failed to mark profile cancelling:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Paystack cancel route failed:', err)
    const message = err instanceof Error ? err.message : 'Could not cancel.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
