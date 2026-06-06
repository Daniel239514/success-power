import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { sendNewsletterForPost } from '@/lib/newsletter'

// Manually (re)send the newsletter email for a post. Admin-only.
//
// POST so it can't be triggered by accident from a link/prefetch. Used for an
// intentional re-send from the admin edit page. The publish-now flow and the
// scheduled-post cron call sendNewsletterForPost() directly, in-process.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const result = await sendNewsletterForPost(id)

  return NextResponse.json({ ok: true, ...result })
}
