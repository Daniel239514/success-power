import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateDayNumber, TOTAL_DAYS } from '@/lib/dayNumber'

export default async function EpisodesPage() {
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
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-6 py-12 text-white">
        <p>Could not load your profile: {profileError?.message ?? 'No profile found.'}</p>
      </main>
    )
  }

  const dayNumber = calculateDayNumber(profile.subscription_start_date)

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('*')
    .order('day_number', { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] px-6 py-12 text-white">
        <p>Could not load episodes: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-12">
      <h1 className="mb-2 text-3xl font-bold text-[#c9a84c]">Episodes</h1>
      <p className="mb-8 text-sm text-neutral-400">
        Day {dayNumber} of {TOTAL_DAYS}
      </p>

      <ul className="flex flex-col gap-4">
        {episodes?.map((ep) => {
          const isPast = ep.day_number < dayNumber
          const isToday = ep.day_number === dayNumber
          const isLocked = ep.day_number > dayNumber

          if (isLocked) {
            return (
              <li key={ep.id}>
                <div
                  aria-disabled="true"
                  className="block cursor-not-allowed rounded-xl border border-neutral-900 bg-neutral-950 p-5 opacity-50"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-500">
                      DAY {ep.day_number}
                    </span>
                    <h2 className="text-lg font-semibold text-neutral-500">{ep.title}</h2>
                    <span className="ml-auto text-lg" aria-label="locked">
                      🔒
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">{ep.description}</p>
                </div>
              </li>
            )
          }

          return (
            <li key={ep.id}>
              <Link
                href={`/episodes/${ep.day_number}`}
                className={
                  isToday
                    ? 'block rounded-xl border-2 border-[#c9a84c] bg-neutral-900 p-5 shadow-[0_0_20px_rgba(201,168,76,0.25)] transition'
                    : 'block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-[#c9a84c]'
                }
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded-full bg-[#c9a84c] px-3 py-1 text-xs font-bold text-black">
                    DAY {ep.day_number}
                  </span>
                  <h2 className="text-lg font-semibold text-white">{ep.title}</h2>
                  {isPast && (
                    <span className="ml-auto text-green-500" aria-label="completed">
                      ✓
                    </span>
                  )}
                  {isToday && (
                    <span className="ml-auto rounded-full bg-[#c9a84c] px-2 py-0.5 text-xs font-bold text-black">
                      TODAY
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400">{ep.description}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}