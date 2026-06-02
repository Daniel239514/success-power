import { createAdminClient } from '@/lib/supabase/admin'
import SubscribersTable, { type SubscriberRow } from './subscribers-table'

export const dynamic = 'force-dynamic'

export default async function SubscribersPage() {
  const supabase = createAdminClient()

  // Two sources, fetched together:
  //  - profiles: plan + status (keyed by user id)
  //  - auth users: email + signup date (email lives in the auth system, not
  //    in profiles, so we read it here and stitch the two together by id)
  const [profilesRes, usersRes] = await Promise.all([
    supabase.from('profiles').select('id, subscription_plan, subscription_status'),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  )

  const rows: SubscriberRow[] = (usersRes.data?.users ?? []).map((u) => {
    const profile = profileById.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '—',
      signupDate: u.created_at,
      plan: profile?.subscription_plan ?? null,
      status: profile?.subscription_status ?? null,
    }
  })

  // Newest signups first.
  rows.sort(
    (a, b) =>
      new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime(),
  )

  return <SubscribersTable rows={rows} />
}
