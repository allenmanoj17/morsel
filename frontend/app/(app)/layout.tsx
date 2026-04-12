import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[#fafafa]">
      <SideNav />
      {/* md:pl-64 offsets fixed sidebar on desktop; pb-28 gives space for BottomNav on mobile */}
      <main className="flex-1 md:pl-64 pb-28 md:pb-8 bg-[#fafafa]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
