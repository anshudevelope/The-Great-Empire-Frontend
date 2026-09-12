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

export interface RegisterAssociateResponse {
  success: true
  message: string
  data: Associate
  /** The referral (and invoice) raised when a sponsor was chosen. */
  referral: { _id: string; referralNo: string; invoiceNo: string } | null
}

/** Admin only. Carries the sponsor, optional leg and payment alongside the member details. */
export function createAssociate(formData: FormData): Promise<RegisterAssociateResponse> {
  return apiRequest<RegisterAssociateResponse>('/associates/register', { method: 'POST', body: formData })
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

/** Row shape for the admin's searchable selects (sponsor, parent, receivedBy). */
export interface AssociateOption {
  _id: string
  memberCode: string | null
  fullName: string
  email: string
  role: 'admin' | 'associate'
  status: string
  tier: string | null
  treeStatus: 'unplaced' | 'root' | 'placed' | null
  /** Pre-built dropdown label, e.g. "TGE0042 — Rakesh". */
  label: string
}

export function searchAssociates(
  q: string,
  options: {
    role?: string
    status?: string
    exclude?: string
    /** Only members who are in the tree (root or placed). */
    inTree?: string
    /** Only members who can still be given a sponsor: unplaced and unsponsored. */
    referable?: string
    treeStatus?: string
  } = {},
): Promise<ApiListResponse<AssociateOption>> {
  return apiRequest<ApiListResponse<AssociateOption>>('/associates/search', {
    params: { q, ...options, limit: '10' },
  })
}

export interface PlacementPreview {
  parent: { _id: string; memberCode: string; fullName: string }
  position: 'Left' | 'Right'
  depth: number
  /** How far below the starting node the member will land. 1 = directly under it. */
  levelsBelow: number
  /** False means spillover moved the placement further down the leg. */
  isDirect: boolean
}

export function fetchPlacementPreview(position: string, sponsorId?: string): Promise<ApiSingleResponse<PlacementPreview>> {
  return apiRequest<ApiSingleResponse<PlacementPreview>>('/associates/placement-preview', {
    params: { position, sponsorId },
  })
}

// ---------------------------------------------------------------------------
// Sponsor-side placement
// ---------------------------------------------------------------------------

/** A member registered under the signed-in associate who is not in the tree yet. */
export interface PendingMember {
  _id: string
  memberCode: string
  fullName: string
  email: string
  phone: string
  tier: string
  tierLabel: string | null
  status: string
  joinedAt: string
}

export function fetchPendingPlacement(): Promise<{ success: true; count: number; data: PendingMember[] }> {
  return apiRequest<{ success: true; count: number; data: PendingMember[] }>('/associates/pending-placement')
}

/** Somewhere a member can be placed: the caller or someone below them, with at least one open leg. */
export interface PlacementParent {
  _id: string
  memberCode: string
  fullName: string
  isSelf: boolean
  /** 0 = the caller, 1 = directly below them, … */
  levelsBelow: number
  leftOpen: boolean
  rightOpen: boolean
}

/** Someone the referrer may pass the sponsor credit to: themselves or anyone below them. */
export interface SponsorOption {
  _id: string
  memberCode: string
  fullName: string
  isSelf: boolean
  /** 0 = the caller, 1 = directly below them, … */
  levelsBelow: number
}

export function fetchSponsorOptions(q: string): Promise<{ success: true; count: number; data: SponsorOption[] }> {
  return apiRequest<{ success: true; count: number; data: SponsorOption[] }>('/associates/sponsor-options', {
    params: { q },
  })
}

export function fetchPlacementParents(q: string): Promise<{ success: true; count: number; data: PlacementParent[] }> {
  return apiRequest<{ success: true; count: number; data: PlacementParent[] }>('/associates/placement-parents', {
    params: { q },
  })
}

export interface PlaceMemberResponse {
  success: true
  message: string
  data: {
    _id: string
    memberCode: string
    fullName: string
    position: 'Left' | 'Right'
    depth: number
    placedUnder: { memberCode: string; fullName: string }
    sponsor: { memberCode: string | null }
  }
}

/**
 * Exact placement — no spillover. A taken slot comes back as an error.
 * `sponsorId` optionally passes the sponsor credit to someone in your team.
 */
export function placeMember(
  memberId: string,
  payload: { parentId: string; position: 'Left' | 'Right'; sponsorId?: string },
): Promise<PlaceMemberResponse> {
  return apiRequest<PlaceMemberResponse>(`/associates/${memberId}/place`, { method: 'POST', body: payload })
}
