import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// The "Manage subscription" button on /profile is a plain link to this route.
// We mint a fresh, short-lived Stripe Billing Portal session for the logged-in
// customer and redirect them straight into it. Stripe sends them back to
// return_url (/profile) when they're done. We never store the URL — a new one
// is created on every click because the link expires within minutes.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const origin = new URL(request.url).origin

  // Not logged in -> send them to log in.
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Find their Stripe customer ID (set by the checkout webhook).
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    // No Stripe customer (e.g. a Paystack or free user landed here) -> bounce
    // back to the profile with a flag the page can show a message for.
    return NextResponse.redirect(`${origin}/profile?error=no_stripe_customer`)
  }

  const stripe = getStripe()
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/profile`,
    })
    // Redirect the browser straight into the hosted portal.
    return NextResponse.redirect(session.url)
  } catch (err) {
    console.error('❌ Billing portal session creation failed:', err)
    return NextResponse.redirect(`${origin}/profile?error=portal_failed`)
  }
}
