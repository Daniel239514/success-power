'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home' },
  { href: '/episodes', label: 'Episodes' },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

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
      </ul>
    </nav>
  )
}
