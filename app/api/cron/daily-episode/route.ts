import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendToSubscription, type SubscriptionRow } from '@/lib/push'
import { currentHourInZone } from '@/lib/timezone'
import { calculateDayNumber, TOTAL_DAYS } from '@/lib/dayNumber'
import { getEpisodeForDay } from '@/lib/episodes'

// The hour (local to each user) at which we send the "new episode" push.
const SEND_HOUR = 6

// Vercel calls this every hour (see vercel.json). It runs with NO user session,
// so it uses the admin client (bypasses RLS) to read everyone's data.
export async function GET(request: NextRequest) {
  // 1. Security: only allow callers that know the secret. Vercel Cron sends it
  //    automatically as "Authorization: Bearer <CRON_SECRET>".
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Testing hook: an authorized caller may override the send hour with
  // ?hour=14 to simulate "it's 2 PM somewhere" without waiting for 6 AM.
  // Vercel's real cron call omits this, so it uses SEND_HOUR (6).
  const hourParam = request.nextUrl.searchParams.get('hour')
  const sendHour =
    hourParam !== null && /^\d{1,2}$/.test(hourParam) ? Number(hourParam) : SEND_HOUR

  const supabase = createAdminClient()

  // 2. Get everyone who could receive a notification.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, timezone, subscription_start_date, notify_daily')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. Keep only users for whom it's currently the send hour (6 AM their time),
  //    who have a start date, and who haven't switched daily alerts off.
  const dueUsers = (profiles ?? []).filter(
    (p) =>
      p.subscription_start_date &&
      p.notify_daily !== false &&
      currentHourInZone(p.timezone) === sendHour,
  )

  if (dueUsers.length === 0) {
    return NextResponse.json({ due: 0, sent: 0 })
  }

  // 4. Fetch all push subscriptions for those users in one query, then group
  //    them by user so we can send to each of a user's devices.
  const userIds = dueUsers.map((u) => u.id)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key')
    .in('user_id', userIds)

  const subsByUser = new Map<string, SubscriptionRow[]>()
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  // 5. For each due user: work out their day + episode, then push to devices.
  let sent = 0
  for (const user of dueUsers) {
    const userSubs = subsByUser.get(user.id)
    if (!userSubs || userSubs.length === 0) continue // no devices to notify

    const day = calculateDayNumber(user.subscription_start_date, user.timezone)
    if (day < 1 || day > TOTAL_DAYS) continue // outside the programme

    const episode = await getEpisodeForDay(day)
    if (!episode) continue // no episode for this day

    const payload = {
      title: `Day ${day} is ready`,
      body: `${episode.title} — 5 mins with Sam.`,
      url: `/episodes/${day}`,
    }

    const results = await Promise.all(
      userSubs.map((row) => sendToSubscription(supabase, row, payload)),
    )
    sent += results.filter((r) => r === 'sent').length
  }

  return NextResponse.json({ due: dueUsers.length, sent })
}
