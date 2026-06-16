'use client'

import { useState } from 'react'
import Link from 'next/link'
import { slugify } from '@/lib/slug'
import { createPost, updatePost } from './actions'
import RichTextEditor from './rich-text-editor'

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXT = ['mp3', 'm4a']

type PublishChoice = 'draft' | 'scheduled' | 'published'
type Status = 'idle' | 'uploading' | 'saving' | 'error'

// When editing, the page passes the existing post in. When creating, it's
// undefined and every field starts blank.
export type ExistingPost = {
  id: string
  title: string
  slug: string
  bodyHtml: string
  audioUrl: string | null
  status: PublishChoice
  publishAt: string | null // ISO (UTC)
}

// Turn a stored ISO instant into the "YYYY-MM-DDTHH:mm" string a
// datetime-local input expects, in the browser's local time.
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export default function PostForm({ existing }: { existing?: ExistingPost }) {
  const editing = Boolean(existing)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [slug, setSlug] = useState(existing?.slug ?? '')
  // When editing, don't auto-overwrite the existing slug from the title.
  const [slugEdited, setSlugEdited] = useState(editing)

  const [choice, setChoice] = useState<PublishChoice>(existing?.status ?? 'draft')
  const [publishAt, setPublishAt] = useState(
    existing?.publishAt ? toLocalInput(existing.publishAt) : '',
  )

  const [file, setFile] = useState<File | null>(null)
  const [body, setBody] = useState(existing?.bodyHtml ?? '')

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const busy = status === 'uploading' || status === 'saving'

  function fail(message: string) {
    setStatus('error')
    setError(message)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim()) return fail('Title is required.')
    if (choice === 'scheduled' && !publishAt) {
      return fail('Pick a date and time to schedule for.')
    }

    // Start from the existing audio; only changes if a new file is chosen.
    let audioUrl: string | null = existing?.audioUrl ?? null

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXT.includes(ext)) {
        return fail('Audio must be an .mp3 or .m4a file.')
      }
      if (file.size > MAX_BYTES) {
        return fail('Audio file must be 50MB or smaller.')
      }

      setStatus('uploading')
      const body = new FormData()
      body.append('file', file)
      body.append('prefix', 'posts')

      const uploadRes = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        body,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok || uploadJson.error) {
        return fail(uploadJson.error ?? 'Upload failed.')
      }

      audioUrl = uploadJson.key
    }

    // datetime-local has no timezone. Convert to a UTC ISO instant using the
    // browser's own timezone, so the server stores the right moment.
    const publishAtIso =
      choice === 'scheduled' ? new Date(publishAt).toISOString() : null

    setStatus('saving')

    const payload = {
      title,
      slug,
      bodyHtml: body,
      audioUrl,
      status: choice,
      publishAt: publishAtIso,
    }

    const result = existing
      ? await updatePost({ id: existing.id, ...payload })
      : await createPost(payload)

    // Success redirects on the server, so reaching here means an error.
    if (result?.error) return fail(result.error)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/posts"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Back to posts
      </Link>

      <h1 className="mt-2 text-2xl font-bold">{editing ? 'Edit post' : 'New post'}</h1>

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
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="This week from Sam"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Slug <span className="font-normal text-slate-400">(the URL)</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true)
              setSlug(e.target.value)
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-slate-500 focus:outline-none"
            placeholder="this-week-from-sam"
          />
          <p className="mt-1 text-xs text-slate-400">
            /newsletter/{slug || 'your-slug-here'}
          </p>
        </div>

        {/* Publish choice */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            When to publish
          </label>
          <div className="space-y-2">
            {(
              [
                ['draft', 'Save as draft (hidden)'],
                ['scheduled', 'Schedule for later'],
                ['published', 'Publish now'],
              ] as [PublishChoice, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="publish"
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Date picker only when scheduling */}
          {choice === 'scheduled' && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Publish date &amp; time
              </label>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Optional audio */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Audio attachment{' '}
            <span className="font-normal text-slate-400">
              (optional, .mp3/.m4a, max 50MB)
            </span>
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
          ) : existing?.audioUrl ? (
            <p className="mt-1 text-xs text-slate-400">
              Current audio attached. Leave empty to keep it.
            </p>
          ) : null}
        </div>

        {/* Body — TipTap rich-text editor; outputs HTML into `body` */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Body
          </label>
          <RichTextEditor value={body} onChange={setBody} />
        </div>

        {/* Status / error */}
        {status === 'uploading' && (
          <p className="text-sm text-slate-600">⏳ Uploading audio… please wait.</p>
        )}
        {status === 'saving' && (
          <p className="text-sm text-slate-600">💾 Saving post…</p>
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
              : editing
                ? 'Save changes'
                : choice === 'published'
                  ? 'Publish post'
                  : choice === 'scheduled'
                    ? 'Schedule post'
                    : 'Save draft'}
        </button>
      </form>
    </div>
  )
}
