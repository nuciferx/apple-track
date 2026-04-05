import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'Apple Track',
  description: 'Screen Time Analytics',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-[#0f0f0f] text-white pb-20">
        <main className="px-4 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
