import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: AuthUser | null
  /**
   * The API answers 428 on every route until a temporary password is replaced.
   * Admins hit this on first login; every member registered through a referral
   * hits it too, since their sponsor set the initial password.
   */
  mustChangePassword: boolean
  isAuthenticated: boolean
  login: (token: string, user: AuthUser, mustChangePassword: boolean) => void
  setMustChangePassword: (value: boolean) => void
  updateToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      mustChangePassword: false,
      isAuthenticated: false,
      login: (token, user, mustChangePassword) =>
        set({ token, user, mustChangePassword, isAuthenticated: true }),
      setMustChangePassword: (value) => set({ mustChangePassword: value }),
      updateToken: (token) => set({ token }),
      logout: () => set({ token: null, user: null, mustChangePassword: false, isAuthenticated: false }),
    }),
    // Version bumped from the old shape (token + email only). Tokens issued
    // before RBAC carry no user id and the API rejects them, so any persisted
    // pre-v2 session is discarded rather than left to fail on every request.
    {
      name: 'ge-auth',
      version: 2,
      migrate: () => ({
        token: null,
        user: null,
        mustChangePassword: false,
        isAuthenticated: false,
      }),
    },
  ),
)

export const selectIsAdmin = (state: AuthState) => state.user?.role === 'admin'
