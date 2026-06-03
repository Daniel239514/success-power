import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Uploading needs Node APIs (admin client + file bytes), so force Node runtime.
export const runtime = 'nodejs'

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
// Allowed image types -> file extension.
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// The browser POSTs the picked image here as multipart form data. We upload it
// to Storage with the admin client (bypasses RLS — no storage policies needed)
// into a folder named after the logged-in user's id, then save the public URL
// on their profile. The path is derived from the SESSION user, never from the
// client, so a user can only ever write to their own folder.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Use a JPG, PNG or WebP image.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image must be 3MB or smaller.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  // Timestamp makes each upload a fresh URL -> no stale browser cache.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (upErr) {
    console.error('❌ Avatar upload failed:', upErr.message)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('avatars').getPublicUrl(path)

  const { error } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, avatarUrl: publicUrl })
}
