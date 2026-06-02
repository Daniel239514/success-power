'use client'

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'done' | 'error'

export default function BroadcastsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSend() {
    setMessage('')

    if (!title.trim() || !body.trim()) {
      setStatus('error')
      setMessage('Title and body are both required.')
      return
    }

    // Broadcasts are irreversible — always confirm.
    const ok = window.confirm(
      'Send this notification to ALL subscribers now? This cannot be undone.',
    )
    if (!ok) return

    setStatus('sending')
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong.')
        return
      }

      setStatus('done')
      setMessage(
        `Sent to ${data.sent} ${data.sent === 1 ? 'subscriber' : 'subscribers'}.`,
      )
    } catch {
      setStatus('error')
      setMessage('Network error — please try again.')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Broadcasts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Send a push notification to everyone who has notifications enabled.
      </p>

      <div className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="New episode is live!"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Today's episode is ready — give it a listen."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Link to open when tapped (optional)
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="/episodes/47  (defaults to the home page)"
          />
        </div>

        {/* Live preview of what the notification will look like */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Preview</p>
          <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="h-10 w-10 shrink-0 rounded-md bg-[#c9a84c]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {title.trim() || 'Notification title'}
              </p>
              <p className="text-sm text-slate-600">
                {body.trim() || 'Notification body text will appear here.'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Success Power</p>
            </div>
          </div>
        </div>

        {message && (
          <p
            className={`text-sm ${
              status === 'error' ? 'text-red-600' : 'text-green-700'
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={status === 'sending'}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send to all'}
        </button>
      </div>
    </div>
  )
}
