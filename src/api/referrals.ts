import { apiRequest } from './fetchClient'
import type { ApiMessageResponse, ApiSingleResponse } from '@/types/api'
import type { ReferralInvoice, ReferralSummary, VerifiedReferral } from '@/types/referral'

export interface ReferralListResponse {
  success: true
  count: number
  total: number
  page: number
  pages: number
  data: ReferralInvoice[]
}

/** The generate response is the ONLY place the plaintext PIN ever appears. */
export interface CreateReferralResponse {
  success: true
  message: string
  pin: string
  data: ReferralInvoice
}

export interface CreateReferralPayload {
  issuedTo: string
  tier: string
  amountPaid: number
  paymentMode?: string
  paymentRef?: string
  receivedOn?: string
  receivedBy?: string
  notes?: string
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

export function createReferral(payload: CreateReferralPayload): Promise<CreateReferralResponse> {
  return apiRequest<CreateReferralResponse>('/referrals', { method: 'POST', body: payload })
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

export function verifyReferral(payload: { referralNo: string; pin: string }): Promise<ApiSingleResponse<VerifiedReferral>> {
  return apiRequest<ApiSingleResponse<VerifiedReferral>>('/referrals/verify', { method: 'POST', body: payload })
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
