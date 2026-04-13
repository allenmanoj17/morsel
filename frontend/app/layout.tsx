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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#d4ff00" />
      </head>
      <body
        className={`${inter.className} antialiased bg-[#030409] text-white min-h-dvh`}
        suppressHydrationWarning
      >
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-dvh bg-[#030409]">
            <Loader2 className="animate-spin text-[#d4ff00]" size={32} />
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
