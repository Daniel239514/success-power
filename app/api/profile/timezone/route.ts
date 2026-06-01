import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidTimeZone } from '@/lib/timezone'

// The browser POSTs the visitor's IANA time zone here so we can store it on
// their profile. The cron (which has no cookie/session) reads it from there.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in -> nothing to save. Not an error; just a no-op.
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { timezone } = await request.json()
  if (typeof timezone !== 'string' || !isValidTimeZone(timezone)) {
    return NextResponse.json({ error: 'Invalid time zone.' }, { status: 400 })
  }

  // RLS "update own profile" policy ensures a user can only update their row.
  const { error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
