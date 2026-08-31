import { apiRequest } from './fetchClient'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  success: true
  message: string
  token: string
}

export function adminLogin(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/admin/login', { method: 'POST', body: payload })
}
