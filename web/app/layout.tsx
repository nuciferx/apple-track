import type { Metadata } from 'next'
import './globals.css'
import { FilterProvider } from '@/lib/filters'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import FilterBar from '@/components/FilterBar'

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
          {/* Desktop: sidebar + main */}
          <div className="hidden md:flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-8 py-8">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile: filter bar + content + bottom nav */}
          <div className="md:hidden min-h-screen flex flex-col">
            <FilterBar />
            <main className="flex-1 px-4 pt-4 pb-24">
              {children}
            </main>
            <BottomNav />
          </div>
        </FilterProvider>
      </body>
    </html>
  )
}
