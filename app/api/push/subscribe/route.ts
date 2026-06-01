import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The browser POSTs its PushSubscription here after the user grants permission.
// A subscription's JSON looks like:
//   { endpoint: "https://fcm.googleapis.com/...", keys: { p256dh: "...", auth: "..." } }
// We pull those three values out and save one row in push_subscriptions.
export async function POST(request: NextRequest) {
  // 1. Only a logged-in user may save a subscription (and only for themselves —
  //    RLS enforces that on the insert below).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  // 2. Read the subscription the browser sent and make sure it's complete.
  const subscription = await request.json()
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
  }

  // 3. Save it. If this exact device (endpoint) already exists, do nothing
  //    instead of erroring — that's what ignoreDuplicates does (INSERT ... ON
  //    CONFLICT DO NOTHING). So re-tapping "Enable" is harmless.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh_key: p256dh,
      auth_key: auth,
    },
    { onConflict: 'endpoint', ignoreDuplicates: true },
  )

  if (error) {
    console.error('❌ Failed to save push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
