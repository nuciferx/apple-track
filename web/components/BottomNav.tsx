'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',        label: 'วันนี้',   icon: '📱' },
  { href: '/week',    label: 'สัปดาห์',  icon: '📊' },
  { href: '/apps',    label: 'แอป',      icon: '🗂️' },
  { href: '/insight', label: 'Insight',  icon: '🧠' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#1a1a1a] border-t border-white/10 flex pb-safe z-30">
      {tabs.map(t => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors
            ${path === t.href ? 'text-indigo-400' : 'text-white/40'}`}
        >
          <span className="text-xl">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
