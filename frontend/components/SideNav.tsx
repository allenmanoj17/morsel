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

export default function SideNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 bottom-0 w-64 hidden md:flex flex-col border-r border-[#f0f0f0] bg-white z-40"
      style={{ borderRight: '1px solid #f0f0f0', background: 'white' }}
    >
      {/* Brand */}
      <div className="px-8 pt-10 pb-8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg bg-[#d4ff00] text-[#0a0e27]"
          style={{ background: '#d4ff00', color: '#0a0e27', borderRadius: '10px' }}>
          M
        </div>
        <div>
          <div className="font-black text-xl tracking-tighter text-[#0a0e27]" style={{ color: '#0a0e27', fontWeight: 900 }}>Morsel</div>
          <div className="text-[10px] uppercase tracking-widest font-black text-[#8a8a8a]" style={{ color: '#8a8a8a', fontSize: '10px' }}>Fuel Tracker</div>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-4 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-4 px-4 py-3.5 rounded-[10px] transition-all duration-150"
              style={{
                background: active ? '#fafafa' : 'transparent',
                color: active ? '#0a0e27' : '#8a8a8a',
                borderRadius: '10px',
              }}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full"
                  style={{ background: '#d4ff00', position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '28px', borderRadius: '0 4px 4px 0' }}
                />
              )}
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 2}
                style={{ color: active ? '#0a0e27' : '#8a8a8a' }}
              />
              <span
                className="text-[14px] font-bold tracking-tight"
                style={{ fontWeight: active ? 700 : 500, color: active ? '#0a0e27' : '#8a8a8a' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-[#f0f0f0]" style={{ borderTop: '1px solid #f0f0f0' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-[#d4ff00] flex items-center justify-center font-black text-xs text-[#0a0e27]"
            style={{ background: '#d4ff00', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#0a0e27' }}
          >
            U
          </div>
          <div>
            <div className="text-sm font-bold text-[#0a0e27]" style={{ color: '#0a0e27', fontSize: '13px', fontWeight: 700 }}>Profile</div>
            <div className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest" style={{ color: '#8a8a8a', fontSize: '10px' }}>Active</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
