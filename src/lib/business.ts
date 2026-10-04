import type { AssociateTier } from '@/types/associate'

export type Business = 't1' | 't2'

export interface BusinessInfo {
  id: Business
  code: 'T1' | 'T2'
  label: string
  description: string
  /** Every member of this business carries this tier. */
  tier: AssociateTier
  /** Display labels only — the API's COMMISSION_RATES are what actually pay. */
  rates: { direct: string; matching: string }
}

/** The one place a business is named — same idea as TIER_LABELS in tier.ts. */
export const BUSINESSES: Record<Business, BusinessInfo> = {
  t1: {
    id: 't1',
    code: 'T1',
    label: 'Insurance',
    description: 'Insurance associates, invoices, commissions and payouts.',
    tier: 'Tier I',
    rates: { direct: '10%', matching: '5%' },
  },
  t2: {
    id: 't2',
    code: 'T2',
    label: 'Plots',
    description: 'The plot business — its own associates, tree, commissions and payouts.',
    tier: 'Tier II',
    rates: { direct: '5%', matching: '5%' },
  },
}

export const BUSINESS_LIST: BusinessInfo[] = [BUSINESSES.t1, BUSINESSES.t2]

/** "T1 · Insurance" */
export const businessName = (business: Business) => `${BUSINESSES[business].code} · ${BUSINESSES[business].label}`
