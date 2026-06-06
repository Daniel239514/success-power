import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { previewText } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

function fmtDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function NewsletterPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login required, but NO paywall — free and paid users alike can read.
  if (!user) redirect('/login')

  // RLS lets any logged-in user read published posts (drafts/scheduled stay
  // hidden). Newest published first.
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, body_html, published_at, audio_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const list = posts ?? []

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0a0a0a] px-6 pb-24 pt-12">
      <Link
        href="/"
        className="text-sm text-neutral-400 transition hover:text-[#c9a84c]"
      >
        ← Home
      </Link>

      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#c9a84c]">
        Newsletter
      </h1>
      <p className="mt-2 text-sm text-neutral-400">Latest from Sam.</p>

      {list.length === 0 ? (
        <p className="mt-12 text-neutral-500">No posts yet — check back soon.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {list.map((post) => (
            <li key={post.id}>
              <Link
                href={`/newsletter/${post.slug}`}
                className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-[#c9a84c]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-widest text-neutral-500">
                    {fmtDate(post.published_at)}
                  </span>
                  {post.audio_url && (
                    <span className="text-sm text-[#c9a84c]" title="Has audio">
                      🔊
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">{post.title}</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {previewText(post.body_html, 150)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
