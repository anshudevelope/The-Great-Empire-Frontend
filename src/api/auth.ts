// import { apiRequest } from './fetchClient'
// import type { ApiSingleResponse } from '@/types/api'
// import type { AuthUser, ChangePasswordResponse, LoginResponse } from '@/types/auth'

// export interface LoginPayload {
//   email: string
//   password: string
// }

// export interface ChangePasswordPayload {
//   currentPassword: string
//   newPassword: string
// }

// /** One endpoint for both roles — the token identifies which user. */
// export function login(payload: LoginPayload): Promise<LoginResponse> {
//   return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload })
// }

// export function changePassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
//   return apiRequest<ChangePasswordResponse>('/auth/change-password', { method: 'POST', body: payload })
// }

// export function fetchMe(): Promise<ApiSingleResponse<AuthUser>> {
//   return apiRequest<ApiSingleResponse<AuthUser>>('/auth/me')
// }


import { apiRequest } from './fetchClient'
import type { ApiSingleResponse } from '@/types/api'
import type { AuthUser, ChangePasswordResponse, LoginResponse } from '@/types/auth'
import type { AuthScope } from '@/store/authScope'

export interface LoginPayload {
  identifier: string
  password: string
  /**
   * Which door this request came through. Part of the credential check, not a
   * hint: the API rejects a correct password presented at the wrong door.
   */
  audience: AuthScope
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

/** Accepts email or Associate ID, and only for the matching audience. */
export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload })
}

export function changePassword(payload: ChangePasswordPayload): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>('/auth/change-password', { method: 'POST', body: payload })
}

export function fetchMe(): Promise<ApiSingleResponse<AuthUser>> {
  return apiRequest<ApiSingleResponse<AuthUser>>('/auth/me')
}