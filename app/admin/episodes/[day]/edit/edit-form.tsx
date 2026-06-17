'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateEpisode } from '../../actions'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXT = ['mp3', 'm4a']

type Status = 'idle' | 'uploading' | 'saving' | 'error'

export default function EditEpisodeForm({
  dayNumber,
  initialTitle,
  initialDescription,
  initialKeyQuote,
  initialAudioUrl,
}: {
  dayNumber: number
  initialTitle: string
  initialDescription: string
  initialKeyQuote: string
  initialAudioUrl: string
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [keyQuote, setKeyQuote] = useState(initialKeyQuote)
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

    if (!title.trim()) return fail('Title is required.')
    if (description.length > 200) {
      return fail('Description must be 200 characters or fewer.')
    }

    // Keep the existing key unless the admin picks a replacement file.
    let audioUrl = initialAudioUrl

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXT.includes(ext)) {
        return fail('Audio must be an .mp3 or .m4a file.')
      }
      if (file.size > MAX_BYTES) {
        return fail('Audio file must be 50MB or smaller.')
      }

      // Step 1: Get a presigned PUT URL (tiny JSON request, no file bytes)
      setStatus('uploading')

      let presignJson: { url?: string; key?: string; error?: string }
      try {
        const presignRes = await fetch('/api/admin/upload-audio/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, prefix: 'episodes' }),
        })
        presignJson = await presignRes.json()
        if (!presignRes.ok || presignJson.error) return fail(presignJson.error ?? 'Could not start upload.')
      } catch {
        return fail('Could not connect. Check your internet and try again.')
      }

      if (!presignJson.url || !presignJson.key) return fail('Upload service error — try again.')

      // Step 2: PUT file bytes directly to R2 — bypasses Vercel entirely (no timeout).
      // ArrayBuffer body avoids automatic Content-Type, keeping CORS preflight simple.
      try {
        const buffer = await file.arrayBuffer()
        const r2Res = await fetch(presignJson.url, { method: 'PUT', body: buffer })
        if (!r2Res.ok) {
          const body = await r2Res.text().catch(() => '')
          return fail(`R2 error ${r2Res.status}: ${body || r2Res.statusText}`)
        }
      } catch (err) {
        return fail(`Upload error: ${err instanceof Error ? err.message : String(err)}`)
      }

      audioUrl = presignJson.key
    }

    setStatus('saving')
    const result = await updateEpisode({
      dayNumber,
      title,
      description,
      keyQuote,
      audioUrl,
    })

    if (result?.error) return fail(result.error)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/episodes"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Back to episodes
      </Link>

      <h1 className="mt-2 text-2xl font-bold">Edit Day {dayNumber}</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Day number
          </label>
          <input
            type="number"
            value={dayNumber}
            disabled
            className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            The day number identifies this episode and can&apos;t be changed.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

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
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Key quote
          </label>
          <input
            type="text"
            value={keyQuote}
            onChange={(e) => setKeyQuote(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Replace audio (optional)
          </label>
          <input
            type="file"
            accept=".mp3,.m4a,audio/mpeg,audio/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
          {file ? (
            <p className="mt-1 text-xs text-slate-500">
              New file: {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Leave empty to keep the current audio.
            </p>
          )}
        </div>

        {status === 'uploading' && (
          <p className="text-sm text-slate-600">⏳ Uploading new audio…</p>
        )}
        {status === 'saving' && (
          <p className="text-sm text-slate-600">💾 Saving changes…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
