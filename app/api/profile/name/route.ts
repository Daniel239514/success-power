import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The Profile screen POSTs the user's display name here. Mirrors the timezone
// route: gate on the session, validate, then update the user's own row (RLS
// guarantees they can only touch their own profile).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { fullName } = await request.json()
  if (typeof fullName !== 'string') {
    return NextResponse.json({ error: 'Invalid name.' }, { status: 400 })
  }

  // Trim, cap the length so nobody stores a novel, and store null (not "")
  // when empty so the header's "Add your name" fallback keeps working.
  const trimmed = fullName.trim().slice(0, 80)

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed || null })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
