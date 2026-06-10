'use client'

import { useEffect, useState } from 'react'

export default function HomeProgress({
  daysCompleted,
  totalDays,
}: {
  daysCompleted: number
  totalDays: number
}) {
  // Start at 0 so the CSS transition fires on mount (animates from empty to real value).
  const [fillPct, setFillPct] = useState(0)
  const targetPct = totalDays > 0 ? Math.min(100, (daysCompleted / totalDays) * 100) : 0

  useEffect(() => {
    // 50ms delay lets the browser paint the empty bar first, so the slide is visible.
    const t = setTimeout(() => setFillPct(targetPct), 50)
    return () => clearTimeout(t)
  }, [targetPct])

  return (
    <div className="w-full max-w-md">
      {/* Track */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
        {/* Fill — width transitions from 0 → real value over 800ms */}
        <div
          className="h-full rounded-full transition-[width] duration-[800ms] ease-out"
          style={{
            width: `${fillPct}%`,
            background: 'linear-gradient(to right, #F59E0B, #D97706)',
          }}
        />
      </div>

      <p className="mt-2 text-center text-xs text-neutral-500">
        {daysCompleted} of {totalDays} days complete
      </p>

      {daysCompleted === 0 && (
        <p className="mt-3 text-center text-sm font-medium text-[#c9a84c]">
          Start your journey today ✦
        </p>
      )}
    </div>
  )
}
