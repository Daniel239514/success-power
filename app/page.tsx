import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hasSubscriberAccess } from '@/lib/access'
import { calculateDayNumber, TOTAL_DAYS } from '@/lib/dayNumber'
import { getEpisodeForDay } from '@/lib/episodes'
import { previewText } from '@/lib/newsletter'
import { formatPrice } from '@/lib/format'
import FreePlanBanner from './free-plan-banner'
import NotificationCard from './notification-card'
import HomeStats from './home-stats'
import HomeProgress from './home-progress'
import InstallBanner from './install-banner'
import { logout } from './logout/actions'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#0a0a0a] px-6">
        <h1 className="text-center text-6xl font-bold tracking-tight text-[#c9a84c] sm:text-8xl">
          Success Power
        </h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-neutral-300">Sign up or log in to get started.</p>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-white transition hover:border-[#c9a84c] hover:text-[#c9a84c]"
            >
              Log in
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'subscription_start_date, subscription_status, subscription_plan, current_period_end',
    )
    .eq('id', user.id)
    .single()

  const isSubscriber = hasSubscriberAccess(profile)
  const planLabel = profile?.subscription_plan === 'annual' ? 'Annual' : 'Monthly'

  const tz = (await cookies()).get('tz')?.value
  const currentDay = profile
    ? calculateDayNumber(profile.subscription_start_date, tz)
    : 1

  const todayEpisode = await getEpisodeForDay(currentDay)

  // Most recent published newsletter post (for the "Latest from Sam" card).
  // Both free and paid users see it; it's hidden entirely if there are none.
  const { data: latestPost } = await supabase
    .from('posts')
    .select('title, slug, body_html')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch all in parallel — none of these depend on each other.
  const [
    { data: nextMasterclass },
    { data: firstCourse },
    { data: completedProgress },
  ] = await Promise.all([
    supabase
      .from('masterclasses')
      .select('id, title, members_price, general_price, currency, checkout_url, status')
      .in('status', ['upcoming', 'live'])
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('course_products')
      .select('id, title, price, currency, checkout_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Join listening_progress → episodes to get the day_number of each completed episode.
    // Used to compute streak, days completed, and days remaining.
    supabase
      .from('listening_progress')
      .select('episodes(day_number)')
      .eq('user_id', user.id)
      .eq('completed', true),
  ])

  // Build a set of completed day numbers for O(1) streak lookups.
  const completedDays = new Set<number>(
    (completedProgress ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => (p.episodes as { day_number: number } | null)?.day_number)
      .filter((d): d is number => d != null),
  )

  const daysCompleted = completedDays.size

  // Streak: count consecutive completed days ending on today or yesterday.
  // We allow "yesterday" so the streak stays alive if the user hasn't played
  // today's episode yet — it's still the same session day for most people.
  let streak = 0
  {
    let checkDay = completedDays.has(currentDay) ? currentDay : currentDay - 1
    if (completedDays.has(checkDay)) {
      while (checkDay >= 1 && completedDays.has(checkDay)) {
        streak++
        checkDay--
      }
    }
  }

  // Days remaining: free users are shown a 30-day journey (creates urgency to
  // subscribe); paid users see the full 365-day programme.
  const totalDays = isSubscriber ? TOTAL_DAYS : 30
  const daysRemaining = Math.max(0, totalDays - daysCompleted)

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-[#0a0a0a] px-6 pb-24 pt-10">
      {!isSubscriber && <FreePlanBanner />}

      {/* Header block — tight internal spacing so it reads as one unit */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[#c9a84c] sm:text-5xl">
          Success Power
        </h1>
        <p className="text-sm text-neutral-400">Welcome, {user.email}</p>
        {isSubscriber ? (
          <span className="rounded-full border border-[#c9a84c] bg-[#c9a84c]/10 px-4 py-1.5 text-sm font-semibold text-[#c9a84c]">
            ★ Active subscriber — {planLabel}
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="rounded-full border border-neutral-700 px-4 py-1.5 text-sm text-neutral-400">
              Free plan
            </span>
            <Link
              href="/subscribe"
              className="text-sm font-semibold text-[#c9a84c] underline-offset-4 hover:underline"
            >
              Go Premium →
            </Link>
          </div>
        )}
      </div>

      <InstallBanner />

      <NotificationCard />

      {/* Dashboard block — stats + bar are one unit, tighter internal gap */}
      <div className="flex w-full max-w-md flex-col gap-4">
        <HomeStats
          streak={streak}
          daysCompleted={daysCompleted}
          daysRemaining={daysRemaining}
        />
        <HomeProgress daysCompleted={daysCompleted} totalDays={totalDays} />
      </div>

      {todayEpisode ? (
        <article className="w-full max-w-md rounded-2xl border-2 border-[#c9a84c] bg-neutral-900 p-6 shadow-[0_0_30px_rgba(201,168,76,0.2)]">
          <span className="inline-block rounded-full bg-[#c9a84c] px-3 py-1 text-xs font-bold text-black">
            DAY {todayEpisode.day_number}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-white">{todayEpisode.title}</h2>
          <p className="mt-2 text-sm text-neutral-300">{todayEpisode.description}</p>
          <Link
            href={`/episodes/${todayEpisode.day_number}`}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
          >
            ▶ Play today&apos;s episode
          </Link>
        </article>
      ) : (
        <p className="text-neutral-400">No episode available for today yet.</p>
      )}

      {latestPost && (
        <Link
          href={`/newsletter/${latestPost.slug}`}
          className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-[#c9a84c]"
        >
          <p className="text-xs uppercase tracking-widest text-[#c9a84c]">
            Latest from Sam
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">{latestPost.title}</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {previewText(latestPost.body_html, 150)}
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-[#c9a84c]">
            Read →
          </span>
        </Link>
      )}

      {/* Upsell grid: next masterclass + first active course. Hidden if neither exists. */}
      {(nextMasterclass || firstCourse) && (
        <div className="w-full max-w-md">
          <p className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            From Sam
          </p>
          <div className="grid grid-cols-2 gap-3">
            {nextMasterclass && (
              <a
                href={nextMasterclass.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-[#c9a84c]"
              >
                {nextMasterclass.status === 'live' && (
                  <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    LIVE
                  </span>
                )}
                <p className="text-xs uppercase tracking-widest text-[#c9a84c]">
                  Masterclass
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-white">
                  {nextMasterclass.title}
                </p>
                <p className="mt-2 text-base font-bold text-[#c9a84c]">
                  {formatPrice(nextMasterclass.members_price, nextMasterclass.currency)}
                </p>
                <span className="mt-2 text-xs font-semibold text-[#c9a84c]">
                  Register →
                </span>
              </a>
            )}

            {firstCourse && (
              <a
                href={firstCourse.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-[#c9a84c]"
              >
                <p className="text-xs uppercase tracking-widest text-[#c9a84c]">
                  Course
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-white">
                  {firstCourse.title}
                </p>
                <p className="mt-2 text-base font-bold text-[#c9a84c]">
                  {formatPrice(firstCourse.price, firstCourse.currency)}
                </p>
                <span className="mt-2 text-xs font-semibold text-[#c9a84c]">
                  Get Course →
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      <Link
        href="/settings"
        className="text-sm text-neutral-400 underline-offset-4 transition hover:text-[#c9a84c] hover:underline"
      >
        Notification settings
      </Link>

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-white transition hover:border-[#c9a84c] hover:text-[#c9a84c]"
        >
          Log out
        </button>
      </form>
    </main>
  )
}
