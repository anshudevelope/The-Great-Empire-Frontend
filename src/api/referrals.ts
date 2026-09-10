import { apiRequest } from './fetchClient'
import type { ApiMessageResponse, ApiSingleResponse } from '@/types/api'
import type { ReferralInvoice, ReferralSummary } from '@/types/referral'

// Most referrals are created by registering an associate under a sponsor
// (createAssociate). createReferral covers members registered without one.

export interface CreateReferralPayload {
  /** An already-registered associate with no sponsor, not in the tree. */
  member: string
  /** The sponsor who paid for them. */
  issuedTo: string
  /** Optional — place the member under the sponsor now instead of leaving it to the sponsor. */
  position?: string
  amountPaid: number
  paymentMode?: string
  paymentRef?: string
  receivedOn?: string
  receivedBy?: string
  notes?: string
}

export interface CreateReferralResponse {
  success: true
  message: string
  placement: { placedUnder: string; position: 'Left' | 'Right'; spilledOver: boolean } | null
  data: ReferralInvoice
}

export function createReferral(payload: CreateReferralPayload): Promise<CreateReferralResponse> {
  return apiRequest<CreateReferralResponse>('/referrals', { method: 'POST', body: payload })
}

export interface ReferralListResponse {
  success: true
  count: number
  total: number
  page: number
  pages: number
  data: ReferralInvoice[]
}

export interface ReferralFilters {
  status?: string
  tier?: string
  issuedTo?: string
  search?: string
  page?: string
  limit?: string
  [key: string]: string | undefined
}

export function fetchReferrals(filters: ReferralFilters = {}): Promise<ReferralListResponse> {
  return apiRequest<ReferralListResponse>('/referrals', { params: filters })
}

export function fetchMyReferrals(filters: ReferralFilters = {}): Promise<ReferralListResponse> {
  return apiRequest<ReferralListResponse>('/referrals/mine', { params: filters })
}

export function fetchReferralSummary(): Promise<ApiSingleResponse<ReferralSummary>> {
  return apiRequest<ApiSingleResponse<ReferralSummary>>('/referrals/summary')
}

export function fetchInvoice(id: string): Promise<ApiSingleResponse<ReferralInvoice>> {
  return apiRequest<ApiSingleResponse<ReferralInvoice>>(`/referrals/${id}/invoice`)
}

export function cancelReferral(id: string, reason?: string): Promise<ApiSingleResponse<ReferralInvoice>> {
  return apiRequest<ApiSingleResponse<ReferralInvoice>>(`/referrals/${id}/cancel`, {
    method: 'PATCH',
    body: { reason },
  })
}

export function markReferralRead(id: string): Promise<ApiMessageResponse> {
  return apiRequest<ApiMessageResponse>(`/referrals/${id}/read`, { method: 'POST' })
}
