import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendToSubscription, type SubscriptionRow } from '@/lib/push'
import { currentHourInZone, dateInZone } from '@/lib/timezone'
import { calculateDayNumber, TOTAL_DAYS } from '@/lib/dayNumber'

// The local hour at which we nudge people who haven't listened yet.
const SEND_HOUR = 20 // 8 PM

export async function GET(request: NextRequest) {
  // Same secret check as the daily-episode cron.
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Testing hook: ?hour=20 to simulate 8 PM without waiting.
  const hourParam = request.nextUrl.searchParams.get('hour')
  const sendHour =
    hourParam !== null && /^\d{1,2}$/.test(hourParam) ? Number(hourParam) : SEND_HOUR

  const supabase = createAdminClient()

  // Everyone who could get a reminder.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, timezone, subscription_start_date')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Users for whom it's currently 8 PM (their time) with a start date.
  const dueUsers = (profiles ?? []).filter(
    (p) =>
      p.subscription_start_date && currentHourInZone(p.timezone) === sendHour,
  )

  if (dueUsers.length === 0) {
    return NextResponse.json({ due: 0, reminded: 0 })
  }

  const userIds = dueUsers.map((u) => u.id)
  const tzByUser = new Map(dueUsers.map((u) => [u.id, u.timezone as string]))

  // 1. Recent listening activity for these users (last 2 days is plenty to
  //    cover any time-zone edge). One query, then we group in code.
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activity } = await supabase
    .from('listening_progress')
    .select('user_id, updated_at')
    .in('user_id', userIds)
    .gte('updated_at', since)

  // Mark every user who already listened TODAY (in their own zone).
  const now = new Date()
  const listenedToday = new Set<string>()
  for (const a of activity ?? []) {
    const tz = tzByUser.get(a.user_id)
    if (dateInZone(new Date(a.updated_at), tz) === dateInZone(now, tz)) {
      listenedToday.add(a.user_id)
    }
  }

  // 2. The users we actually want to nudge: due, and NOT listened today.
  const slackers = dueUsers.filter((u) => !listenedToday.has(u.id))
  if (slackers.length === 0) {
    return NextResponse.json({ due: dueUsers.length, reminded: 0 })
  }

  // 3. Fetch their push subscriptions in one query, grouped by user.
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key')
    .in(
      'user_id',
      slackers.map((u) => u.id),
    )

  const subsByUser = new Map<string, SubscriptionRow[]>()
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  // 4. Send each slacker the reminder.
  let reminded = 0
  for (const user of slackers) {
    const userSubs = subsByUser.get(user.id)
    if (!userSubs || userSubs.length === 0) continue

    const day = calculateDayNumber(user.subscription_start_date, user.timezone)
    if (day < 1 || day > TOTAL_DAYS) continue

    const payload = {
      title: "Don't break your streak!",
      body: `Day ${day} is still waiting.`,
      url: `/episodes/${day}`,
    }

    const results = await Promise.all(
      userSubs.map((row) => sendToSubscription(supabase, row, payload)),
    )
    if (results.includes('sent')) reminded += 1
  }

  return NextResponse.json({ due: dueUsers.length, reminded })
}
