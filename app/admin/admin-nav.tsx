'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The list of admin sections. Add a page here and it appears in the sidebar.
const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/episodes', label: 'Episodes' },
  { href: '/admin/posts', label: 'Newsletter' },
  { href: '/admin/masterclasses', label: 'Masterclasses' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/referrals', label: 'Referrals' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/broadcasts', label: 'Broadcasts' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminNav() {
  const pathname = usePathname()

  // '/admin' should only light up on the exact dashboard, not on every
  // sub-page (which all start with '/admin'). Deeper links match themselves
  // and anything nested under them.
  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map((link) => {
        const active = isActive(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
