const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

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
}

export interface WeekResponse {
  since: string
  total_secs: number
  avg_secs: number
  by_day: DaySummary[]
  by_app: AppSummary[]
}

export interface AppsResponse {
  apps: AppSummary[]
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  today: () => get<TodayResponse>('/api/today'),
  week: () => get<WeekResponse>('/api/week'),
  apps: () => get<AppsResponse>('/api/apps'),
}
