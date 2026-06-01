import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendToSubscription } from '@/lib/push'

// DEV/TEST endpoint: sends a test notification to every device the logged-in
// user has subscribed. This is how you confirm the whole pipeline works
// without waiting for a cron job. (We'll hide the button that calls this later.)
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  // Read THIS user's subscriptions (RLS limits the result to their own rows).
  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: 'No subscriptions found. Tap “Enable notifications” first.' },
      { status: 400 },
    )
  }

  // Fire all sends in parallel, then tally the outcomes.
  const results = await Promise.all(
    rows.map((row) =>
      sendToSubscription(supabase, row, {
        title: 'Hello from Success Power',
        body: 'Your notifications are working 🎉',
        url: '/',
      }),
    ),
  )

  const sent = results.filter((r) => r === 'sent').length
  return NextResponse.json({ sent, total: rows.length, results })
}
