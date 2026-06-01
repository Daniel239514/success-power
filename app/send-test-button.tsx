'use client'

import { useState } from 'react'

// DEV-ONLY: a button to fire a test push at your own devices. Lets you confirm
// the subscribe → send → display loop without waiting for a cron job.
// Remove (or hide behind an env check) before showing real users.
export default function SendTestButton() {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send.')
      setMessage(`Sent to ${data.sent}/${data.total} device(s).`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={send}
        disabled={loading}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-500 disabled:opacity-50"
      >
        {loading ? 'Sending…' : '(dev) Send test notification'}
      </button>
      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </div>
  )
}
