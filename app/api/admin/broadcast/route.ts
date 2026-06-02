import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendToSubscription } from '@/lib/push'

// web-push needs Node APIs, so force the Node.js runtime (not Edge).
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // THE GATE. Non-admins get a 403 — even if they call this URL directly,
  // bypassing the UI entirely. This is the server-side lock for the API.
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, body, url } = await request.json().catch(() => ({}))

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: 'Title and body are required.' },
      { status: 400 },
    )
  }

  // Service-role client: read EVERY device's subscription (RLS would hide
  // other users' rows from a normal query).
  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh_key, auth_key')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const payload = {
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/',
  }

  // Send to every device in parallel. sendToSubscription cleans up dead
  // subscriptions (404/410) as it goes.
  const results = await Promise.all(
    rows.map((row) => sendToSubscription(supabase, row, payload)),
  )

  const sent = results.filter((r) => r === 'sent').length
  return NextResponse.json({ sent, total: rows.length })
}
