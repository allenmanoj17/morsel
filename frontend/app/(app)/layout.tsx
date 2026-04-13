import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#030409] text-white selection:bg-[#d4ff00] selection:text-[#030409]">
      {/* Sidebar - Desktop Only */}
      <SideNav />

      {/* Main Content Area */}
      <main 
        className="relative transition-all duration-300 md:ml-64 pb-32 md:pb-12"
        style={{ minHeight: '100dvh' }}
      >
        <div className="w-full h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
