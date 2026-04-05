'use client'
import { useEffect, useState } from 'react'
import { api, DaySummary, AppSummary } from '@/lib/api'
import { formatDuration, formatDate, CHART_COLORS } from '@/lib/formatters'
import StatCard from '@/components/StatCard'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function WeekPage() {
  const [byDay, setByDay] = useState<DaySummary[]>([])
  const [byApp, setByApp] = useState<AppSummary[]>([])
  const [totalSecs, setTotalSecs] = useState(0)
  const [avgSecs, setAvgSecs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.week().then((d) => {
      setByDay(d.by_day)
      setByApp(d.by_app)
      setTotalSecs(d.total_secs)
      setAvgSecs(d.avg_secs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const barData = {
    labels: byDay.map(r => formatDate(r.date)),
    datasets: [{
      label: 'เวลาหน้าจอ (นาที)',
      data: byDay.map(r => Math.round(r.total_secs / 60)),
      backgroundColor: '#6366f1',
      borderRadius: 6,
    }],
  }

  if (loading) return <div className="text-white/40 text-center py-20">กำลังโหลด...</div>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">7 วันล่าสุด</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="รวมสัปดาห์" value={formatDuration(totalSecs)} />
        <StatCard label="เฉลี่ย/วัน" value={formatDuration(avgSecs)} />
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-4">
        <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">รายวัน (นาที)</p>
        <Bar
          data={barData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#ffffff66', font: { size: 10 } }, grid: { display: false } },
              y: { ticks: { color: '#ffffff66' }, grid: { color: '#ffffff11' } },
            },
          }}
        />
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-3">
        <p className="text-xs text-white/50 uppercase tracking-wider">Top แอปสัปดาห์นี้</p>
        {byApp.map((r, i) => (
          <div key={r.bundle_id} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block shrink-0"
                style={{ background: CHART_COLORS[i] }} />
              <span className="text-sm">{r.app_name}</span>
            </div>
            <span className="text-sm text-white/60">{formatDuration(r.total_secs)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
