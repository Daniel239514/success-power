'use client'

import { useEffect, useState } from 'react'

export default function HomeStats({
  streak,
  daysCompleted,
  daysRemaining,
}: {
  streak: number
  daysCompleted: number
  daysRemaining: number
}) {
  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-3 min-[360px]:grid-cols-3">
      <StatCard value={streak} label="Current Streak" unit="days" />
      <StatCard value={daysCompleted} label="Days Completed" />
      <StatCard value={daysRemaining} label="Days Remaining" />
    </div>
  )
}

function StatCard({
  value,
  label,
  unit,
}: {
  value: number
  label: string
  unit?: string
}) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    // Skip animation for zero — nothing to count up to.
    if (value === 0) return
    // Respect the OS reduced-motion preference.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(value)
      return
    }
    const duration = 600
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Cubic ease-out: fast start, decelerates to the final value.
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(eased * value))
      if (t < 1) requestAnimationFrame(tick)
    }
    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <div className="flex flex-col items-center rounded-xl bg-neutral-900 px-3 py-4 text-center">
      <span className="text-3xl font-bold tabular-nums text-[#c9a84c]">{displayed}</span>
      {unit && (
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">{unit}</span>
      )}
      <span className="mt-1 text-xs text-neutral-400">{label}</span>
    </div>
  )
}
