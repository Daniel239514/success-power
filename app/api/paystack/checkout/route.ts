import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Map the plan name the browser sends to Paystack's plan code + amount in KOBO.
// Kept server-side so the browser can never pick an arbitrary price (same reason
// as Stripe's PRICE_IDS). ₦1 = 100 kobo, exactly like Stripe's cents:
// ₦2,000 -> 200,000 kobo, ₦18,000 -> 1,800,000 kobo. The amount must match the
// plan's amount or Paystack rejects it.
const PLANS: Record<string, { planCode: string; amount: number }> = {
  monthly: { planCode: process.env.PAYSTACK_PLAN_MONTHLY!, amount: 200_000 },
  annual: { planCode: process.env.PAYSTACK_PLAN_ANNUAL!, amount: 1_800_000 },
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
  const chosen = PLANS[plan]
  if (!chosen) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  // 3. Where Paystack should send the browser back after payment.
  const origin = request.headers.get('origin') ?? new URL(request.url).origin

  // 4. A unique reference for THIS attempt. Unlike Stripe (which hands us a
  //    session id), with Paystack we invent the reference ourselves; it's how
  //    we'll later match a webhook to this transaction.
  const reference = `sp_${crypto.randomUUID()}`

  // 5. Call Paystack's Initialize Transaction endpoint. There's no official SDK
  //    we need here — it's a plain REST call authorised with the SECRET key.
  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: chosen.amount,
        plan: chosen.planCode,
        reference,
        callback_url: `${origin}/subscribe/success`,
        // metadata = our private note, read back by the webhook to know WHICH
        // Supabase user paid and which plan — mirror of Stripe's metadata.
        metadata: { supabase_user_id: user.id, plan },
      }),
    })

    const data = await res.json()

    // Paystack signals success with a top-level `status: true`. A failure still
    // returns 200 with status:false and a message, so check the body, not res.ok.
    if (!data.status) {
      console.error('❌ Paystack initialize failed:', data)
      return NextResponse.json(
        { error: data.message ?? 'Could not start checkout.' },
        { status: 502 },
      )
    }

    // 6. Hand the hosted-checkout URL back to the browser. Paystack calls it
    //    authorization_url; we normalise it to `url` so the Paywall component
    //    treats both processors identically.
    return NextResponse.json({ url: data.data.authorization_url })
  } catch (err) {
    console.error('❌ Paystack checkout error:', err)
    const message = err instanceof Error ? err.message : 'Could not start checkout.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
