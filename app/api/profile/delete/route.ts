import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GDPR "right to erasure". Permanently deletes the logged-in user's data and
// their auth identity. Deleting an auth.users row needs the service-role key,
// so we use the admin client (server-only, never reaches the browser).
//
// NOTE for going live: if the user has an ACTIVE paid subscription you'd also
// cancel it at Stripe/Paystack here first, so a deleted account isn't still
// billed. Both processors are in test mode for now, so we skip that — but it's
// the obvious production follow-up.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. App data. push_subscriptions also cascades on the auth delete below,
  //    but we remove it explicitly so the order never matters.
  await admin.from('push_subscriptions').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // 2. The identity itself. This is the irreversible part.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('❌ Account deletion failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. Clear this browser's session cookies so they're fully signed out.
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
