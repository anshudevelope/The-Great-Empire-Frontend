import { apiRequest } from './fetchClient'

/**
 * A member's earnings for the CURRENT period — what the reference platform
 * calls "realtime income".
 *
 * These figures are unpaid commission. Finalizing a payout stamps the ledger
 * rows behind them, so everything here drops to zero and starts climbing again.
 * Past periods live in the payout history instead.
 */
export interface CommissionSummary {
  memberCode: string
  /** 10% referral bonus, net of any reversals. */
  directIncome: number
  /** 5% binary matching bonus. */
  matchingIncome: number
  reversals: number
  totalIncome: number
  rowCount: number
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
   * Difference between the cached totals and the ledger. Always zero in a
   * healthy system; surfaced so drift is visible rather than silently trusted.
   */
  cacheDrift: { direct: number; matching: number }
}

export interface CommissionLedgerRow {
  _id: string
  type: 'direct' | 'matching' | 'reversal'
  amount: number
  tier: string
  beneficiaryCode: string
  sourceMemberCode: string
  basis: {
    rate: number
    base: number
    legSide: 'Left' | 'Right' | null
    depthFromSource: number | null
  }
  note: string
  createdAt: string
}

export function fetchMyCommissionSummary() {
  return apiRequest<{ success: true; data: CommissionSummary }>('/commissions/me/summary')
}

export function fetchMyCommissions(params: Record<string, string | undefined> = {}) {
  return apiRequest<{
    success: true
    data: CommissionLedgerRow[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>('/commissions/me', { params })
}
