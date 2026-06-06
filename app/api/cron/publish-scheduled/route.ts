import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewsletterForPost } from '@/lib/newsletter'

// Publishes scheduled posts whose time has come, then emails them.
//
// Same shape as the Slice 9 daily-episode cron: it runs with NO user session,
// authenticates with CRON_SECRET, and uses the admin client (bypasses RLS).
// The difference is what it does — instead of checking timezones to send a
// push, it finds due posts, flips them live, and triggers the newsletter email
// (reusing the exact same sendNewsletterForPost the publish-now button uses).
export async function GET(request: NextRequest) {
  // Only allow callers that know the secret (Vercel Cron / GitHub Actions send
  // it as "Authorization: Bearer <CRON_SECRET>").
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  // Scheduled posts whose publish_at has passed.
  const { data: due, error } = await supabase
    .from('posts')
    .select('id, slug')
    .eq('status', 'scheduled')
    .lte('publish_at', nowIso)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ published: 0 })
  }

  let published = 0
  for (const post of due) {
    // Flip to published. The extra .eq('status','scheduled') + .select() means
    // if two cron runs overlap, only the FIRST one updates a row (the second
    // sees 0 rows) — so we never publish or email the same post twice.
    const { data: updated, error: upErr } = await supabase
      .from('posts')
      .update({ status: 'published', published_at: nowIso })
      .eq('id', post.id)
      .eq('status', 'scheduled')
      .select('id')

    if (upErr) {
      console.error(`[publish-scheduled] failed to publish ${post.id}:`, upErr.message)
      continue
    }
    if (!updated || updated.length === 0) {
      continue // already published by another run — skip
    }

    published++
    await sendNewsletterForPost(post.id)
    revalidatePath(`/newsletter/${post.slug}`)
  }

  // Refresh the public list and the home "Latest from Sam" card.
  revalidatePath('/newsletter')
  revalidatePath('/')

  return NextResponse.json({ due: due.length, published })
}
