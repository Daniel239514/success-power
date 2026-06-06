'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createCourse, updateCourse } from './actions'

type Currency = 'NGN' | 'USD'
type UIStatus = 'idle' | 'saving' | 'error'

export type ExistingCourse = {
  id: string
  title: string
  description: string
  price: number
  currency: Currency
  checkoutUrl: string
  thumbnailUrl: string | null
  isActive: boolean
}

export default function CourseForm({ existing }: { existing?: ExistingCourse }) {
  const editing = Boolean(existing)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [price, setPrice] = useState(existing?.price ?? 0)
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'NGN')
  const [checkoutUrl, setCheckoutUrl] = useState(existing?.checkoutUrl ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(existing?.thumbnailUrl ?? '')
  const [isActive, setIsActive] = useState(existing?.isActive ?? true)

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

    const payload = {
      title,
      description,
      price: Number(price),
      currency,
      checkoutUrl,
      thumbnailUrl: thumbnailUrl.trim() || null,
      isActive,
    }

    const result = existing
      ? await updateCourse({ id: existing.id, ...payload })
      : await createCourse(payload)

    if (result?.error) return fail(result.error)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/courses"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Back to courses
      </Link>

      <h1 className="mt-2 text-2xl font-bold">
        {editing ? 'Edit course' : 'New course'}
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
            placeholder="The Success Blueprint"
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
            placeholder="What students will get from this course…"
          />
        </div>

        {/* Currency + price */}
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Price
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
              step="0.01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
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
            placeholder="https://paystack.com/pay/my-course"
          />
          <p className="mt-1 text-xs text-slate-400">
            Paste your Paystack or Stripe payment link. Subscribers click
            &ldquo;Get Course&rdquo; and land directly on this payment page.
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
        </div>

        {/* Active toggle */}
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Active (visible to subscribers)
              </span>
              <span className="block text-xs text-slate-400">
                Untick to hide this course without deleting it. You can
                re-activate it at any time.
              </span>
            </span>
          </label>
        </div>

        {uiStatus === 'saving' && (
          <p className="text-sm text-slate-600">Saving…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create course'}
        </button>
      </form>
    </div>
  )
}
