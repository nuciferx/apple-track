'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFilter, Device, Period } from '@/lib/filters'

const NAV = [
  { href: '/',        label: 'สรุปวัน',    icon: '📱' },
  { href: '/week',    label: 'เทรนด์',     icon: '📊' },
  { href: '/apps',    label: 'แอป',         icon: '🗂️' },
  { href: '/insight', label: 'Insight',     icon: '🧠' },
]

const DEVICES: { id: Device; label: string; icon: string }[] = [
  { id: 'all',     label: 'ทั้งหมด', icon: '🌐' },
  { id: 'mac',     label: 'Mac',     icon: '💻' },
  { id: 'iphone',  label: 'iPhone',  icon: '📱' },
  { id: 'ipad',    label: 'iPad',    icon: '🟦' },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day',   label: 'วัน' },
  { id: 'month', label: 'เดือน' },
  { id: 'year',  label: 'ปี' },
]

export default function Sidebar() {
  const path = usePathname()
  const { device, period, dateLabel, setDevice, setPeriod, navigate } = useFilter()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#111111] border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-xl">⏱️</span> Apple Track
        </h1>
        <p className="text-[11px] text-white/30 mt-0.5">Screen Time Analytics</p>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-4 space-y-0.5">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              path === n.href
                ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base w-5 text-center">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 mt-5 mb-4 border-t border-white/5" />

      {/* Device */}
      <div className="px-4 space-y-2">
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-1">อุปกรณ์</p>
        <div className="grid grid-cols-2 gap-1">
          {DEVICES.map(d => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                device === d.id
                  ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mt-4 mb-4 border-t border-white/5" />

      {/* Period selector */}
      <div className="px-4 space-y-2">
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-1">ช่วงเวลา</p>
        <div className="flex bg-white/5 rounded-xl p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-2">
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors text-sm"
          >
            ◀
          </button>
          <span className="text-xs text-white/80 font-medium text-center px-1 flex-1">
            {dateLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors text-sm"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <p className="text-[10px] text-white/20">ข้อมูลจาก Mac · Biome</p>
      </div>
    </aside>
  )
}
