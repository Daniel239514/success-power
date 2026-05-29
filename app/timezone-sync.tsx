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

    const current = document.cookie
      .split('; ')
      .find((row) => row.startsWith('tz='))
      ?.slice(3)

    if (current === tz) return

    document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }, [router])

  return null
}
