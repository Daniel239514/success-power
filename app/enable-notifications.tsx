'use client'

import { useEffect, useState } from 'react'

// Your VAPID PUBLIC key, injected at build time. Safe to expose — it can only
// be used to verify your server's signature, never to send pushes as you.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

// pushManager.subscribe() needs the key as a byte array, not a base64 string.
// This is standard boilerplate — converts URL-safe base64 to a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Back the array with a concrete ArrayBuffer so the type is exactly
  // Uint8Array<ArrayBuffer> (what pushManager.subscribe expects).
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

type Status = 'loading' | 'unsupported' | 'denied' | 'prompt' | 'working' | 'subscribed'

export default function EnableNotifications() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  // On mount, decide what (if anything) to show. We never prompt here —
  // we only LOOK at the current state. The prompt happens on a button tap.
  useEffect(() => {
    async function check() {
      // Does this browser support push at all? (iOS < 16.4, some desktops, etc.)
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setStatus('unsupported')
        return
      }

      // The user previously blocked notifications — can't re-ask from JS.
      if (Notification.permission === 'denied') {
        setStatus('denied')
        return
      }

      // Already subscribed on this device? Then hide the button.
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      setStatus(existing ? 'subscribed' : 'prompt')
    }

    check().catch(() => setStatus('unsupported'))
  }, [])

  async function enable() {
    setError(null)
    setStatus('working')
    try {
      // 1. Ask permission (native browser dialog). MUST be inside this tap.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'prompt')
        return
      }

      // 2. Subscribe with the push service, tied to our app via the VAPID key.
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true, // required by Chrome: every push shows a notification
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 3. Send the subscription to our server to store in push_subscriptions.
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save subscription.')
      }

      // 4. Done — hide the button.
      setStatus('subscribed')
    } catch (err) {
      console.error('Enable notifications failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('prompt')
    }
  }

  // Hide entirely when there's nothing useful to show.
  if (status === 'loading' || status === 'unsupported' || status === 'subscribed') {
    return null
  }

  if (status === 'denied') {
    return (
      <p className="max-w-md text-center text-xs text-neutral-500">
        Notifications are blocked. To turn them on, open this site&apos;s settings in
        your browser and allow notifications.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={enable}
        disabled={status === 'working'}
        className="rounded-md border border-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c]/10 disabled:opacity-50"
      >
        {status === 'working' ? 'Enabling…' : '🔔 Enable notifications'}
      </button>
      {error && <p className="max-w-md text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
