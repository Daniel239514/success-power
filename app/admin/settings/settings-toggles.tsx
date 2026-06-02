'use client'

import { useState } from 'react'
import type { AppSettings } from '@/lib/settings'
import { updateSetting } from './actions'

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
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-green-500' : 'bg-slate-300'
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

export default function SettingsToggles({
  initial,
}: {
  initial: AppSettings
}) {
  const [settings, setSettings] = useState(initial)
  const [error, setError] = useState('')

  // Flip the switch immediately (optimistic), then save. If saving fails, flip
  // it back so the UI never shows a lie.
  async function save(key: keyof AppSettings, value: boolean) {
    setError('')
    setSettings((s) => ({ ...s, [key]: value }))

    const result = await updateSetting(key, value)
    if (result?.error) {
      setError('Could not save — please try again.')
      setSettings((s) => ({ ...s, [key]: !value }))
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Global on/off switches. Turning one off stops that notification for
        everyone.
      </p>

      <div className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-6">
        <Toggle
          label="Daily audio notifications"
          description="The 6 AM push telling each user their new day has unlocked."
          checked={settings.notify_daily_enabled}
          onChange={(v) => save('notify_daily_enabled', v)}
        />
        <Toggle
          label="Streak reminders"
          description="The 8 PM nudge for users who haven't listened that day."
          checked={settings.notify_streak_enabled}
          onChange={(v) => save('notify_streak_enabled', v)}
        />
        <Toggle
          label="Renewal alerts"
          description="Reminders before a subscription renews. (Reserved for a future renewal cron.)"
          checked={settings.notify_renewal_enabled}
          onChange={(v) => save('notify_renewal_enabled', v)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
