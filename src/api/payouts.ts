import { apiRequest } from './fetchClient'
import { activeAuthStore } from '@/store/authStore'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api'

export type PayoutStatus = 'draft' | 'finalized' | 'cancelled'

/** Rates frozen onto a batch when it was generated. Never re-read from settings. */
export interface PayoutRates {
  adminChargePct: number
  secondaryChargePct: number
  secondaryChargeLabel: string
  flushCarryOnClose: boolean
  minimumPayable: number
}

export interface PayoutTotals {
  members: number
  grossDirect: number
  grossMatching: number
  grossReversals: number
  gross: number
  adminCharge: number
  secondaryCharge: number
  netPayable: number
  /** Unmatched volume destroyed by the closing. Cannot be recovered. */
  carryFlushed: number
  ledgerRows: number
}

interface ActorRef {
  _id: string
  fullName: string
  memberCode: string | null
}

export interface PayoutBatch {
  _id: string
  batchNo: string
  periodStart: string
  periodEnd: string
  status: PayoutStatus
  rates: PayoutRates
  totals: PayoutTotals
  generatedBy: ActorRef | null
  finalizedBy: ActorRef | null
  finalizedAt: string | null
  cancelledBy: ActorRef | null
  cancelledAt: string | null
  cancelReason: string
  note: string
  createdAt: string
}

export interface PayoutLine {
  _id: string
  memberCode: string
  fullName: string
  pan: string
  tier: string
  direct: number
  matching: number
  reversals: number
  openingAdjustment: number
  total: number
  adminCharge: number
  secondaryCharge: number
  netPayable: number
  carryBefore: { left: number; right: number }
  carryFlushed: { left: number; right: number }
  /** Set when the amount rolls into the next batch instead of being paid. */
  heldReason: 'negative' | 'below-minimum' | null
  ledgerRowCount: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PayoutListResponse {
  success: true
  data: PayoutBatch[]
  pagination: Pagination
}

/** `data` is null when no draft is open — `next` then describes what one would cover. */
export interface DraftResponse {
  success: true
  data: PayoutBatch | null
  next?: { periodStart: string; rates: PayoutRates }
}

export interface PayoutLinesResponse {
  success: true
  batch: { batchNo: string; status: PayoutStatus; rates: PayoutRates; totals: PayoutTotals }
  data: PayoutLine[]
  pagination: Pagination
}

export interface MyPayoutRow {
  batchNo: string
  periodStart: string | null
  periodEnd: string | null
  paidOn: string | null
  secondaryChargeLabel: string
  direct: number
  matching: number
  reversals: number
  openingAdjustment: number
  total: number
  adminCharge: number
  secondaryCharge: number
  netPayable: number
  heldReason: 'negative' | 'below-minimum' | null
  carryFlushed: { left: number; right: number }
}

export interface MyPayoutsResponse {
  success: true
  data: MyPayoutRow[]
  total: number
}

export interface PayoutSettings {
  'payout.adminChargePct': number
  'payout.secondaryChargePct': number
  'payout.secondaryChargeLabel': string
  'payout.flushCarryOnClose': boolean
  'payout.minimumPayable': number
  'payout.includeZeroIncomeMembers': boolean
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function fetchPayouts(params: Record<string, string | undefined> = {}) {
  return apiRequest<PayoutListResponse>('/payouts', { params })
}

export function fetchDraft() {
  return apiRequest<DraftResponse>('/payouts/draft')
}

export function fetchPayout(id: string) {
  return apiRequest<{ success: true; data: PayoutBatch }>(`/payouts/${id}`)
}

export function fetchPayoutLines(id: string, params: Record<string, string | undefined> = {}) {
  return apiRequest<PayoutLinesResponse>(`/payouts/${id}/lines`, { params })
}

/**
 * Builds a draft. Stamps nothing and touches no member — safe to discard.
 *
 * `periodStart` labels the batch only; what gets paid is decided by unpaid
 * status plus `periodEnd`.
 */
export function createPayoutDraft(
  body: { periodStart?: string; periodEnd?: string; note?: string } = {},
) {
  return apiRequest<{ success: true; message: string; data: PayoutBatch }>('/payouts/preview', {
    method: 'POST',
    body,
  })
}

/** Commits a draft: pays everyone, resets income, and destroys carry. */
export function finalizePayout(id: string) {
  return apiRequest<{ success: true; message: string; data: PayoutBatch }>(`/payouts/${id}/finalize`, {
    method: 'POST',
  })
}

export function cancelPayout(id: string, reason: string) {
  return apiRequest<{ success: true; message: string; data: PayoutBatch }>(`/payouts/${id}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}

export function discardPayout(id: string) {
  return apiRequest<{ success: true; message: string }>(`/payouts/${id}`, { method: 'DELETE' })
}

export function fetchPayoutSettings() {
  return apiRequest<{ success: true; data: PayoutSettings }>('/settings/payout')
}

export function updatePayoutSettings(body: Partial<PayoutSettings>) {
  return apiRequest<{ success: true; data: PayoutSettings }>('/settings/payout', {
    method: 'PATCH',
    body,
  })
}

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export function fetchMyPayouts() {
  return apiRequest<MyPayoutsResponse>('/payouts/me')
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * The payout sheet as CSV — UTF-8 with a BOM, so Excel opens it directly with
 * Indian names intact. Goes through fetch rather than a plain link because the
 * endpoint needs an Authorization header.
 */
export async function downloadPayoutCsv(id: string, batchNo: string): Promise<void> {
  const token = activeAuthStore().getState().token
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/payouts/${id}/lines`)
  url.searchParams.set('format', 'csv')

  const response = await fetch(url.toString(), { headers: token ? { Authorization: token } : {} })
  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${batchNo}-payout.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
