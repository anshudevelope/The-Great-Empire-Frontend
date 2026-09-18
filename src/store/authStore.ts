import { createStore, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'
import { scopeFromPath, useAuthScope, type AuthScope } from './authScope'

export interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  updateToken: (token: string) => void
  logout: () => void
}

const empty = { token: null, user: null, isAuthenticated: false }

/**
 * One session per scope, each in its own localStorage key.
 *
 * Separate keys are what let the console and the portal be signed in at once
 * in the same browser: two tabs, two sessions, and logging out of one leaves
 * the other alone.
 *
 * Version 3 is the split. Versions 1 and 2 shared a single `ge-auth` key for
 * both roles, so there is nothing in them worth migrating — any persisted
 * session from before the split is discarded and that person signs in again.
 */
function createAuthStore(scope: AuthScope) {
  return createStore<AuthState>()(
    persist(
      (set) => ({
        ...empty,
        login: (token, user) => set({ token, user, isAuthenticated: true }),
        updateToken: (token) => set({ token }),
        logout: () => set({ ...empty }),
      }),
      { name: `ge-auth-${scope}`, version: 3, migrate: () => ({ ...empty }) },
    ),
  )
}

const stores: Record<AuthScope, ReturnType<typeof createAuthStore>> = {
  admin: createAuthStore('admin'),
  associate: createAuthStore('associate'),
}

// The pre-split key would otherwise sit there forever holding a token that
// neither scope reads.
try {
  localStorage.removeItem('ge-auth')
} catch {
  // Private mode or blocked site data — nothing to clean up.
}

export const authStoreFor = (scope: AuthScope) => stores[scope]

/**
 * The store for the branch currently on screen, for code that runs outside
 * React and so can't reach the provider — the fetch client and the file
 * download helpers. Same rule the provider uses, read from the live URL.
 */
export const activeAuthStore = () => stores[scopeFromPath(window.location.pathname)]

/**
 * Reads the session belonging to the surrounding branch.
 *
 * Deliberately the same call shape as the single global store this replaced,
 * so every component that reads auth stayed untouched — what changed is which
 * session answers, which is now decided by where the component is mounted.
 */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useStore(authStoreFor(useAuthScope()), selector)
}
