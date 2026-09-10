import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  updateToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      updateToken: (token) => set({ token }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
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
        isAuthenticated: false,
      }),
    },
  ),
)

export const selectIsAdmin = (state: AuthState) => state.user?.role === 'admin'
