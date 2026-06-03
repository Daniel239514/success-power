'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav({
  showSubscribe,
  profileInitials,
  profileAvatarUrl,
}: {
  showSubscribe: boolean
  // null when logged out -> no Profile tab.
  profileInitials: string | null
  profileAvatarUrl: string | null
}) {
  const pathname = usePathname()

  // The admin area has its own navigation, so hide the consumer bottom nav there.
  if (pathname.startsWith('/admin')) return null

  const tabs = [
    { href: '/', label: 'Home' },
    { href: '/episodes', label: 'Episodes' },
    // Free users get an extra tab to upgrade; subscribers never see it.
    ...(showSubscribe ? [{ href: '/subscribe', label: 'Subscribe' }] : []),
  ]

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const profileActive = isActive('/profile')

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-[#0a0a0a]">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex items-center justify-center py-4 text-sm font-medium transition ${
                  active ? 'text-[#c9a84c]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}

        {/* Profile tab: only when logged in, shown as the user's initials. */}
        {profileInitials && (
          <li key="/profile" className="flex-1">
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex items-center justify-center py-3"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border text-xs font-bold transition ${
                  profileActive
                    ? 'border-[#c9a84c] text-[#c9a84c]'
                    : 'border-neutral-600 text-neutral-400'
                }`}
              >
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileAvatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profileInitials
                )}
              </span>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
