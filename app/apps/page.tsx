'use client'
import { useEffect, useState } from 'react'
import { api, AppSummary } from '@/lib/api'
import { formatDuration, CHART_COLORS } from '@/lib/formatters'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function AppsPage() {
  const [apps, setApps] = useState<AppSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.apps().then((d) => {
      setApps(d.apps.slice(0, 20))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const top7 = apps.slice(0, 7)
  const donutData = {
    labels: top7.map(r => r.app_name),
    datasets: [{
      data: top7.map(r => r.total_secs),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
    }],
  }

  if (loading) return <div className="text-white/40 text-center py-20">กำลังโหลด...</div>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">แอปทั้งหมด</h1>
      <p className="text-white/40 text-sm -mt-3">30 วันล่าสุด</p>

      <div className="bg-[#1a1a1a] rounded-2xl p-4 flex justify-center">
        <div className="w-56 h-56">
          <Doughnut
            data={donutData}
            options={{
              cutout: '65%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${formatDuration(ctx.parsed)}`,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-3">
        {apps.map((r, i) => (
          <div key={r.bundle_id} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: i < 7 ? CHART_COLORS[i] : '#ffffff33' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-sm font-medium truncate">{r.app_name}</span>
                <span className="text-sm text-white/60 ml-2 shrink-0">{formatDuration(r.total_secs)}</span>
              </div>
              <p className="text-xs text-white/30">{r.sessions} sessions</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
