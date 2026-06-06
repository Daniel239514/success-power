'use client'

import { useTransition } from 'react'
import { deletePost } from '../actions'

export default function DeletePostButton({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    // Deleting is irreversible (row + audio file), so always confirm first.
    const ok = window.confirm(
      `Delete "${title}"? This removes the post and its audio file. This cannot be undone.`,
    )
    if (!ok) return

    startTransition(async () => {
      const result = await deletePost(id)
      // On success the action redirects, so we only get here on error.
      if (result?.error) window.alert(`Could not delete: ${result.error}`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-600 transition hover:text-red-800 disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete post'}
    </button>
  )
}
