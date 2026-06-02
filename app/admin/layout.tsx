import { requireAdmin } from '@/lib/admin'
import { logout } from '@/app/logout/actions'
import AdminNav from './admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // THE GATE. This runs on the server before anything below renders. A
  // non-admin never gets here — requireAdmin() redirects them away first.
  // We grab the admin's email to show it in the top bar.
  const { user } = await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 md:flex-row">
      {/* Sidebar (dark, so the admin area feels clearly different from the
          black-and-gold consumer app). On phones it sits on top as a
          horizontal, scrollable strip; on desktop it's a left column. */}
      <aside className="bg-slate-900 px-4 py-4 md:w-60 md:shrink-0 md:py-6">
        <div className="mb-4 px-2 text-lg font-bold text-[#c9a84c] md:mb-6">
          Success Power
          <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Admin
          </span>
        </div>
        <AdminNav />
      </aside>

      {/* Right side: a thin top bar, then the page content. */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">Admin dashboard</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <a
              href="/"
              className="text-slate-600 transition hover:text-slate-900"
            >
              View site ↗
            </a>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
