import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { calculateDayNumber, TOTAL_DAYS } from '@/lib/dayNumber'
import { getEpisodeForDay } from '@/lib/episodes'
import FreePlanBanner from './free-plan-banner'
import EnableNotifications from './enable-notifications'
import SendTestButton from './send-test-button'
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
    .select('subscription_start_date, subscription_status, subscription_plan')
    .eq('id', user.id)
    .single()

  const isSubscriber = profile?.subscription_status === 'active'
  const planLabel = profile?.subscription_plan === 'annual' ? 'Annual' : 'Monthly'

  const tz = (await cookies()).get('tz')?.value
  const currentDay = profile
    ? calculateDayNumber(profile.subscription_start_date, tz)
    : 1

  const todayEpisode = await getEpisodeForDay(currentDay)

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-[#0a0a0a] px-6 pb-24 pt-12">
      {!isSubscriber && <FreePlanBanner />}

      <h1 className="text-center text-4xl font-bold tracking-tight text-[#c9a84c] sm:text-5xl">
        Success Power
      </h1>

      <p className="text-sm text-neutral-400">Welcome, {user.email}</p>

      {isSubscriber ? (
        <span className="rounded-full border border-[#c9a84c] bg-[#c9a84c]/10 px-4 py-1.5 text-sm font-semibold text-[#c9a84c]">
          ★ Active subscriber — {planLabel}
        </span>
      ) : (
        <div className="flex flex-col items-center gap-2">
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

      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-neutral-500">Today</p>
        <p className="mt-2 text-6xl font-bold text-white sm:text-7xl">
          Day {currentDay}
        </p>
        <p className="mt-1 text-base text-neutral-400">of {TOTAL_DAYS}</p>
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

      <EnableNotifications />

      <SendTestButton />

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
