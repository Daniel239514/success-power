'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createEpisode } from '../actions'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXT = ['mp3', 'm4a']

type Status = 'idle' | 'uploading' | 'saving' | 'error'

export default function NewEpisodeForm({ initialDay }: { initialDay?: string }) {
  const [dayNumber, setDayNumber] = useState(initialDay ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [keyQuote, setKeyQuote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const busy = status === 'uploading' || status === 'saving'

  function fail(message: string) {
    setStatus('error')
    setError(message)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const day = Math.trunc(Number(dayNumber))
    if (!Number.isFinite(day) || day < 1 || day > 365) {
      return fail('Enter a day number between 1 and 365.')
    }
    if (!title.trim()) return fail('Title is required.')
    if (description.length > 200) {
      return fail('Description must be 200 characters or fewer.')
    }
    if (!file) return fail('Choose an audio file.')

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      return fail('Audio must be an .mp3 or .m4a file.')
    }
    if (file.size > MAX_BYTES) {
      return fail('Audio file must be 50MB or smaller.')
    }

    // --- 1) Upload to R2 via the server-side upload route ---
    setStatus('uploading')
    const body = new FormData()
    body.append('file', file)
    body.append('prefix', 'episodes')

    const uploadRes = await fetch('/api/admin/upload-audio', {
      method: 'POST',
      body,
    })
    const uploadJson = await uploadRes.json()
    if (!uploadRes.ok || uploadJson.error) {
      return fail(uploadJson.error ?? 'Upload failed.')
    }

    // --- 2) Save the episode row with the R2 key ---
    setStatus('saving')
    const result = await createEpisode({
      dayNumber: day,
      title,
      description,
      keyQuote,
      audioUrl: uploadJson.key,
    })

    if (result?.error) {
      return fail(result.error)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/episodes"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Back to episodes
      </Link>

      <h1 className="mt-2 text-2xl font-bold">New episode</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6"
      >
        {/* Day number */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Day number
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={dayNumber}
            onChange={(e) => setDayNumber(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="e.g. 47"
          />
        </div>

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
            placeholder="The Power of One Step"
          />
        </div>

        {/* Description with live counter */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <span
              className={`text-xs ${
                description.length >= 200 ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              {description.length}/200
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="A short summary shown under the title."
          />
        </div>

        {/* Key quote */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Key quote
          </label>
          <input
            type="text"
            value={keyQuote}
            onChange={(e) => setKeyQuote(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Momentum is built one move at a time."
          />
        </div>

        {/* Audio file */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Audio file (.mp3 or .m4a, max 50MB)
          </label>
          <input
            type="file"
            accept=".mp3,.m4a,audio/mpeg,audio/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
          {file && (
            <p className="mt-1 text-xs text-slate-500">
              {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>

        {status === 'uploading' && (
          <p className="text-sm text-slate-600">⏳ Uploading audio… please wait.</p>
        )}
        {status === 'saving' && (
          <p className="text-sm text-slate-600">💾 Saving episode…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'uploading'
            ? 'Uploading…'
            : status === 'saving'
              ? 'Saving…'
              : 'Upload episode'}
        </button>
      </form>
    </div>
  )
}
