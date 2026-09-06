import { apiRequest } from './fetchClient'
import { useAuthStore } from '@/store/authStore'
import type { ApiSingleResponse } from '@/types/api'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api'

export interface DownlineRow {
  memberCode: string
  fullName: string
  email: string
  phone: string
  status: string
  tier: string
  tierLabel: string | null
  position: string | null
  depth: number
  directCount: number
  sponsorCode: string | null
  placedUnderCode: string | null
  /** True when the sponsor differs from the placement parent — i.e. spillover. */
  isSpillover: boolean
  joinedAt: string
}

export interface DownlineResponse {
  success: true
  scope: { memberCode: string | null; fullName: string }
  count: number
  total: number
  page: number
  pages: number
  data: DownlineRow[]
}

export interface LevelRow {
  level: number
  absoluteDepth: number
  total: number
  active: number
  tierI: number
  tierII: number
}

export interface LevelsResponse {
  success: true
  scope: { memberCode: string | null; fullName: string }
  data: LevelRow[]
  totals: { members: number; active: number; tierI: number; tierII: number }
}

export interface LegStats {
  rootCode: string | null
  total: number
  active: number
  tierI: number
  tierII: number
}

export interface LegsResponse {
  success: true
  scope: { memberCode: string | null; fullName: string }
  data: {
    left: LegStats
    right: LegStats
    matched: number
    carryLeft: number
    carryRight: number
    weakerLeg: 'Left' | 'Right' | 'Balanced'
  }
}

export interface ReferralReportData {
  counts: { unused: number; used: number; cancelled: number }
  totalCollected: number
  /** Money taken for vouchers that have not yet produced a member. */
  openLiability: number
  byStatus: { status: string; count: number; amountPaid: number }[]
  byPaymentMode: { mode: string; count: number; amountPaid: number }[]
  agedUnused: {
    referralNo: string
    invoiceNo: string
    issuedTo: string
    tier: string
    amountPaid: number
    receivedOn: string
    ageDays: number
  }[]
}

export type ReportFilters = Record<string, string | undefined>

const path = (report: string, id?: string) => (id ? `/reports/${report}/${id}` : `/reports/${report}`)

export function fetchDownlineReport(id?: string, filters: ReportFilters = {}): Promise<DownlineResponse> {
  return apiRequest<DownlineResponse>(path('downline', id), { params: filters })
}

export function fetchLevelsReport(id?: string): Promise<LevelsResponse> {
  return apiRequest<LevelsResponse>(path('levels', id))
}

export function fetchLegsReport(id?: string): Promise<LegsResponse> {
  return apiRequest<LegsResponse>(path('legs', id))
}

export function fetchReferralReport(filters: ReportFilters = {}): Promise<ApiSingleResponse<ReferralReportData>> {
  return apiRequest<ApiSingleResponse<ReferralReportData>>('/reports/referrals', { params: filters })
}

/**
 * CSV downloads can't go through apiRequest — it parses JSON, and the token
 * lives in a header rather than a cookie, so a plain <a href> would arrive
 * unauthenticated. Fetch the blob, then hand it to a temporary anchor.
 */
export async function downloadReportCsv(report: string, id?: string, filters: ReportFilters = {}): Promise<void> {
  const token = useAuthStore.getState().token
  const url = new URL(BASE_URL.replace(/\/$/, '') + path(report, id))
  url.searchParams.set('format', 'csv')
  for (const [key, value] of Object.entries(filters)) {
    if (value) url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), { headers: token ? { Authorization: token } : {} })
  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = match?.[1] ?? `${report}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
