const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

export interface FilterParams {
  device?: string
  from?: string
  to?: string
}

export interface AppSummary {
  app_name: string
  bundle_id: string
  total_secs: number
  sessions: number
}

export interface DaySummary {
  date: string
  total_secs: number
}

export interface TodayResponse {
  date: string
  total_secs: number
  apps: AppSummary[]
  device: string
}

export interface WeekResponse {
  from: string
  to: string
  total_secs: number
  avg_secs: number
  by_day: DaySummary[]
  by_app: AppSummary[]
  device: string
}

export interface AppsResponse {
  apps: AppSummary[]
  device: string
}

export interface CategorySummary {
  name: string
  total_secs: number
}

export interface InsightResponse {
  avg_secs: number
  today_secs: number
  delta_secs: number
  score: number
  grade: string
  verdict: string
  is_bad: boolean
  peak_hour: number
  hourly: number[]
  categories: CategorySummary[]
  carplay: AppSummary[]
  best_day: DaySummary | null
  worst_day: DaySummary | null
  by_day: DaySummary[]
  device: string
}

function buildUrl(path: string, params: FilterParams): string {
  const q = new URLSearchParams()
  if (params.device && params.device !== 'all') q.set('device', params.device)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  const qs = q.toString()
  return `${API_URL}${path}${qs ? '?' + qs : ''}`
}

async function get<T>(path: string, params: FilterParams = {}): Promise<T> {
  const res = await fetch(buildUrl(path, params), { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  today: (p: FilterParams = {}) => get<TodayResponse>('/api/today', p),
  week:  (p: FilterParams = {}) => get<WeekResponse>('/api/week', p),
  apps:  (p: FilterParams = {}) => get<AppsResponse>('/api/apps', p),
  insight:(p: FilterParams = {}) => get<InsightResponse>('/api/insight', p),
}
