import { apiRequest } from './fetchClient'
import type { ApiListResponse, ApiMessageResponse, ApiSingleResponse } from '@/types/api'
import type { Associate, AssociateStatus, AssociateTreeNode } from '@/types/associate'

export interface AssociateFilters {
  status?: string
  tier?: string
  search?: string
  [key: string]: string | undefined
}

export function fetchAssociates(filters: AssociateFilters): Promise<ApiListResponse<Associate>> {
  return apiRequest<ApiListResponse<Associate>>('/associates', { params: filters })
}

export function fetchAssociateById(id: string): Promise<ApiSingleResponse<Associate>> {
  return apiRequest<ApiSingleResponse<Associate>>(`/associates/${id}`)
}

export function fetchAssociateTree(id: string, depth = 3): Promise<ApiSingleResponse<AssociateTreeNode>> {
  return apiRequest<ApiSingleResponse<AssociateTreeNode>>(`/associates/tree/${id}`, {
    params: { depth: String(depth) },
  })
}

export function createAssociate(formData: FormData): Promise<ApiSingleResponse<Associate>> {
  return apiRequest<ApiSingleResponse<Associate>>('/associates/register', { method: 'POST', body: formData })
}

export function updateAssociate(id: string, formData: FormData): Promise<ApiSingleResponse<Associate>> {
  return apiRequest<ApiSingleResponse<Associate>>(`/associates/${id}`, { method: 'PUT', body: formData })
}

export function updateAssociateStatus(id: string, status: AssociateStatus): Promise<ApiSingleResponse<Associate>> {
  return apiRequest<ApiSingleResponse<Associate>>(`/associates/${id}/status`, { method: 'PATCH', body: { status } })
}

export function deleteAssociate(id: string): Promise<ApiMessageResponse> {
  return apiRequest<ApiMessageResponse>(`/associates/${id}`, { method: 'DELETE' })
}

/** Row shape for the searchable selects (issuedTo, receivedBy, sponsor). */
export interface AssociateOption {
  _id: string
  memberCode: string | null
  fullName: string
  email: string
  role: 'admin' | 'associate'
  status: string
  tier: string | null
  /** Pre-built dropdown label, e.g. "TRG0042 — Rakesh". */
  label: string
}

export function searchAssociates(q: string, role?: string): Promise<ApiListResponse<AssociateOption>> {
  return apiRequest<ApiListResponse<AssociateOption>>('/associates/search', {
    params: { q, role, limit: '10' },
  })
}

export interface PlacementPreview {
  parent: { _id: string; memberCode: string; fullName: string }
  position: 'Left' | 'Right'
  depth: number
  /** How far below the viewer the new member will land. 1 = directly under them. */
  levelsBelow: number
  /** False means spillover moved the placement further down the leg. */
  isDirect: boolean
}

export function fetchPlacementPreview(position: string, sponsorId?: string): Promise<ApiSingleResponse<PlacementPreview>> {
  return apiRequest<ApiSingleResponse<PlacementPreview>>('/associates/placement-preview', {
    params: { position, sponsorId },
  })
}

export interface RedeemResult {
  _id: string
  memberCode: string
  fullName: string
  email: string
  tier: string
  tierLabel: string
  status: string
  position: string
  depth: number
  sponsor: { memberCode: string }
  placedUnder: { memberCode: string; fullName: string } | null
  spilledOver: boolean
}

export interface RedeemResponse {
  success: true
  message: string
  /** Shown once, for the sponsor to hand over. Never retrievable afterwards. */
  tempPassword: string
  data: RedeemResult
}

export function redeemReferral(formData: FormData): Promise<RedeemResponse> {
  return apiRequest<RedeemResponse>('/associates/redeem', { method: 'POST', body: formData })
}
