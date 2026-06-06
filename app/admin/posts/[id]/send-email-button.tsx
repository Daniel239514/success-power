'use client'

import { useState } from 'react'

// Manually trigger the newsletter email for this post (admin re-send). Calls the
// /api/admin/posts/[id]/send-email route. In test mode the server only delivers
// to your own address — see lib/newsletter.ts.
export default function SendEmailButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function handleClick() {
    const ok = window.confirm(
      'Send the newsletter email for this post now? (In test mode only your own address actually receives it.)',
    )
    if (!ok) return

    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/posts/${id}/send-email`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setMessage(`Done — ${data.sent} delivered, ${data.failed} failed.`)
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      >
        {busy ? 'Sending…' : '✉️ Send newsletter email now'}
      </button>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </div>
  )
}
