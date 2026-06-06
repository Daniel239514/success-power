'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createMasterclass, updateMasterclass } from './actions'

type MasterclassStatus = 'upcoming' | 'live' | 'past'
type Currency = 'NGN' | 'USD'
type UIStatus = 'idle' | 'saving' | 'error'

export type ExistingMasterclass = {
  id: string
  title: string
  description: string
  eventDate: string // ISO
  durationMinutes: number
  membersPrice: number
  generalPrice: number
  currency: Currency
  checkoutUrl: string
  replayUrl: string | null
  replayPublished: boolean
  thumbnailUrl: string | null
  status: MasterclassStatus
}

// Convert a stored UTC ISO instant to the value a datetime-local input expects,
// in the browser's local timezone.
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MasterclassForm({
  existing,
}: {
  existing?: ExistingMasterclass
}) {
  const editing = Boolean(existing)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [eventDate, setEventDate] = useState(
    existing?.eventDate ? toLocalInput(existing.eventDate) : '',
  )
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 60)
  const [membersPrice, setMembersPrice] = useState(existing?.membersPrice ?? 0)
  const [generalPrice, setGeneralPrice] = useState(existing?.generalPrice ?? 0)
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'NGN')
  const [checkoutUrl, setCheckoutUrl] = useState(existing?.checkoutUrl ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(existing?.thumbnailUrl ?? '')
  const [status, setStatus] = useState<MasterclassStatus>(
    existing?.status ?? 'upcoming',
  )
  const [replayUrl, setReplayUrl] = useState(existing?.replayUrl ?? '')
  const [replayPublished, setReplayPublished] = useState(
    existing?.replayPublished ?? false,
  )

  const [uiStatus, setUiStatus] = useState<UIStatus>('idle')
  const [error, setError] = useState('')

  const busy = uiStatus === 'saving'

  function fail(message: string) {
    setUiStatus('error')
    setError(message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setUiStatus('saving')

    // datetime-local gives "YYYY-MM-DDTHH:mm" with no timezone info.
    // new Date() interprets it in the browser's local timezone, which is what
    // the admin means when they type a time, so .toISOString() gives us UTC.
    const eventDateIso = eventDate ? new Date(eventDate).toISOString() : ''

    const payload = {
      title,
      description,
      eventDate: eventDateIso,
      durationMinutes: Number(duration),
      membersPrice: Number(membersPrice),
      generalPrice: Number(generalPrice),
      currency,
      checkoutUrl,
      thumbnailUrl: thumbnailUrl.trim() || null,
      status,
      replayUrl: replayUrl.trim() || null,
      replayPublished,
    }

    const result = existing
      ? await updateMasterclass({ id: existing.id, ...payload })
      : await createMasterclass(payload)

    if (result?.error) return fail(result.error)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/masterclasses"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Back to masterclasses
      </Link>

      <h1 className="mt-2 text-2xl font-bold">
        {editing ? 'Edit masterclass' : 'New masterclass'}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6"
      >
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Success Masterclass: Building Wealth in 2025"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="What attendees will learn in this session…"
          />
        </div>

        {/* Event date + duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Event date &amp; time
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Currency toggle + prices */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Currency</span>
            <div className="flex overflow-hidden rounded-md border border-slate-300">
              {(['NGN', 'USD'] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-1.5 text-sm font-medium transition ${
                    currency === c
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c === 'NGN' ? '₦ NGN' : '$ USD'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Members price
              </label>
              <input
                type="number"
                value={membersPrice}
                onChange={(e) => setMembersPrice(Number(e.target.value))}
                min={0}
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Discounted price for active subscribers
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                General price
              </label>
              <input
                type="number"
                value={generalPrice}
                onChange={(e) => setGeneralPrice(Number(e.target.value))}
                min={0}
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                Full price for everyone else
              </p>
            </div>
          </div>
        </div>

        {/* Checkout URL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Checkout URL
          </label>
          <input
            type="url"
            value={checkoutUrl}
            onChange={(e) => setCheckoutUrl(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="https://paystack.com/pay/my-masterclass"
          />
          <p className="mt-1 text-xs text-slate-400">
            Paste your Paystack or Stripe payment link. Subscribers click
            &ldquo;Register Now&rdquo; and land directly on this payment page.
          </p>
        </div>

        {/* Thumbnail URL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Thumbnail URL{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="https://..."
          />
          <p className="mt-1 text-xs text-slate-400">
            Upload an image to Supabase Storage or any public host and paste the
            URL here.
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Status
          </label>
          <div className="flex gap-4">
            {(['upcoming', 'live', 'past'] as MasterclassStatus[]).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="status"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Replay section — only shown when editing an existing masterclass */}
        {editing && (
          <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Replay (add after the event)
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Replay URL{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="url"
                value={replayUrl}
                onChange={(e) => setReplayUrl(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={replayPublished}
                onChange={(e) => setReplayPublished(e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                Publish replay to subscribers (makes it visible on the
                Masterclass screen)
              </span>
            </label>
          </div>
        )}

        {uiStatus === 'saving' && (
          <p className="text-sm text-slate-600">Saving…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? 'Saving…'
            : editing
              ? 'Save changes'
              : 'Create masterclass'}
        </button>
      </form>
    </div>
  )
}
