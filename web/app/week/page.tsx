'use client'
import { useEffect, useState } from 'react'
import { api, DaySummary, AppSummary } from '@/lib/api'
import { formatDuration, formatDate, CHART_COLORS } from '@/lib/formatters'
import { useFilter } from '@/lib/filters'
import StatCard from '@/components/StatCard'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function WeekPage() {
  const { device, from, to, dateLabel } = useFilter()
  const [byDay, setByDay] = useState<DaySummary[]>([])
  const [byApp, setByApp] = useState<AppSummary[]>([])
  const [totalSecs, setTotalSecs] = useState(0)
  const [avgSecs, setAvgSecs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.week({ device, from, to }).then(d => {
      setByDay(d.by_day)
      setByApp(d.by_app)
      setTotalSecs(d.total_secs)
      setAvgSecs(d.avg_secs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [device, from, to])

  const barData = {
    labels: byDay.map(r => formatDate(r.date)),
    datasets: [{
      label: 'นาที',
      data: byDay.map(r => Math.round(r.total_secs / 60)),
      backgroundColor: byDay.map(r =>
        r.total_secs > 28800 ? '#ef4444' :
        r.total_secs > 21600 ? '#f97316' :
        r.total_secs > 14400 ? '#eab308' : '#6366f1'
      ),
      borderRadius: 6,
    }],
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">เทรนด์การใช้งาน</h1>
        <p className="text-white/40 text-sm mt-0.5">{dateLabel}</p>
      </div>

      {!byDay.length ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center text-white/30 text-sm">
          ไม่มีข้อมูลในช่วงนี้
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="รวม" value={formatDuration(totalSecs)} />
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
                  x: { ticks: { color: '#ffffff66', font: { size: 9 } }, grid: { display: false } },
                  y: { ticks: { color: '#ffffff66' }, grid: { color: '#ffffff11' } },
                },
              }}
            />
            <div className="flex gap-3 mt-2 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> &lt;4ชม</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500 inline-block" /> 4–6ชม</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" /> 6–8ชม</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> &gt;8ชม</span>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-3">
            <p className="text-xs text-white/50 uppercase tracking-wider">Top แอป</p>
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
        </>
      )}
    </div>
  )
}
