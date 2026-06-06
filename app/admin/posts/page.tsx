import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Colour key for the status badge: draft=grey, scheduled=amber, published=green.
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
}

// Short, friendly date for the table. Returns '—' for missing dates.
function fmt(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function PostsListPage() {
  const supabase = createAdminClient()

  // All posts, newest first. The service-role client sees every status.
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, status, publish_at, published_at, audio_url, created_at')
    .order('created_at', { ascending: false })

  const list = posts ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + New post
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Audio</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No posts yet.
                </td>
              </tr>
            ) : (
              list.map((post) => {
                // Scheduled rows show when they WILL publish; published rows show
                // when they DID. Drafts have neither, so fall back to created_at.
                const dateLabel =
                  post.status === 'scheduled'
                    ? `→ ${fmt(post.publish_at)}`
                    : post.status === 'published'
                      ? fmt(post.published_at)
                      : fmt(post.created_at)

                return (
                  <tr
                    key={post.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{post.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_STYLES[post.status] ?? STATUS_STYLES.draft
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{dateLabel}</td>
                    <td className="px-4 py-3">
                      {post.audio_url ? (
                        <span className="text-slate-600">🔊</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="text-slate-600 transition hover:text-slate-900"
                        >
                          Edit
                        </Link>
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
