'use client'
import { useEffect, useState } from 'react'
import { api, AppSummary } from '@/lib/api'
import { formatDuration, CHART_COLORS } from '@/lib/formatters'
import { useFilter } from '@/lib/filters'
import StatCard from '@/components/StatCard'
import AppRow from '@/components/AppRow'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const DEVICE_LABEL: Record<string, string> = {
  all: 'ทุกอุปกรณ์', mac: 'Mac', iphone: 'iPhone', ipad: 'iPad',
}

export default function TodayPage() {
  const { device, period, from, to, dateLabel } = useFilter()
  const [apps, setApps] = useState<AppSummary[]>([])
  const [totalSecs, setTotalSecs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.today({ device, from, to }).then(d => {
      setApps(d.apps)
      setTotalSecs(d.total_secs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [device, from, to])

  const top10 = apps.slice(0, 10)
  const maxSecs = top10[0]?.total_secs ?? 1

  const chartData = {
    labels: top10.map(r => r.app_name),
    datasets: [{
      data: top10.map(r => Math.round(r.total_secs / 60)),
      backgroundColor: CHART_COLORS,
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
        <h1 className="text-xl font-bold">สรุปการใช้งาน</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {dateLabel} · {DEVICE_LABEL[device] ?? device}
        </p>
      </div>

      {!apps.length ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center text-white/30 text-sm">
          ไม่มีข้อมูลในช่วงนี้
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="เวลาหน้าจอ" value={formatDuration(totalSecs)} />
            <StatCard label="แอปที่ใช้" value={`${apps.length} แอป`} />
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-4">
            <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">Top 10 (นาที)</p>
            <Bar
              data={chartData}
              options={{
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#ffffff66' }, grid: { color: '#ffffff11' } },
                  y: { ticks: { color: '#ffffffcc', font: { size: 11 } }, grid: { display: false } },
                },
              }}
            />
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-1">
            <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">รายละเอียด</p>
            {apps.map((r, i) => (
              <AppRow
                key={r.bundle_id}
                rank={i + 1}
                appName={r.app_name}
                bundleId={r.bundle_id}
                totalSecs={r.total_secs}
                maxSecs={maxSecs}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
