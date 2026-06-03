'use client'

import { useState } from 'react'

// Everything the Profile screen needs, loaded once on the server and passed
// down. As we build Steps B–K this component grows the edit field,
// subscription card, toggles, timezone picker and sign-out.
export type ProfileProps = {
  email: string
  fullName: string
  subscriptionStatus: string
  subscriptionPlan: string | null
  currentPeriodEnd: string | null
  stripeCustomerId: string | null
  paystackCustomerCode: string | null
  timezone: string | null
}

// Initials for the avatar: first letter of first name + first letter of last
// name. If the name is empty (or a single word), fall back gracefully so the
// circle is never blank.
function getInitials(fullName: string, email: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  // No name yet -> use the email's first character.
  return (email[0] ?? '?').toUpperCase()
}

// "annual" -> "Annual", "monthly" -> "Monthly", anything else -> "Free".
// 'cancelling' users still have a paid plan until period end, so show it.
function getPlanLabel(status: string, plan: string | null): string {
  if (status !== 'active' && status !== 'cancelling') return 'Free'
  if (plan === 'annual') return 'Annual'
  if (plan === 'monthly') return 'Monthly'
  return 'Free'
}

// The full plan line with price + currency. Currency follows the processor:
// Stripe bills in USD, Paystack in NGN (prices mirror lib/paywall-config.ts).
function getPlanLine(
  status: string,
  plan: string | null,
  processor: 'stripe' | 'paystack' | null,
): string {
  if (status !== 'active' && status !== 'cancelling') return 'Free'
  if (processor === 'paystack') {
    if (plan === 'annual') return 'Annual ₦18,000/year'
    if (plan === 'monthly') return 'Monthly ₦2,000/month'
  }
  // Default to Stripe / USD.
  if (plan === 'annual') return 'Annual $63/year'
  if (plan === 'monthly') return 'Monthly $7/month'
  return 'Free'
}

// Fixed en-US format so server and client render the same string (no
// hydration mismatch). e.g. "Jun 1, 2027".
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ProfileClient(props: ProfileProps) {
  const { email, subscriptionPlan, currentPeriodEnd } = props

  // Status lives in state so cancelling updates the card without a reload.
  const [subStatus, setSubStatus] = useState(props.subscriptionStatus)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  // The name lives in state so the header (initials + name) updates the moment
  // the user saves, without a page reload. `savedName` is what's persisted;
  // `draftName` is what's in the input box.
  const [savedName, setSavedName] = useState(props.fullName)
  const [draftName, setDraftName] = useState(props.fullName)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )

  const initials = getInitials(savedName, email)
  const planLabel = getPlanLabel(subStatus, subscriptionPlan)
  const isActive = subStatus === 'active'
  const isCancelling = subStatus === 'cancelling'
  const hasAccess = isActive || isCancelling

  // Which processor manages this subscription decides the management button.
  const processor: 'stripe' | 'paystack' | null = props.stripeCustomerId
    ? 'stripe'
    : props.paystackCustomerCode
      ? 'paystack'
      : null
  const planLine = getPlanLine(subStatus, subscriptionPlan, processor)

  async function confirmCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/paystack/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Cancel failed')
      setSubStatus('cancelling')
      setShowCancelModal(false)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }

  async function saveName() {
    setStatus('saving')
    try {
      const res = await fetch('/api/profile/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: draftName }),
      })
      if (!res.ok) throw new Error('save failed')
      setSavedName(draftName.trim())
      setStatus('saved')
      // Fade the "Saved" note after a moment.
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  // Disable Save while saving, or when nothing changed.
  const nothingChanged = draftName.trim() === savedName.trim()

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 pt-12 text-white">
      <div className="mx-auto w-full max-w-md">
        {/* ── Profile header ───────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#c9a84c] bg-neutral-900 text-3xl font-bold text-[#c9a84c]">
            {initials}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-white">
            {savedName.trim() || (
              <span className="text-neutral-500">Add your name</span>
            )}
          </h1>

          <p className="mt-1 text-sm text-neutral-400">{email}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="rounded-full border border-[#c9a84c] bg-[#c9a84c]/10 px-3 py-1 font-semibold text-[#c9a84c]">
              {planLabel}
            </span>
            {hasAccess && currentPeriodEnd && (
              <span className="text-neutral-400">
                {isCancelling ? 'Ends' : 'Renews'}{' '}
                {formatDate(currentPeriodEnd)}
              </span>
            )}
          </div>
        </header>

        {/* ── Edit profile ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            Edit profile
          </h2>

          <label className="flex flex-col gap-2 text-sm text-neutral-300">
            Full name
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-[#c9a84c] focus:outline-none"
            />
          </label>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={saveName}
              disabled={status === 'saving' || nothingChanged}
              className="rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#d4b85c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>

            {status === 'saved' && (
              <span className="text-sm text-[#c9a84c]">Saved ✓</span>
            )}
            {status === 'error' && (
              <span className="text-sm text-red-400">
                Couldn&apos;t save — try again
              </span>
            )}
          </div>
        </section>

        {/* ── Subscription ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            Subscription
          </h2>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-lg font-semibold text-white">{planLine}</p>
            <p className="mt-1 text-sm text-neutral-400">
              {isActive && currentPeriodEnd
                ? `Next renewal ${formatDate(currentPeriodEnd)}`
                : isCancelling && currentPeriodEnd
                  ? `Cancelling — access until ${formatDate(currentPeriodEnd)}`
                  : 'No active subscription'}
            </p>

            <div className="mt-5 flex flex-col gap-3">
              {processor === 'stripe' && (
                <a
                  href="/api/stripe/portal"
                  className="inline-block rounded-md bg-[#c9a84c] px-4 py-2 text-center text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
                >
                  Manage subscription
                </a>
              )}

              {processor === 'paystack' && (
                <a
                  href="/api/paystack/manage"
                  className="inline-block rounded-md bg-[#c9a84c] px-4 py-2 text-center text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
                >
                  Update payment method
                </a>
              )}

              {/* Paystack users cancel through our own button (no portal).
                  Only offer it while still active — once cancelling, show a
                  note instead. Stripe users cancel inside the portal. */}
              {processor === 'paystack' && isActive && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-block rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-red-500 hover:text-red-400"
                >
                  Cancel subscription
                </button>
              )}

              {processor === 'paystack' && isCancelling && (
                <p className="text-sm text-neutral-500">
                  Your subscription is set to cancel and won&apos;t renew.
                </p>
              )}

              {processor === null && (
                <a
                  href="/subscribe"
                  className="inline-block rounded-md bg-[#c9a84c] px-4 py-2 text-center text-sm font-semibold text-black transition hover:bg-[#d4b85c]"
                >
                  Upgrade
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Cancel confirmation modal ──────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-6">
            <h3 className="text-lg font-bold text-white">Cancel subscription?</h3>
            <p className="mt-3 text-sm text-neutral-300">
              Your access continues until{' '}
              <span className="text-[#c9a84c]">
                {currentPeriodEnd ? formatDate(currentPeriodEnd) : 'the period end'}
              </span>
              . Cancellation is permanent for the current billing cycle.
            </p>

            {cancelError && (
              <p className="mt-3 text-sm text-red-400">{cancelError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 rounded-md border border-neutral-700 px-4 py-2 text-sm text-white transition hover:border-neutral-500 disabled:opacity-40"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
