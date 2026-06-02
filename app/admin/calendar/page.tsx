import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const TOTAL_DAYS = 365
const BLOCK_SIZE = 30 // days per labelled block

export default async function CalendarPage() {
  const supabase = createAdminClient()

  const { data: episodes } = await supabase
    .from('episodes')
    .select('day_number, audio_url')

  // Build a quick lookup: day number -> does it have audio?
  const byDay = new Map<number, boolean>()
  for (const ep of episodes ?? []) {
    byDay.set(ep.day_number, Boolean(ep.audio_url))
  }

  // Work out each day's state and a running tally for the summary line.
  let published = 0
  let noAudio = 0
  let missing = 0

  type DayState = 'published' | 'noaudio' | 'missing'
  function stateFor(day: number): DayState {
    if (!byDay.has(day)) return 'missing'
    return byDay.get(day) ? 'published' : 'noaudio'
  }

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const s = stateFor(day)
    if (s === 'published') published++
    else if (s === 'noaudio') noAudio++
    else missing++
  }

  // Split 1..365 into labelled blocks of 30 so it's easy to scan.
  const blocks: number[][] = []
  for (let start = 1; start <= TOTAL_DAYS; start += BLOCK_SIZE) {
    const days: number[] = []
    for (let d = start; d < start + BLOCK_SIZE && d <= TOTAL_DAYS; d++) {
      days.push(d)
    }
    blocks.push(days)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Content calendar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Click any day to edit it, or to add an episode if it&apos;s missing.
      </p>

      {/* Summary + legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <LegendItem className="bg-green-500" label={`Published (${published})`} />
        <LegendItem className="bg-amber-400" label={`No audio (${noAudio})`} />
        <LegendItem className="bg-red-200" label={`Missing (${missing})`} />
      </div>

      <div className="mt-6 space-y-6">
        {blocks.map((days) => (
          <div key={days[0]}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Days {days[0]}–{days[days.length - 1]}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {days.map((day) => {
                const s = stateFor(day)
                const href =
                  s === 'missing'
                    ? `/admin/episodes/new?day=${day}`
                    : `/admin/episodes/${day}/edit`

                const color =
                  s === 'published'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : s === 'noaudio'
                      ? 'bg-amber-400 text-white hover:bg-amber-500'
                      : 'bg-red-200 text-red-700 hover:bg-red-300'

                const tip =
                  s === 'published'
                    ? `Day ${day} — published`
                    : s === 'noaudio'
                      ? `Day ${day} — no audio yet`
                      : `Day ${day} — missing (click to add)`

                return (
                  <Link
                    key={day}
                    href={href}
                    title={tip}
                    className={`flex h-9 w-9 items-center justify-center rounded text-xs font-medium transition ${color}`}
                  >
                    {day}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-slate-600">
      <span className={`h-4 w-4 rounded ${className}`} />
      {label}
    </span>
  )
}
