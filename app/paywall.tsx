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

// A short currency label per processor, for the toggle buttons.
function currencyLabel(processor: 'stripe' | 'paystack'): string {
  return processor === 'paystack' ? '₦ Naira' : '$ USD'
}

export default function Paywall({
  config,
  altConfig,
}: {
  config: PaywallConfig
  // When provided (subscribe page), the user can switch currency/processor.
  // When omitted (locked-episode paywall), a single currency shows as before.
  altConfig?: PaywallConfig
}) {
  // Annual is selected by default — it's the plan we most want people to pick.
  const [selected, setSelected] = useState<Plan>('annual')
  // Which processor the user picked. Defaults to the geo config passed in.
  const [processor, setProcessor] = useState<'stripe' | 'paystack'>(
    config.processor,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The active config is whichever processor is selected. With no altConfig
  // there's only one, so it's always `config`.
  const active =
    altConfig && processor === altConfig.processor ? altConfig : config

  async function subscribe() {
    setLoading(true)
    setError(null)
    try {
      // Stripe -> /api/checkout (Slice 7), Paystack -> /api/paystack/checkout.
      // Both return { url } and we redirect the same way; only the endpoint and
      // the response field differ (Stripe: Checkout Session URL, Paystack:
      // authorization_url, which we normalise to `url` on the server).
      const res = await fetch(active.checkoutUrl, {
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

      {/* Currency toggle — only shown when an alternative is offered. */}
      {altConfig && (
        <div className="mt-8 grid w-full grid-cols-2 gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-1">
          {[config, altConfig].map((c) => {
            const isActive = active.processor === c.processor
            return (
              <button
                key={c.processor}
                type="button"
                onClick={() => setProcessor(c.processor)}
                aria-pressed={isActive}
                className={
                  'rounded-md py-2 text-sm font-semibold transition ' +
                  (isActive
                    ? 'bg-[#c9a84c] text-black'
                    : 'text-neutral-400 hover:text-white')
                }
              >
                {currencyLabel(c.processor)}
              </button>
            )
          })}
        </div>
      )}

      <div className={`${altConfig ? 'mt-4' : 'mt-8'} grid w-full grid-cols-2 gap-3`}>
        <PlanCard
          label="Monthly"
          price={active.monthly.price}
          per={active.monthly.per}
          badge={active.monthly.badge}
          selected={selected === 'monthly'}
          onSelect={() => setSelected('monthly')}
        />
        <PlanCard
          label="Annual"
          price={active.annual.price}
          per={active.annual.per}
          badge={active.annual.badge}
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

      <p className="mt-4 text-xs text-neutral-500">{active.footer}</p>
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
