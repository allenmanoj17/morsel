'use client'

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Note: viewport and metadata must be exported from a server component or a separate file in some Next.js versions,
// but for this specific structure we can keep them here if the USER's setup allows.
// Given previous edits, we keep them here.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#d4ff00" />
      </head>
      <body
        className={`${inter.className} antialiased`}
        style={{ background: '#0a0e27', color: 'white', minHeight: '100dvh', margin: 0 }}
        suppressHydrationWarning
      >
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0a0e27' }}>
            <Loader2 className="animate-spin" color="#d4ff00" size={32} />
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
