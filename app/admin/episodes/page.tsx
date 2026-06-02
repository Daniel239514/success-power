import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import DeleteEpisodeButton from './delete-button'

export const dynamic = 'force-dynamic'

export default async function EpisodesListPage() {
  const supabase = createAdminClient()

  // All episodes, lowest day first.
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, day_number, title, audio_url')
    .order('day_number', { ascending: true })

  const list = episodes ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Episodes</h1>
        <Link
          href="/admin/episodes/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + New episode
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Day</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Audio</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No episodes yet.
                </td>
              </tr>
            ) : (
              list.map((ep) => {
                const hasAudio = Boolean(ep.audio_url)
                return (
                  <tr
                    key={ep.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{ep.day_number}</td>
                    <td className="px-4 py-3">{ep.title}</td>
                    <td className="px-4 py-3">
                      {hasAudio ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          No audio
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasAudio ? (
                        <a
                          href={ep.audio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-600 underline transition hover:text-slate-900"
                        >
                          Play
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/episodes/${ep.day_number}/edit`}
                          className="text-slate-600 transition hover:text-slate-900"
                        >
                          Edit
                        </Link>
                        <DeleteEpisodeButton dayNumber={ep.day_number} />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
