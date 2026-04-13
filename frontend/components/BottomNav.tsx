'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScrollText, BookOpen, BarChart2, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Today' },
  { href: '/log', icon: ScrollText, label: 'Feed' },
  { href: '/templates', icon: BookOpen, label: 'Templates' },
  { href: '/analytics', icon: BarChart2, label: 'Trends' },
  { href: '/settings', icon: Settings, label: 'Me' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        top: 'auto',
        left: 0,
        right: 0,
        background: 'var(--background)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--glass-border)',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center', padding: '12px 10px 0' }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              id={`nav-${label.toLowerCase()}`}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 4px', 
                minWidth: '56px', 
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  width: '32px', height: '3px', borderRadius: '0 0 6px 6px',
                  background: '#d4ff00',
                  boxShadow: '0 0 15px rgba(212, 255, 0, 0.6)'
                }} />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 3 : 2}
                color={active ? '#d4ff00' : '#8a8a8a'}
                style={{ transition: 'all 0.2s ease', opacity: active ? 1 : 0.7 }}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: 900,
                color: active ? 'white' : '#8a8a8a',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transition: 'all 0.2s ease'
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
