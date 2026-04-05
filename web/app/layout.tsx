import type { Metadata } from 'next'
import './globals.css'
import { FilterProvider } from '@/lib/filters'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Apple Track',
  description: 'Screen Time Analytics',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-[#0f0f0f] text-white">
        <FilterProvider>
          <AppShell>{children}</AppShell>
        </FilterProvider>
      </body>
    </html>
  )
}
