import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateDayNumber } from '@/lib/dayNumber'
import { canPlayEpisode } from '@/lib/access'
import CustomAudioPlayer from '@/app/custom-audio-player'
import Paywall from '@/app/paywall'
import { getPaywallConfig } from '@/lib/paywall-config'

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ day: string }>
}) {
  const { day } = await params
  const requestedDay = Number.parseInt(day, 10)

  if (Number.isNaN(requestedDay)) {
    notFound()
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_start_date, subscription_status, current_period_end')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/episodes')
  }

  const tz = (await cookies()).get('tz')?.value
  const currentDay = calculateDayNumber(profile.subscription_start_date, tz)

  if (requestedDay > currentDay) {
    redirect('/episodes')
  }

  const { data: episode, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('day_number', requestedDay)
    .single()

  if (error || !episode) {
    notFound()
  }

  // Day-lock (requestedDay > currentDay) was already handled above with a
  // redirect, so a `false` here can only mean the subscription rule: a free
  // user trying to play Day 2+. In that case we render the paywall and never
  // send the audio URL to the browser.
  const canPlay = canPlayEpisode(profile, episode, currentDay)

  // Only resolve the geo/processor config when we're actually going to show the
  // paywall — paying users skip the lookup entirely.
  const paywallConfig = canPlay ? null : await getPaywallConfig()

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-10 text-white">
      <Link
        href="/episodes"
        className="mb-8 inline-block text-sm text-neutral-400 transition hover:text-[#c9a84c]"
      >
        ← Back to Episodes
      </Link>

      <span className="mb-4 inline-block rounded-full bg-[#c9a84c] px-3 py-1 text-xs font-bold text-black">
        DAY {episode.day_number}
      </span>

      <h1 className="mb-4 text-3xl font-bold text-[#c9a84c]">{episode.title}</h1>

      <p className="mb-8 text-neutral-300">{episode.description}</p>

      {canPlay ? (
        <>
          <CustomAudioPlayer
            title={episode.title}
            episodeId={episode.id}
            userId={user.id}
          />

          <blockquote className="border-l-4 border-[#c9a84c] pl-4 italic text-neutral-200">
            “{episode.key_quote}”
          </blockquote>
        </>
      ) : (
        <Paywall config={paywallConfig!} />
      )}
    </main>
  )
}
