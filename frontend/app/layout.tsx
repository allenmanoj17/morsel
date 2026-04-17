import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Morsel',
  description: 'AI-Powered Nutrition Tracking',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#d4ff00',
}

function RootLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased bg-[#030409] text-white min-h-dvh" suppressHydrationWarning>
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-dvh bg-[#030409]">
              <Loader2 className="animate-spin text-[#d4ff00]" size={32} />
            </div>
          }>
            {children}
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
}

export default RootLayoutInner
