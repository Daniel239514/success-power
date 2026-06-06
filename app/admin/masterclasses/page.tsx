import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/lib/format'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  upcoming: 'bg-amber-100 text-amber-700',
  live: 'bg-red-100 text-red-700',
  past: 'bg-slate-100 text-slate-600',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MasterclassesListPage() {
  const supabase = createAdminClient()

  const { data: masterclasses } = await supabase
    .from('masterclasses')
    .select(
      'id, title, status, event_date, members_price, general_price, currency, replay_published',
    )
    .order('event_date', { ascending: false })

  const list = masterclasses ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Masterclasses</h1>
        <Link
          href="/admin/masterclasses/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + New Masterclass
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Event date</th>
              <th className="px-4 py-3 font-medium">Pricing</th>
              <th className="px-4 py-3 font-medium">Replay</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No masterclasses yet. Click &ldquo;+ New Masterclass&rdquo; to
                  create your first one.
                </td>
              </tr>
            ) : (
              list.map((mc) => (
                <tr
                  key={mc.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{mc.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[mc.status] ?? STATUS_STYLES.past
                      }`}
                    >
                      {mc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(mc.event_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <span className="text-slate-400">M:</span>{' '}
                    {formatPrice(mc.members_price, mc.currency)}
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span className="text-slate-400">G:</span>{' '}
                    {formatPrice(mc.general_price, mc.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {mc.replay_published ? (
                      <span className="text-xs font-medium text-green-600">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/masterclasses/${mc.id}`}
                      className="text-slate-600 transition hover:text-slate-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
