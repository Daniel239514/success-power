import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { getActiveSubscription, disableSubscription } from '@/lib/paystack'

// GDPR "right to erasure". Permanently deletes the logged-in user's data and
// their auth identity. Deleting an auth.users row needs the service-role key,
// so we use the admin client (server-only, never reaches the browser).
//
// We cancel any live subscription FIRST so a deleted account is never left
// being billed. If that cancellation fails we ABORT and keep the account —
// making the user retry is far better than deleting someone we can't stop
// charging.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Which processor (if any) is billing this user?
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, paystack_customer_code')
    .eq('id', user.id)
    .single()

  // 1. Cancel live subscriptions before deleting anything.
  try {
    if (profile?.stripe_customer_id) {
      const stripe = getStripe()
      // No status filter -> every subscription that isn't already canceled
      // (active, trialing, past_due...). Cancel each one immediately.
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        limit: 100,
      })
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id)
      }
    }

    if (profile?.paystack_customer_code) {
      const sub = await getActiveSubscription(profile.paystack_customer_code)
      if (sub) await disableSubscription(sub.subscriptionCode, sub.emailToken)
    }
  } catch (err) {
    console.error('❌ Could not cancel subscription before delete:', err)
    return NextResponse.json(
      {
        error:
          'Could not cancel your subscription. Please try again or contact support.',
      },
      { status: 502 },
    )
  }

  // 2. App data. push_subscriptions also cascades on the auth delete below,
  //    but we remove it explicitly so the order never matters.
  await admin.from('push_subscriptions').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // 3. The identity itself. This is the irreversible part.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('❌ Account deletion failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. Clear this browser's session cookies so they're fully signed out.
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
