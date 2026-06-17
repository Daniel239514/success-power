import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'

export const dynamic = 'force-dynamic'

// "Saturday, 14 June · 7:00 PM" in the visitor's local timezone.
function formatEventDate(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

function formatReplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function MasterclassPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch all upcoming/live events in one query; prioritise 'live' in code below.
  const { data: activeEvents } = await supabase
    .from('masterclasses')
    .select(
      'id, title, description, event_date, duration_minutes, members_price, general_price, currency, checkout_url, status, thumbnail_url',
    )
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true })

  const liveEvent = activeEvents?.find((e) => e.status === 'live') ?? null
  const upcomingEvent = activeEvents?.find((e) => e.status === 'upcoming') ?? null
  const featuredEvent = liveEvent ?? upcomingEvent

  // Past masterclasses with a published replay, newest first.
  const { data: replays } = await supabase
    .from('masterclasses')
    .select('id, title, event_date, replay_url, thumbnail_url')
    .eq('status', 'past')
    .eq('replay_published', true)
    .order('event_date', { ascending: false })

  // Active course products, newest first.
  const { data: courses } = await supabase
    .from('course_products')
    .select('id, title, description, price, currency, checkout_url, thumbnail_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const replayList = replays ?? []
  const courseList = courses ?? []

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-[#c9a84c]">
          Masterclass
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Live sessions and courses from Sam.
        </p>

        {/* ── UPCOMING / LIVE EVENT ─────────────────────────────────────── */}
        <section className="mt-8">
          {featuredEvent ? (
            <div className="rounded-2xl border-2 border-[#c9a84c] bg-neutral-900 p-6 shadow-[0_0_30px_rgba(201,168,76,0.15)]">
              {featuredEvent.status === 'live' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-sm font-bold text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  LIVE NOW
                </span>
              ) : (
                <span className="inline-block rounded-full bg-[#c9a84c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">
                  Upcoming
                </span>
              )}

              {featuredEvent.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featuredEvent.thumbnail_url}
                  alt={featuredEvent.title}
                  className="mt-4 h-48 w-full rounded-xl object-cover"
                />
              )}

              <h2 className="mt-4 text-2xl font-bold text-white">
                {featuredEvent.title}
              </h2>

              {featuredEvent.description && (
                <p className="mt-2 text-sm text-neutral-400">
                  {featuredEvent.description}
                </p>
              )}

              <p className="mt-3 text-sm font-medium text-neutral-300">
                {formatEventDate(featuredEvent.event_date)}
              </p>
              <p className="text-xs text-neutral-500">
                {featuredEvent.duration_minutes} minutes
              </p>

              <div className="mt-4 flex gap-4">
                <div className="rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/5 px-4 py-2 text-center">
                  <p className="text-xs text-neutral-400">Members</p>
                  <p className="text-lg font-bold text-[#c9a84c]">
                    {formatPrice(featuredEvent.members_price, featuredEvent.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2 text-center">
                  <p className="text-xs text-neutral-400">General</p>
                  <p className="text-lg font-bold text-white">
                    {formatPrice(featuredEvent.general_price, featuredEvent.currency)}
                  </p>
                </div>
              </div>

              <a
                href={featuredEvent.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
              >
                {featuredEvent.status === 'live' ? 'Join Now →' : 'Register Now →'}
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
              <p className="text-neutral-500">
                No upcoming masterclass — check back soon.
              </p>
            </div>
          )}
        </section>

        {/* ── REPLAY LIBRARY ────────────────────────────────────────────── */}
        {replayList.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white">Replay Library</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Missed a session? Watch it back.
            </p>
            <ul className="mt-4 space-y-4">
              {replayList.map((replay) => (
                <li key={replay.id}>
                  <div className="flex gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-[#c9a84c]/50">
                    {replay.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={replay.thumbnail_url}
                        alt={replay.title}
                        className="h-20 w-28 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c]/10">
                        <span className="text-2xl">▶</span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="text-xs text-neutral-500">
                          {formatReplayDate(replay.event_date)}
                        </p>
                        <h3 className="mt-1 font-semibold text-white">
                          {replay.title}
                        </h3>
                      </div>
                      <a
                        href={replay.replay_url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex w-fit items-center gap-1 rounded-md border border-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c] hover:text-black"
                      >
                        Watch Replay →
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── COURSE PRODUCTS ───────────────────────────────────────────── */}
        {courseList.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white">Courses</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Self-paced programmes you can start today.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {courseList.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-[#c9a84c]/50"
                >
                  {course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center rounded-lg bg-[#c9a84c]/10">
                      <span className="text-3xl">📚</span>
                    </div>
                  )}
                  <h3 className="mt-3 text-sm font-semibold leading-snug text-white">
                    {course.title}
                  </h3>
                  <p className="mt-1 text-base font-bold text-[#c9a84c]">
                    {formatPrice(course.price, course.currency)}
                  </p>
                  <a
                    href={course.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 rounded-md bg-[#c9a84c] px-3 py-2 text-center text-xs font-semibold text-black transition hover:bg-[#d4b85c]"
                  >
                    Get Course →
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
