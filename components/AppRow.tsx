import { formatDuration } from '@/lib/formatters'

interface Props {
  rank: number
  appName: string
  bundleId: string
  totalSecs: number
  maxSecs: number
}

export default function AppRow({ rank, appName, bundleId, totalSecs, maxSecs }: Props) {
  const pct = Math.round((totalSecs / maxSecs) * 100)
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-white/30 text-xs w-4 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium truncate">{appName}</span>
          <span className="text-sm text-white/60 ml-2 shrink-0">{formatDuration(totalSecs)}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
