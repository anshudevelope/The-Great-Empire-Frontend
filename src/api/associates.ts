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
