'use client'
import { useEffect, useState } from 'react'
import { api, InsightResponse } from '@/lib/api'
import { formatDuration, formatDate, CHART_COLORS } from '@/lib/formatters'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const GRADE_CONFIG: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  A: { bg: 'from-emerald-900/60 to-emerald-800/30', border: 'border-emerald-500', text: 'text-emerald-400', emoji: '🌿' },
  B: { bg: 'from-blue-900/60 to-blue-800/30', border: 'border-blue-500', text: 'text-blue-400', emoji: '👍' },
  C: { bg: 'from-amber-900/60 to-amber-800/30', border: 'border-amber-500', text: 'text-amber-400', emoji: '⚠️' },
  D: { bg: 'from-orange-900/60 to-orange-800/30', border: 'border-orange-500', text: 'text-orange-400', emoji: '🔥' },
  F: { bg: 'from-red-900/60 to-red-800/30', border: 'border-red-500', text: 'text-red-400', emoji: '💀' },
}

const CARPLAY_ICON: Record<string, string> = {
  'com.apple.Maps': '🗺️',
  'com.google.Maps': '📍',
  'com.waze.iphone': '🚗',
  'com.spotify.client': '🎵',
  'com.apple.Music': '🎵',
  'com.y.music': '🎵',
  'com.apple.podcasts': '🎙️',
  'com.apple.mobilephone': '📞',
  'com.apple.MobilePhone': '📞',
}

function HeatmapCell({ secs, hour, max }: { secs: number; hour: number; max: number }) {
  const intensity = max > 0 ? secs / max : 0
  const opacity = Math.round(intensity * 100)
  const isActive = hour >= 22 || hour <= 5

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-full aspect-square rounded-sm transition-all ${
          isActive ? 'bg-purple-500' : 'bg-indigo-500'
        }`}
        style={{ opacity: Math.max(0.06, intensity) }}
        title={`${hour}:00 — ${formatDuration(secs)}`}
      />
      {hour % 6 === 0 && (
        <span className="text-[8px] text-white/30">{hour}</span>
      )}
    </div>
  )
}

export default function InsightPage() {
  const [data, setData] = useState<InsightResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.insight().then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-white/40 text-sm">วิเคราะห์ข้อมูล...</p>
    </div>
  )

  if (!data) return (
    <div className="text-white/40 text-center py-20">โหลดไม่ได้</div>
  )

  const cfg = GRADE_CONFIG[data.grade] ?? GRADE_CONFIG['F']
  const maxHourly = Math.max(...data.hourly, 1)

  const peakHourStr = `${data.peak_hour.toString().padStart(2, '0')}:00`
  const deltaAbs = Math.abs(data.delta_secs)
  const deltaSign = data.delta_secs > 0 ? '+' : '-'
  const deltaColor = data.delta_secs > 0 ? 'text-red-400' : 'text-emerald-400'

  const catData = {
    labels: data.categories.slice(0, 7).map(c => c.name),
    datasets: [{
      data: data.categories.slice(0, 7).map(c => c.total_secs),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
    }],
  }

  const trendData = {
    labels: data.by_day.map(d => formatDate(d.date)),
    datasets: [{
      label: 'นาที',
      data: data.by_day.map(d => Math.round(d.total_secs / 60)),
      backgroundColor: data.by_day.map(d =>
        d.total_secs > 28800 ? '#ef4444' :
        d.total_secs > 21600 ? '#f97316' :
        d.total_secs > 14400 ? '#eab308' : '#6366f1'
      ),
      borderRadius: 6,
    }],
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">วิเคราะห์พฤติกรรม</h1>

      {/* ── Score Hero ── */}
      <div className={`bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-3xl p-5`}>
        <div className="flex items-center gap-4">
          <div className={`relative w-[72px] h-[72px] rounded-full border-4 ${cfg.border} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-3xl font-black ${cfg.text}`}>{data.grade}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wider">Screen Time Score</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black ${cfg.text}`}>{data.score}</span>
              <span className="text-white/40 text-sm">/ 100</span>
            </div>
            <p className="text-sm text-white/80 mt-0.5 leading-snug">{data.verdict}</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              data.grade === 'A' ? 'bg-emerald-400' :
              data.grade === 'B' ? 'bg-blue-400' :
              data.grade === 'C' ? 'bg-amber-400' :
              data.grade === 'D' ? 'bg-orange-400' : 'bg-red-400'
            }`}
            style={{ width: `${data.score}%` }}
          />
        </div>

        {/* Badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            data.is_bad
              ? 'bg-red-950/60 border-red-700 text-red-300'
              : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
          }`}>
            {data.is_bad ? '💀 กัดหัว!' : '✅ ผ่านแล้ว'}
          </span>
          <span className="text-xs text-white/40">
            เฉลี่ย 7 วัน: {formatDuration(data.avg_secs)}/วัน
          </span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1a1a1a] rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">วันนี้</p>
          <p className="text-xl font-bold">{formatDuration(data.today_secs)}</p>
          <p className={`text-[11px] font-medium ${deltaColor}`}>
            {deltaSign}{formatDuration(deltaAbs)} vs avg
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Peak ชั่วโมง</p>
          <p className="text-xl font-bold">{peakHourStr}</p>
          <p className="text-[11px] text-white/40">ใช้เยอะสุด</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">ดีที่สุด</p>
          <p className="text-xl font-bold">{data.best_day ? formatDuration(data.best_day.total_secs) : '-'}</p>
          <p className="text-[11px] text-white/40">
            {data.best_day ? formatDate(data.best_day.date) : ''}
          </p>
        </div>
      </div>

      {/* ── Hourly Heatmap ── */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/50 uppercase tracking-wider">การใช้รายชั่วโมง</p>
          <span className="text-xs text-white/30">0 → 23</span>
        </div>
        <div className="grid grid-cols-24 gap-[3px]" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
          {data.hourly.map((secs, h) => (
            <HeatmapCell key={h} secs={secs} hour={h} max={maxHourly} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/25">
          <span>กลางคืน</span>
          <span>เช้า</span>
          <span>บ่าย</span>
          <span>เย็น</span>
          <span>ดึก</span>
        </div>
      </div>

      {/* ── 7-day Trend ── */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4">
        <p className="text-xs text-white/50 uppercase tracking-wider mb-3">เทรนด์ 7 วัน (นาที)</p>
        <Bar
          data={trendData}
          options={{
            responsive: true,
            plugins: { legend: { display: false }, tooltip: {
              callbacks: {
                label: (ctx) => ` ${formatDuration(ctx.parsed.y * 60)}`
              }
            }},
            scales: {
              x: { ticks: { color: '#ffffff44', font: { size: 9 } }, grid: { display: false } },
              y: { ticks: { color: '#ffffff44' }, grid: { color: '#ffffff08' } },
            },
          }}
        />
        {/* Legend */}
        <div className="flex gap-3 mt-2 text-[10px] text-white/40">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> &lt;4ชม</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500 inline-block" /> 4–6ชม</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" /> 6–8ชม</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> &gt;8ชม</span>
        </div>
      </div>

      {/* ── Best vs Worst ── */}
      {data.best_day && data.worst_day && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4">
            <p className="text-[10px] text-emerald-500/70 uppercase tracking-wider mb-1">วันที่ดีที่สุด</p>
            <p className="text-2xl font-bold text-emerald-400">{formatDuration(data.best_day.total_secs)}</p>
            <p className="text-xs text-white/40 mt-1">{formatDate(data.best_day.date)}</p>
          </div>
          <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-4">
            <p className="text-[10px] text-red-500/70 uppercase tracking-wider mb-1">วันที่แย่ที่สุด</p>
            <p className="text-2xl font-bold text-red-400">{formatDuration(data.worst_day.total_secs)}</p>
            <p className="text-xs text-white/40 mt-1">{formatDate(data.worst_day.date)}</p>
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {data.categories.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-4">หมวดหมู่การใช้งาน</p>
          <div className="flex gap-4">
            <div className="w-32 h-32 flex-shrink-0">
              <Doughnut
                data={catData}
                options={{
                  cutout: '60%',
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
            <div className="flex-1 space-y-2">
              {data.categories.slice(0, 6).map((c, i) => {
                const pct = Math.round((c.total_secs / data.categories.reduce((s, x) => s + x.total_secs, 0)) * 100)
                return (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-xs text-white/70 flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-white/40">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CarPlay Section ── */}
      {data.carplay.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚗</span>
            <p className="text-xs text-white/50 uppercase tracking-wider">แอปขณะขับรถ (CarPlay)</p>
          </div>
          <p className="text-xs text-white/30 mb-3">แอปที่ใช้ผ่าน CarPlay ได้ใน 7 วันล่าสุด</p>
          <div className="space-y-2">
            {data.carplay.map((app) => {
              const icon = CARPLAY_ICON[app.bundle_id] ?? '📱'
              const maxSecs = data.carplay[0].total_secs
              const pct = Math.round((app.total_secs / maxSecs) * 100)
              return (
                <div key={app.bundle_id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base w-6 text-center">{icon}</span>
                    <span className="text-sm flex-1 truncate">{app.app_name}</span>
                    <span className="text-xs text-white/50 flex-shrink-0">{formatDuration(app.total_secs)}</span>
                  </div>
                  <div className="ml-8 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-white/20 mt-3">
            * ข้อมูลนี้รวมการใช้งานทุก context ไม่ใช่เฉพาะตอนขับรถ
          </p>
        </div>
      )}
    </div>
  )
}
