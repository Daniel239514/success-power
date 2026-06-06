import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PostForm from '../post-form'
import DeletePostButton from './delete-button'
import SendEmailButton from './send-email-button'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, slug, body_html, audio_url, status, publish_at')
    .eq('id', id)
    .single()

  if (!post) notFound()

  return (
    <div>
      <PostForm
        existing={{
          id: post.id,
          title: post.title ?? '',
          slug: post.slug ?? '',
          bodyHtml: post.body_html ?? '',
          audioUrl: post.audio_url,
          status: post.status,
          publishAt: post.publish_at,
        }}
      />

      {/* Manual re-send (e.g. you fixed a typo and want to email again). */}
      <div className="mt-6 max-w-2xl rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Newsletter email</p>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Publishing already emails subscribers once. Use this to re-send
          manually.
        </p>
        <SendEmailButton id={post.id} />
      </div>

      {/* Danger zone — delete lives apart from the form so it's not an accident. */}
      <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Danger zone</p>
        <p className="mt-1 text-xs text-red-600">
          Deleting removes the post and its audio file permanently. To just hide a
          live post, set it back to draft above instead.
        </p>
        <div className="mt-3">
          <DeletePostButton id={post.id} title={post.title ?? 'this post'} />
        </div>
      </div>
    </div>
  )
}
