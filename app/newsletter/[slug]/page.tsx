import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizePostHtml } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

function fmtDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function NewsletterPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login required, no paywall.
  if (!user) redirect('/login')

  // RLS only returns it if it's published, so this also hides drafts/scheduled.
  const { data: post } = await supabase
    .from('posts')
    .select('title, body_html, published_at, audio_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  // Sanitise the stored HTML before rendering it (see lib/sanitize.ts).
  const safeHtml = sanitizePostHtml(post.body_html)

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[#0a0a0a] px-6 pb-24 pt-12">
      <Link
        href="/newsletter"
        className="text-sm text-neutral-400 transition hover:text-[#c9a84c]"
      >
        ← Newsletter
      </Link>

      <article className="mt-6">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          {fmtDate(post.published_at)}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
          {post.title}
        </h1>

        {post.audio_url && (
          <audio
            controls
            preload="none"
            src={post.audio_url}
            className="mt-6 w-full"
          >
            Your browser does not support audio playback.
          </audio>
        )}

        {/* Sanitised admin-authored HTML. The .rich-text class styles headings,
            lists and links to match the editor. */}
        <div
          className="rich-text mt-6 text-neutral-200"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </article>
    </main>
  )
}
