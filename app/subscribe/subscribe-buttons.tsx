'use client'

import { useState } from 'react'

type Plan = 'monthly' | 'annual'

export default function SubscribeButtons() {
  // Which button is mid-request (so we can disable it and show "Redirecting…").
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function subscribe(plan: Plan) {
    setLoading(plan)
    setError(null)
    try {
      // Ask our own endpoint to create a Checkout Session.
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')

      // Send the browser to Stripe's hosted checkout page.
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(null)
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-4">
      <button
        onClick={() => subscribe('monthly')}
        disabled={loading !== null}
        className="rounded-md bg-[#c9a84c] px-6 py-4 text-base font-semibold text-black transition hover:bg-[#d4b85c] disabled:opacity-50"
      >
        {loading === 'monthly' ? 'Redirecting…' : 'Monthly — $7 / month'}
      </button>

      <button
        onClick={() => subscribe('annual')}
        disabled={loading !== null}
        className="rounded-md border border-[#c9a84c] px-6 py-4 text-base font-semibold text-[#c9a84c] transition hover:bg-[#c9a84c]/10 disabled:opacity-50"
      >
        {loading === 'annual' ? 'Redirecting…' : 'Annual — $63 / year'}
      </button>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}
