'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScrollText, BookOpen, BarChart2, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Today' },
  { href: '/log', icon: ScrollText, label: 'Log' },
  { href: '/templates', icon: BookOpen, label: 'Library' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Profile' },
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 bottom-0 w-64 hidden md:flex flex-col z-40"
      style={{ 
        borderRight: '1px solid var(--glass-border)', 
        background: 'var(--background)',
        height: '100dvh',
        boxSizing: 'border-box'
      }}
    >
      {/* Brand */}
      <div className="px-8 pt-10 pb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl bg-[#d4ff00] text-[#030409] shadow-[0_0_20px_rgba(212,255,0,0.2)]">
          M
        </div>
        <div>
          <div className="font-black text-2xl tracking-tighter text-white" style={{ lineHeight: 1 }}>Morsel</div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[#8a8a8a] mt-1">Morsel_App</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 flex-1 mt-4">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-4 px-5 py-4 rounded-[16px] transition-all duration-200"
              style={{
                background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: active ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
              }}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full"
                  style={{ background: '#d4ff00', boxShadow: '0 0 12px rgba(212,255,0,0.4)' }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 3 : 2}
                color={active ? '#d4ff00' : '#8a8a8a'}
                style={{ transition: 'all 0.2s ease' }}
              />
              <span
                className="text-[14px] font-black tracking-tight"
                style={{ color: active ? 'white' : '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Footer System Status */}
      <div className="px-8 py-8 border-t border-white/[0.05]">
        <div className="flex items-center gap-4">
          <div className="relative">
             <div className="w-10 h-10 rounded-full bg-[#d4ff00]/10 border border-[#d4ff00]/20 flex items-center justify-center font-black text-sm text-[#d4ff00]">
               U
             </div>
             <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#030409]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-white tracking-tight">My Profile</div>
            <div className="text-[10px] font-medium text-[#8a8a8a] mt-0.5">Manage Settings</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
