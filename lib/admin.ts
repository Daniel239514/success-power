import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// The single, reusable admin gate for PAGES.
//
// Every admin page goes through this. It runs ON THE SERVER, so a user can't
// fake their way past it from the browser. It answers two questions:
//   1. Are you logged in?            no  -> send to /login
//   2. Is your profile role 'admin'? no  -> send to / (the normal app)
//
// If both pass, it hands back the logged-in `user` and a ready-to-use Supabase
// client so the page doesn't have to fetch them again.
export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return { user, supabase }
}

// Non-redirecting version for API routes. Returns the logged-in user if they're
// an admin, otherwise null — so the route can answer with a 403 instead of a
// redirect (a redirect is wrong for a fetch/API call).
export async function getAdminUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null

  return user
}
