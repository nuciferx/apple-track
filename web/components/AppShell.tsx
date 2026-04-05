'use client'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import FilterBar from '@/components/FilterBar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* FilterBar — mobile only */}
        <FilterBar />

        <main className="flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        {/* BottomNav — mobile only */}
        <BottomNav />
      </div>
    </div>
  )
}
