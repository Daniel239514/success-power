import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  converted: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  credited:  'bg-green-900/50 text-green-300 border border-green-700',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default async function ReferralsPage() {
  const supabase = createAdminClient()

  const [{ data: referrals }, { data: usersData }] = await Promise.all([
    supabase
      .from('referrals')
      .select('id, referrer_id, referred_id, status, created_at, converted_at, credited_at')
      .order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const rows = referrals ?? []
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? '—']),
  )

  const totalReferrals  = rows.length
  const totalConverted  = rows.filter((r) => r.status === 'converted' || r.status === 'credited').length
  const totalCredited   = rows.filter((r) => r.status === 'credited').length

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-[#c9a84c]">Referrals</h1>

        {/* ── Summary ───────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Total referrals',    value: totalReferrals },
            { label: 'Conversions',        value: totalConverted },
            { label: 'Free months awarded', value: totalCredited },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-center"
            >
              <p className="text-3xl font-bold text-[#c9a84c]">{value}</p>
              <p className="mt-1 text-sm text-neutral-400">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Table ─────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <p className="text-neutral-500">No referrals yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Referred</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Converted</th>
                  <th className="px-4 py-3">Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3 text-neutral-200">
                      {emailById.get(r.referrer_id) ?? r.referrer_id.slice(0, 8) + '…'}
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {emailById.get(r.referred_id) ?? r.referred_id.slice(0, 8) + '…'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 text-neutral-400">{fmt(r.converted_at)}</td>
                    <td className="px-4 py-3 text-neutral-400">{fmt(r.credited_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
