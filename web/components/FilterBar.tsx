'use client'
import { useFilter, Device, Period } from '@/lib/filters'

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

export default function FilterBar() {
  const { device, period, dateLabel, setDevice, setPeriod, navigate } = useFilter()

  return (
    <div className="md:hidden sticky top-0 z-20 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-white/5 px-3 py-2 space-y-2">
      {/* Device row */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {DEVICES.map(d => (
          <button
            key={d.id}
            onClick={() => setDevice(d.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
              device === d.id
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            <span className="text-sm">{d.icon}</span>
            <span>{d.label}</span>
          </button>
        ))}
      </div>

      {/* Period + date nav row */}
      <div className="flex items-center gap-2">
        <div className="flex bg-white/5 rounded-lg p-0.5 shrink-0">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                period === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white/5 rounded-lg flex-1">
          <button
            onClick={() => navigate(-1)}
            className="px-2.5 py-1.5 text-white/50 hover:text-white text-sm"
          >
            ◀
          </button>
          <span className="flex-1 text-center text-[11px] text-white/70 font-medium">
            {dateLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            className="px-2.5 py-1.5 text-white/50 hover:text-white text-sm"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}
