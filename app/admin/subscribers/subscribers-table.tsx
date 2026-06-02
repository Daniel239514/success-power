'use client'

import { useMemo, useState } from 'react'

export type SubscriberRow = {
  id: string
  email: string
  signupDate: string // ISO date string
  plan: string | null
  status: string | null
}

type Filter = 'all' | 'active' | 'free'
const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Wrap a value so it's safe inside a CSV cell: if it contains a comma, quote,
// or newline, wrap it in quotes and double any quotes inside.
function csvCell(value: string) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)

  // Apply the status filter and the email search. Recomputed only when the
  // inputs change.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const isActive = r.status === 'active'
      if (filter === 'active' && !isActive) return false
      if (filter === 'free' && isActive) return false
      if (q && !r.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  // Build a CSV from the CURRENTLY FILTERED list (not just this page) and
  // trigger a download — entirely in the browser, no server round-trip.
  function exportCsv() {
    const header = ['Email', 'Signup date', 'Plan', 'Status']
    const lines = [
      header,
      ...filtered.map((r) => [
        r.email,
        formatDate(r.signupDate),
        r.plan ?? '',
        r.status ?? 'free',
      ]),
    ]
    const csv = lines.map((cols) => cols.map(csvCell).join(',')).join('\n')

    // A Blob is an in-memory file. We make a temporary URL pointing at it,
    // click an invisible link to download it, then clean the URL up.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function changeFilter(next: Filter) {
    setFilter(next)
    setPage(0)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <button
          onClick={exportCsv}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      {/* Search + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          placeholder="Search by email…"
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'free'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No subscribers match.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(r.signupDate)}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.plan ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.status === 'active' ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Free
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Page {safePage + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
