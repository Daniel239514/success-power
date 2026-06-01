'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// A single on/off switch with a label and description.
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-neutral-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-[#c9a84c]' : 'bg-neutral-600'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function NotificationSettings({
  userId,
  initialDaily,
  initialStreak,
}: {
  userId: string
  initialDaily: boolean
  initialStreak: boolean
}) {
  const [supabase] = useState(() => createClient())
  const [daily, setDaily] = useState(initialDaily)
  const [streak, setStreak] = useState(initialStreak)
  const [error, setError] = useState<string | null>(null)

  // Update one preference. We flip the switch immediately (optimistic), then
  // save; if the save fails we flip it back so the UI never lies.
  async function update(column: 'notify_daily' | 'notify_streak', value: boolean) {
    setError(null)
    if (column === 'notify_daily') setDaily(value)
    else setStreak(value)

    const { error } = await supabase
      .from('profiles')
      .update({ [column]: value })
      .eq('id', userId)

    if (error) {
      setError('Could not save — please try again.')
      if (column === 'notify_daily') setDaily(!value)
      else setStreak(!value)
    }
  }

  return (
    <div className="divide-y divide-neutral-800">
      <Toggle
        label="Daily audio alerts"
        description="A reminder each morning when your new day unlocks."
        checked={daily}
        onChange={(v) => update('notify_daily', v)}
      />
      <Toggle
        label="Streak reminders"
        description="An evening nudge if you haven't listened that day."
        checked={streak}
        onChange={(v) => update('notify_streak', v)}
      />
      {error && <p className="pt-3 text-xs text-red-400">{error}</p>}
    </div>
  )
}
