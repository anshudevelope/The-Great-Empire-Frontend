import { apiRequest } from './fetchClient'
import type { ApiSingleResponse } from '@/types/api'
import type { AuthUser, ChangePasswordResponse, LoginResponse } from '@/types/auth'

export interface LoginPayload {
  email: string
  password: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

/** One endpoint for both roles — the token identifies which user. */
export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload })
}

export function changePassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>('/auth/change-password', { method: 'POST', body: payload })
}

export function fetchMe(): Promise<ApiSingleResponse<AuthUser>> {
  return apiRequest<ApiSingleResponse<AuthUser>>('/auth/me')
}
