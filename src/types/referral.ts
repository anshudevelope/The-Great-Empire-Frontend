/** 'unused' = member not in the tree yet, 'used' = placed. */
export type ReferralStatus = 'unused' | 'used' | 'cancelled'
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Other'

export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other']

/** Human wording for a referral's status — it tracks placement, not a voucher. */
export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  unused: 'Not placed',
  used: 'Placed',
  cancelled: 'Cancelled',
}

export interface ReferralParty {
  _id: string
  name: string | null
  memberCode: string | null
  treeStatus?: 'unplaced' | 'root' | 'placed' | null
  /** On the member: who holds the sponsor credit now. */
  sponsorMemberCode?: string | null
}

/** How the referred member got into the tree, once they did. */
export interface ReferralPlacement {
  by: 'admin' | 'sponsor' | null
  under: string | null
  position: 'Left' | 'Right' | null
}

export interface ReferralPayment {
  mode: PaymentMode | null
  reference: string
  receivedOn: string
  receivedBy: ReferralParty | null
}

/**
 * Raised when the admin registers an associate under a sponsor. Both the admin
 * and the sponsor see this same record.
 */
export interface ReferralInvoice {
  _id: string
  invoiceNo: string
  referralNo: string
  issuedAt: string
  issuedBy: string | null
  /** Referred by — who paid. Keeps the invoice even if the sponsor credit is passed on. */
  issuedTo: ReferralParty
  /** The associate registered under that sponsor. */
  member: ReferralParty
  tier: string
  tierLabel: string
  /** Money the sponsor PAID to the company. Recorded only — never a payout. */
  amountPaid: number
  payment: ReferralPayment
  status: ReferralStatus
  usedAt: string | null
  placement: ReferralPlacement | null
  cancelledAt: string | null
  cancelReason: string
  readAt: string | null
  notes: string
}

export interface ReferralSummary {
  unused: number
  used: number
  cancelled: number
  totalAmount: number
  unusedAmount: number
  unread: number
}
