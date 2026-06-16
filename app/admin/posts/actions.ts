'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/slug'
import { sendNewsletterForPost } from '@/lib/newsletter'
import { deleteAudioFromR2 } from '@/lib/r2'

export type PostInput = {
  title: string
  slug: string
  bodyHtml: string
  audioUrl: string | null
  status: 'draft' | 'scheduled' | 'published'
  // ISO string (UTC) when status === 'scheduled', otherwise null.
  publishAt: string | null
}

// Create a newsletter post.
//
// Three outcomes depending on status:
//   draft      -> just save it, hidden from everyone but admins.
//   scheduled  -> save it with publish_at; the cron (Step K) publishes it later.
//   published  -> save it live now, stamping published_at.
//
// NOTE: the email-to-subscribers send is wired up in Step E/G — not here yet.
export async function createPost(
  input: PostInput,
): Promise<{ error: string } | void> {
  const { user } = await requireAdmin()

  // --- Re-validate on the server (never trust the browser) ---
  const title = input.title.trim()
  if (!title) return { error: 'Title is required.' }

  // Fall back to deriving the slug from the title if the field came in empty.
  const slug = slugify(input.slug || title)
  if (!slug) return { error: 'Could not build a slug — add letters to the title.' }

  if (!['draft', 'scheduled', 'published'].includes(input.status)) {
    return { error: 'Invalid status.' }
  }

  // A scheduled post must have a future publish time.
  let publishAt: string | null = null
  let publishedAt: string | null = null

  if (input.status === 'scheduled') {
    if (!input.publishAt) return { error: 'Pick a date/time to schedule for.' }
    const when = new Date(input.publishAt)
    if (Number.isNaN(when.getTime())) return { error: 'Invalid schedule date.' }
    publishAt = when.toISOString()
  }

  if (input.status === 'published') {
    publishedAt = new Date().toISOString()
  }

  const supabase = createAdminClient()

  const { data: created, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      body_html: input.bodyHtml,
      audio_url: input.audioUrl,
      status: input.status,
      publish_at: publishAt,
      published_at: publishedAt,
      author_id: user.id,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique-violation: this slug is already taken.
    if (error.code === '23505') {
      return { error: `The slug "${slug}" is already used. Change it slightly.` }
    }
    return { error: error.message }
  }

  // Publishing now? Fire the newsletter email. (Draft/scheduled don't email —
  // a scheduled post emails later, via the cron, when it actually goes live.)
  if (input.status === 'published' && created) {
    await sendNewsletterForPost(created.id)
  }

  revalidatePath('/admin/posts')
  revalidatePath('/newsletter')
  revalidatePath('/')

  // redirect() must be OUTSIDE any try/catch — it works by throwing a signal.
  redirect('/admin/posts')
}

export type PostUpdate = PostInput & { id: string }

// Update an existing post. The same three statuses apply, with one important
// rule: we only send the newsletter email the FIRST time a post becomes
// published (published_at was empty). So editing a live post, or hiding it and
// re-showing it, never re-spams subscribers. (Intentional re-sends use the
// manual route from Step G.)
export async function updatePost(
  input: PostUpdate,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const title = input.title.trim()
  if (!title) return { error: 'Title is required.' }

  const slug = slugify(input.slug || title)
  if (!slug) return { error: 'Could not build a slug — add letters to the title.' }

  if (!['draft', 'scheduled', 'published'].includes(input.status)) {
    return { error: 'Invalid status.' }
  }

  const supabase = createAdminClient()

  // Read the current state so we can decide about published_at and the email.
  const { data: current } = await supabase
    .from('posts')
    .select('status, published_at')
    .eq('id', input.id)
    .single()

  if (!current) return { error: 'Post not found.' }

  let publishAt: string | null = null
  let publishedAt: string | null = current.published_at

  if (input.status === 'scheduled') {
    if (!input.publishAt) return { error: 'Pick a date/time to schedule for.' }
    const when = new Date(input.publishAt)
    if (Number.isNaN(when.getTime())) return { error: 'Invalid schedule date.' }
    publishAt = when.toISOString()
  }

  // First-ever publish? Stamp published_at now and remember to email.
  const firstPublish = input.status === 'published' && !current.published_at
  if (input.status === 'published') {
    publishedAt = current.published_at ?? new Date().toISOString()
  }

  const { error } = await supabase
    .from('posts')
    .update({
      title,
      slug,
      body_html: input.bodyHtml,
      audio_url: input.audioUrl,
      status: input.status,
      publish_at: publishAt,
      published_at: publishedAt,
    })
    .eq('id', input.id)

  if (error) {
    if (error.code === '23505') {
      return { error: `The slug "${slug}" is already used. Change it slightly.` }
    }
    return { error: error.message }
  }

  if (firstPublish) {
    await sendNewsletterForPost(input.id)
  }

  revalidatePath('/admin/posts')
  revalidatePath('/newsletter')
  revalidatePath(`/newsletter/${slug}`)
  revalidatePath('/')

  redirect('/admin/posts')
}

// Delete a post: removes the row AND its audio file.
// Handles both new R2 keys (e.g. "posts/uuid.mp3") and any old Supabase URLs.
export async function deletePost(
  id: string,
): Promise<{ error: string } | void> {
  await requireAdmin()

  const supabase = createAdminClient()

  const { data: post } = await supabase
    .from('posts')
    .select('audio_url')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return { error: error.message }

  if (post?.audio_url) {
    const audioUrl = post.audio_url
    if (audioUrl.startsWith('https://')) {
      const marker = '/audio/'
      const i = audioUrl.indexOf(marker)
      if (i !== -1) {
        const path = decodeURIComponent(audioUrl.slice(i + marker.length).split('?')[0])
        await supabase.storage.from('audio').remove([path])
      }
    } else {
      await deleteAudioFromR2(audioUrl)
    }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/newsletter')
  revalidatePath('/')
  redirect('/admin/posts')
}
