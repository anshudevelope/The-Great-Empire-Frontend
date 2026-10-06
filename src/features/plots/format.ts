import type { BookingStatus, InstalmentKind, PaymentPlan, PlotStatus, ProjectStatus, RateUnit } from '@/api/plots'
import { formatShortDate } from '@/lib/datetime'

// Display helpers shared by the plot module's screens.

/** ₹7,20,000, ₹58,333.33 or -₹7,000 — paise only when there are some, sign before the symbol. */
export const inr = (value: number | null | undefined) => {
  const n = value ?? 0
  const text = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}₹${text}`
}

export const day = (value?: string | null) => (value ? formatShortDate(value) : '—')

/** yyyy-mm-dd for <input type="date">. */
export const isoDay = (value?: string | Date | null) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const pct = (fraction: number) => `${+(fraction * 100).toFixed(2)}%`

export const RATE_UNIT_LABEL: Record<RateUnit, string> = { per_sqft: 'per sq.ft', per_plot: 'per plot' }

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
}

export const PLAN_LABEL: Record<PaymentPlan, string> = { one_time: 'One-time', emi: 'EMI' }

export const KIND_LABEL: Record<InstalmentKind, string> = { full: 'Full payment', down: 'Down payment', emi: 'EMI' }

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const PLOT_STATUS_TONE: Record<PlotStatus, Tone> = { available: 'success', hold: 'warning', booked: 'info' }

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  active: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

/** Same-day plot price as the API computes it — for live previews only. */
export const plotPrice = (size: number, rate: number, unit: RateUnit, extraPct = 0, extraAmount = 0) => {
  const base = unit === 'per_sqft' ? size * rate : rate
  return Math.round((base * (1 + extraPct / 100) + extraAmount) * 100) / 100
}

/** Instalment label: "Down payment", "EMI 3 of 12". */
export const instalmentLabel = (kind: InstalmentKind, seq: number, tenure: number) =>
  kind === 'emi' ? `EMI ${seq} of ${tenure}` : KIND_LABEL[kind]

/** Table row styling shared by the module's lists. */
export const rowClass = 'border-b border-border last:border-0 hover:bg-neutral-hover/60'
