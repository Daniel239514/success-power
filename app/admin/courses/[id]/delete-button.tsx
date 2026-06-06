'use client'

import { useState } from 'react'
import { deleteCourse } from '../actions'

export default function DeleteCourseButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setBusy(true)
    const result = await deleteCourse(id)
    if (result?.error) {
      setError(result.error)
      setBusy(false)
    }
  }

  if (confirming) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-red-700">Are you sure?</span>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-slate-600 transition hover:text-slate-900"
        >
          Cancel
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
    >
      Delete course
    </button>
  )
}
