export type UserRole = 'admin' | 'associate'

export interface AuthUser {
  _id: string
  memberCode: string | null
  fullName: string
  email: string
  role: UserRole
  status: string
  tier?: string | null
}

export interface LoginResponse {
  success: true
  message: string
  token: string
  data: AuthUser
}

export interface ChangePasswordResponse {
  success: true
  message: string
  token: string
}
