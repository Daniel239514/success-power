import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateDayNumber } from '@/lib/dayNumber'

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
    .select('subscription_start_date')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/episodes')
  }

  const currentDay = calculateDayNumber(profile.subscription_start_date)

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

      <audio controls src={episode.audio_url} className="mb-10 w-full">
        Your browser does not support the audio element.
      </audio>

      <blockquote className="border-l-4 border-[#c9a84c] pl-4 italic text-neutral-200">
        “{episode.key_quote}”
      </blockquote>
    </main>
  )
}
