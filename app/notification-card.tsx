'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const DISMISS_KEY = 'spw_notif_card_dismissed'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

type Status = 'loading' | 'hidden' | 'prompt' | 'working'

export default function NotificationCard() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    async function check() {
      // Browser doesn't support push at all.
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setStatus('hidden')
        return
      }

      // User already blocked — can't re-ask, nothing to show.
      if (Notification.permission === 'denied') {
        setStatus('hidden')
        return
      }

      // Already subscribed on this device — card not needed.
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        setStatus('hidden')
        return
      }

      // User previously dismissed this card.
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setStatus('hidden')
        return
      }

      setStatus('prompt')
    }

    check().catch(() => setStatus('hidden'))
  }, [])

  function dismiss() {
    setLeaving(true)
    setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, '1')
      setStatus('hidden')
    }, 220)
  }

  async function enable() {
    setError(null)
    setStatus('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'hidden' : 'prompt')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save subscription.')
      }

      setStatus('hidden')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('prompt')
    }
  }

  if (status === 'loading' || status === 'hidden') return null

  return (
    <div
      className={`w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-[opacity,transform] duration-200 ${leaving ? 'pointer-events-none -translate-y-2 opacity-0' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>🔔</span>
          <p className="text-sm font-semibold text-white">
            Get your 6 AM motivation delivered daily
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification card"
          className="shrink-0 text-neutral-500 transition hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Mock notification preview */}
      <div className="mt-3 rounded-lg bg-neutral-800 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#c9a84c]/20 text-xs">
            🔔
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-200">Success Power</p>
            <p className="truncate text-xs text-neutral-400">
              Your daily episode is ready. Keep your streak going!
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={enable}
          disabled={status === 'working'}
          className="rounded-md bg-[#c9a84c] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#d4b85c] disabled:opacity-50 active:scale-95"
        >
          {status === 'working' ? 'Enabling…' : 'Enable Notifications'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-neutral-500 transition hover:text-neutral-300"
        >
          Not now
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
