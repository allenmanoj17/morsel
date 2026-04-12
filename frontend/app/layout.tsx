import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#d4ff00',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Morsel — Stay on top of it ✨',
  description: 'Modern nutrition tracking for everyone.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Morsel',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'Morsel',
    description: 'Modern nutrition tracking for everyone.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.className} antialiased`}
        style={{ background: '#fafafa', color: '#0a0e27', minHeight: '100dvh' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
