'use client'

import { useTransition } from 'react'
import { deleteEpisode } from './actions'

export default function DeleteEpisodeButton({
  dayNumber,
}: {
  dayNumber: number
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    // Deleting is irreversible (row + audio file), so always confirm first.
    const ok = window.confirm(
      `Delete Day ${dayNumber}? This removes the episode and its audio file. This cannot be undone.`,
    )
    if (!ok) return

    startTransition(async () => {
      const result = await deleteEpisode(dayNumber)
      if (result?.error) {
        window.alert(`Could not delete: ${result.error}`)
      }
      // On success the server revalidates the list, so the row disappears.
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-red-600 transition hover:text-red-800 disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
