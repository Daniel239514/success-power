'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Remember the dismissal in the browser so the banner doesn't nag on every
// reload. localStorage is a tiny per-browser key/value store that survives
// refreshes and restarts.
const STORAGE_KEY = 'free-plan-banner-dismissed'

export default function FreePlanBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') setDismissed(true)
  }, [])

  if (dismissed) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-3 text-sm">
      <p className="text-neutral-200">
        You&apos;re on the free plan.{' '}
        <Link
          href="/subscribe"
          className="font-semibold text-[#c9a84c] underline-offset-4 hover:underline"
        >
          Subscribe
        </Link>{' '}
        to unlock all 365 days.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 text-neutral-400 transition hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}
