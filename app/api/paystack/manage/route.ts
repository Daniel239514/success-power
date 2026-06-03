import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubscription, getUpdateCardLink } from '@/lib/paystack'

// The "Update payment method" button on /profile links here. Paystack has no
// portal, so we generate its update-card link for the user's subscription and
// redirect them to that hosted page. (Cancellation is a separate route — see
// /api/paystack/cancel — because Paystack splits these into two endpoints.)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const origin = new URL(request.url).origin

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('paystack_customer_code')
    .eq('id', user.id)
    .single()

  if (!profile?.paystack_customer_code) {
    return NextResponse.redirect(`${origin}/profile?error=no_paystack_customer`)
  }

  try {
    const sub = await getActiveSubscription(profile.paystack_customer_code)
    if (!sub) {
      return NextResponse.redirect(`${origin}/profile?error=no_subscription`)
    }
    const link = await getUpdateCardLink(sub.subscriptionCode)
    return NextResponse.redirect(link)
  } catch (err) {
    console.error('❌ Paystack manage route failed:', err)
    return NextResponse.redirect(`${origin}/profile?error=manage_failed`)
  }
}
