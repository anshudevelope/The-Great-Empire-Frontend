/**
 * All dates in this app are IST, everywhere.
 *
 * The API stores and returns UTC (Mongo dates are UTC, and the server runs in
 * UTC on Vercel). Left to `toLocaleDateString()` with no timezone, every screen
 * would render in whatever zone the *viewer's* machine happens to be in — so a
 * receipt opened from abroad, or by a server-side render on Vercel, would show
 * a different day than the office that issued it.
 *
 * Pinning to Asia/Kolkata makes the displayed date the same for everyone, and
 * the same as the business day the record belongs to.
 */
const IST = 'Asia/Kolkata'

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 07 Sep 2026 */
export const formatDate = (value?: string | Date | null, fallback = '—'): string => {
  const date = toDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** 07/09/2026 — for dense tables. */
export const formatShortDate = (value?: string | Date | null, fallback = '—'): string => {
  const date = toDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('en-IN', { timeZone: IST })
}

/** 07 Sep 2026, 4:32 pm — where the time of day actually matters. */
export const formatDateTime = (value?: string | Date | null, fallback = '—'): string => {
  const date = toDate(value)
  if (!date) return fallback
  return date.toLocaleString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Today in IST as YYYY-MM-DD, for <input type="date"> defaults.
 *
 * `new Date().toISOString().slice(0,10)` would give the UTC day, which is the
 * previous date for the first 5.5 hours of every Indian morning.
 */
export const todayIST = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts // en-CA already formats as YYYY-MM-DD
}
