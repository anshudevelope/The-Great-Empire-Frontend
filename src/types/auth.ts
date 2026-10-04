import type { Business } from '@/lib/business'

export type UserRole = 'admin' | 'associate'

export interface AuthUser {
  _id: string
  memberCode: string | null
  fullName: string
  email: string
  role: UserRole
  status: string
  tier?: string | null
  /** The business this account lives in. Missing on sessions from before T2 — those are T1. */
  business?: Business
}

export interface LoginResponse {
  success: true
  message: string
  token: string
  data: AuthUser
}

/** One password opened accounts in more than one business — the member picks. */
export interface ChooseBusinessResponse {
  success: true
  chooseBusiness: true
  message: string
  /** Short-lived proof the password matched; exchanged for a session by choice. */
  pickToken: string
  options: { business: Business; label: string; memberCode: string | null }[]
}

export interface ChangePasswordResponse {
  success: true
  message: string
  token: string
}
