'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScrollText, BookOpen, BarChart2, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Today' },
  { href: '/log', icon: ScrollText, label: 'Log' },
  { href: '/templates', icon: BookOpen, label: 'Templates' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #f0f0f0',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex',
      }}
    >
      <div
        className="flex w-full justify-around items-center px-2 pt-2"
        style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center', padding: '8px 8px 0' }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              id={`nav-${label.toLowerCase()}`}
              className="flex flex-col items-center gap-1 py-1 px-2 transition-all"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 8px', minWidth: '52px', position: 'relative' }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: '24px', height: '2px', borderRadius: '0 0 4px 4px',
                  background: '#d4ff00',
                }} />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ color: active ? '#0a0e27' : '#8a8a8a' }}
              />
              <span style={{
                fontSize: '9px',
                fontWeight: active ? 800 : 500,
                color: active ? '#0a0e27' : '#8a8a8a',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
