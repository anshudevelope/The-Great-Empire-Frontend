import { apiRequest } from './fetchClient'

export interface CommissionTotals {
  directIncome: number
  matchingIncome: number
  reversals: number
  totalIncome: number
  rowCount: number
}

/**
 * A member's earnings.
 *
 * The top-level figures are the CURRENT period — what the reference platform
 * calls "realtime income". They are unpaid commission, so finalizing a payout
 * stamps the rows behind them and everything here drops to zero and starts
 * climbing again. `lifetime` is the all-time equivalent, kept as a separate
 * block so the two can never be mistaken for each other.
 */
export interface CommissionSummary extends CommissionTotals {
  memberCode: string
  lifetime: CommissionTotals
  carry: {
    /** Unmatched business volume, in rupees — not a member count. */
    left: number
    right: number
    /** What the next pairing can draw on: min(left, right). */
    matchable: number
    weakerLeg: 'Left' | 'Right' | null
  }
  volume: { left: number; right: number }
  /**
   * Difference between the cached totals and the unpaid ledger. Always zero in
   * a healthy system; surfaced so drift is visible rather than silently trusted.
   */
  cacheDrift: { direct: number; matching: number }
}

export interface CommissionLedgerRow {
  _id: string
  type: 'direct' | 'matching' | 'reversal'
  amount: number
  tier: string
  beneficiaryCode: string
  /** The member whose joining produced this payment. */
  sourceMemberCode: string
  basis: {
    rate: number
    /** What the rate was applied to: the joining amount, or the matched volume. */
    base: number
    legSide: 'Left' | 'Right' | null
    depthFromSource: number | null
  }
  /** null while unpaid; set to the batch that paid it. */
  payoutBatch: string | null
  note: string
  createdAt: string
}

export interface CommissionLedgerResponse {
  success: true
  data: CommissionLedgerRow[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export function fetchMyCommissionSummary() {
  return apiRequest<{ success: true; data: CommissionSummary }>('/commissions/me/summary')
}

/**
 * The caller's own ledger.
 *
 * `period: 'current'` limits it to unpaid rows — this period's earnings.
 * Omitting it returns the full history, paid batches included.
 */
export function fetchMyCommissions(
  params: { period?: 'current' | 'all'; type?: string; page?: string; limit?: string } = {},
) {
  return apiRequest<CommissionLedgerResponse>('/commissions/me', {
    params: params as Record<string, string | undefined>,
  })
}
