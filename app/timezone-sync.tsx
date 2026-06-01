'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Records the visitor's time zone in a cookie so server components can compute
// the day number in the user's own zone instead of the server's UTC. When the
// zone is first recorded (or changes), it refreshes once so the day updates
// immediately. Draws nothing.
export default function TimezoneSync() {
  const router = useRouter()

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return

    // 1. Cookie — lets server components compute the day number in the user's
    //    zone. Only rewrite + refresh when it actually changed.
    const current = document.cookie
      .split('; ')
      .find((row) => row.startsWith('tz='))
      ?.slice(3)

    if (current !== tz) {
      document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    }

    // 2. Profile — the hourly cron has no cookie, so it reads the zone from the
    //    profile row instead. Save it (once per zone) for logged-in users. The
    //    route 401s harmlessly when logged out, so we just don't set the flag.
    if (localStorage.getItem('tz_saved') !== tz) {
      fetch('/api/profile/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      })
        .then((res) => {
          if (res.ok) localStorage.setItem('tz_saved', tz)
        })
        .catch(() => {
          // Network hiccup — we'll try again on the next page load.
        })
    }
  }, [router])

  return null
}
