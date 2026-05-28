import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// Map the plan name the browser sends to the real Price ID (kept server-side
// so the browser can never pick an arbitrary price).
const PRICE_IDS: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
}

export async function POST(request: NextRequest) {
  // 1. Who is asking? Only a logged-in user may start a checkout.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  // 2. Which plan did they choose?
  const { plan } = await request.json()
  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  // 3. Where Stripe should send the browser back to (works locally and on Vercel).
  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  // 4. Create the Checkout Session.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe/cancelled`,
    // metadata = our own private note attached to this payment. The webhook
    // reads it back to know WHICH Supabase user just paid.
    metadata: { supabase_user_id: user.id, plan },
    // Copy the same note onto the Subscription object, so the cancellation
    // webhook can identify the user too.
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan },
    },
  })

  // 5. Hand the hosted-checkout URL back to the browser to redirect to.
  return NextResponse.json({ url: session.url })
}
