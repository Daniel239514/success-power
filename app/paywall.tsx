'use client'

import { useState } from 'react'

type Plan = 'monthly' | 'annual'

// What the server decides per visitor (Stripe/$ vs Paystack/₦) and hands down.
// The Paywall itself stays dumb about geography — it just renders this.
export type PaywallConfig = {
  processor: 'stripe' | 'paystack'
  checkoutUrl: string // /api/checkout (Stripe) or /api/paystack/checkout
  monthly: { price: string; per: string; badge?: string }
  annual: { price: string; per: string; badge?: string }
  footer: string
}

const PERKS = [
  'Daily 5-minute audio for 365 days',
  'Exclusive masterclass replays',
  'Streak tracking and milestones',
  'Cancel anytime',
]

export default function Paywall({ config }: { config: PaywallConfig }) {
  // Annual is selected by default — it's the plan we most want people to pick.
  const [selected, setSelected] = useState<Plan>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subscribe() {
    setLoading(true)
    setError(null)
    try {
      // Stripe -> /api/checkout (Slice 7), Paystack -> /api/paystack/checkout.
      // Both return { url } and we redirect the same way; only the endpoint and
      // the response field differ (Stripe: Checkout Session URL, Paystack:
      // authorization_url, which we normalise to `url` on the server).
      const res = await fetch(config.checkoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')

      // Hand off to the processor's hosted checkout page.
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.ico"
        alt="Success Power"
        className="mb-6 h-14 w-14 rounded-xl"
      />

      <h1 className="text-3xl font-bold text-[#c9a84c]">Continue your journey</h1>

      <p className="mt-3 text-neutral-300">
        You&apos;ve completed Day 1. Unlock all 365 days of Success Power.
      </p>

      <ul className="mt-8 flex w-full flex-col gap-3 text-left">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-start gap-3">
            <span className="mt-0.5 font-bold text-[#c9a84c]" aria-hidden="true">
              ✓
            </span>
            <span className="text-neutral-200">{perk}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <PlanCard
          label="Monthly"
          price={config.monthly.price}
          per={config.monthly.per}
          badge={config.monthly.badge}
          selected={selected === 'monthly'}
          onSelect={() => setSelected('monthly')}
        />
        <PlanCard
          label="Annual"
          price={config.annual.price}
          per={config.annual.per}
          badge={config.annual.badge}
          selected={selected === 'annual'}
          onSelect={() => setSelected('annual')}
        />
      </div>

      <button
        onClick={subscribe}
        disabled={loading}
        className="mt-6 w-full rounded-md bg-[#c9a84c] px-6 py-4 text-base font-semibold text-black transition hover:bg-[#d4b85c] disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Subscribe'}
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <p className="mt-4 text-xs text-neutral-500">{config.footer}</p>
    </section>
  )
}

function PlanCard({
  label,
  price,
  per,
  badge,
  selected,
  onSelect,
}: {
  label: string
  price: string
  per: string
  badge?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        'relative flex flex-col items-center rounded-xl border-2 p-5 transition ' +
        (selected
          ? 'border-[#c9a84c] bg-[#c9a84c]/10'
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600')
      }
    >
      {badge && (
        <span className="absolute -top-2 right-2 rounded-full bg-[#c9a84c] px-2 py-0.5 text-[10px] font-bold text-black">
          {badge}
        </span>
      )}
      <span className="text-sm font-semibold text-neutral-300">{label}</span>
      <span className="mt-1 text-3xl font-bold text-white">{price}</span>
      <span className="text-xs text-neutral-500">{per}</span>
    </button>
  )
}
