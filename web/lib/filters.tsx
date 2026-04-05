'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'

export type Device = 'all' | 'mac' | 'iphone' | 'ipad'
export type Period = 'day' | 'month' | 'year'

export interface FilterState {
  device: Device
  period: Period
  date: Date
  from: string
  to: string
}

interface FilterCtx extends FilterState {
  setDevice: (d: Device) => void
  setPeriod: (p: Period) => void
  navigate: (dir: -1 | 1) => void
  dateLabel: string
}

function toRange(period: Period, date: Date): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  if (period === 'day') {
    const s = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    return { from: s, to: s }
  }
  if (period === 'month') {
    const y = date.getFullYear(), m = date.getMonth()
    const from = `${y}-${pad(m + 1)}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`
    return { from, to }
  }
  // year
  const y = date.getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

function dateLabel(period: Period, date: Date): string {
  if (period === 'day') {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }
  if (period === 'month') {
    return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  }
  return String(date.getFullYear() + 543) // Buddhist year
}

const Ctx = createContext<FilterCtx | null>(null)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device>('all')
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState<Date>(new Date())

  const navigate = useCallback((dir: -1 | 1) => {
    setDate(prev => {
      const d = new Date(prev)
      if (period === 'day') d.setDate(d.getDate() + dir)
      else if (period === 'month') d.setMonth(d.getMonth() + dir)
      else d.setFullYear(d.getFullYear() + dir)
      return d
    })
  }, [period])

  const { from, to } = toRange(period, date)
  const label = dateLabel(period, date)

  return (
    <Ctx.Provider value={{ device, period, date, from, to, dateLabel: label, setDevice, setPeriod, navigate }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFilter(): FilterCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFilter must be inside FilterProvider')
  return ctx
}
