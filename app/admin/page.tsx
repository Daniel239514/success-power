import { createAdminClient } from '@/lib/supabase/admin'

// The dashboard reads numbers about EVERY user, which normal RLS hides. So it
// uses the service-role client (bypasses RLS). That's safe here because this
// page already sits behind the admin layout's requireAdmin() gate.
//
// Always fetch fresh numbers — never serve a stale cached dashboard.
export const dynamic = 'force-dynamic'

// Plan pricing, in US dollars. Annual is billed once a year, so its monthly
// contribution to MRR (Monthly Recurring Revenue) is the yearly price / 12.
const MONTHLY_PRICE = 7
const ANNUAL_PRICE_PER_MONTH = 63 / 12 // $5.25

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  // Run all the count queries at once instead of waiting for each in turn.
  // `head: true` + `count: 'exact'` asks Postgres for ONLY the number of
  // matching rows (no row data), which is fast and cheap.
  const [
    totalRes,
    paidRes,
    monthlyRes,
    annualRes,
    episodesRes,
    signupsRes,
  ] = await Promise.all([
    // Total subscribers = everyone who has a profile.
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // Paid subscribers = profiles whose status is 'active'.
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active'),
    // Active monthly plans (for MRR).
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .eq('subscription_plan', 'monthly'),
    // Active annual plans (for MRR).
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .eq('subscription_plan', 'annual'),
    // Episodes published = episodes uploaded (rows that exist).
    supabase.from('episodes').select('*', { count: 'exact', head: true }),
    // Recent signups: pull users from the auth system (that's where email and
    // signup date live), newest first, and keep the latest 10.
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const totalSubscribers = totalRes.count ?? 0
  const paidSubscribers = paidRes.count ?? 0
  const monthlyCount = monthlyRes.count ?? 0
  const annualCount = annualRes.count ?? 0
  const episodesPublished = episodesRes.count ?? 0

  const mrr = monthlyCount * MONTHLY_PRICE + annualCount * ANNUAL_PRICE_PER_MONTH

  // auth.admin.listUsers doesn't guarantee an order, so sort newest-first
  // ourselves, then take 10.
  const recentSignups = (signupsRes.data?.users ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10)

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Four metric cards. They stack on phones and sit in a row on desktop. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total subscribers" value={totalSubscribers.toLocaleString()} />
        <MetricCard label="Paid subscribers" value={paidSubscribers.toLocaleString()} />
        <MetricCard
          label="MRR (monthly revenue)"
          value={`$${Math.round(mrr).toLocaleString()}`}
        />
        <MetricCard label="Episodes published" value={episodesPublished.toLocaleString()} />
      </div>

      {/* Recent signups table. */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Recent signups</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    No signups yet.
                  </td>
                </tr>
              ) : (
                recentSignups.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// A single metric card: a big number with a small label under it.
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}
