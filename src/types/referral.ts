export type ReferralStatus = 'unused' | 'used' | 'cancelled'
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Other'

export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other']

export interface ReferralParty {
  _id: string
  name: string | null
  memberCode: string | null
}

export interface ReferralPayment {
  mode: PaymentMode | null
  reference: string
  receivedOn: string
  receivedBy: ReferralParty | null
}

/** The invoice both the admin and the issued-to associate see. Never carries the PIN. */
export interface ReferralInvoice {
  _id: string
  invoiceNo: string
  referralNo: string
  issuedAt: string
  issuedBy: string | null
  issuedTo: ReferralParty
  tier: string
  tierLabel: string
  /** Money the associate PAID to the company. Recorded only — never a payout. */
  amountPaid: number
  payment: ReferralPayment
  status: ReferralStatus
  /** Masked as ••••NN — the real PIN is shown once at generation and never again. */
  pinHint: string | null
  usedBy: ReferralParty | null
  usedAt: string | null
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

export interface VerifiedReferral {
  referralNo: string
  invoiceNo: string
  tier: string
  tierLabel: string
  amountPaid: number
  sponsor: { _id: string; name: string; memberCode: string }
}
