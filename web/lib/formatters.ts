export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function last7Days(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().split('T')[0]
}

// สีสำหรับกราฟ
export const CHART_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
  '#f97316', '#84cc16',
]
