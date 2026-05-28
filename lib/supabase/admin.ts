import { createClient } from '@supabase/supabase-js'

// A server-only Supabase client that uses the SERVICE key and bypasses
// row-level security. Only ever import this from trusted server code
// (e.g. the Stripe webhook) — never from anything that reaches the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
