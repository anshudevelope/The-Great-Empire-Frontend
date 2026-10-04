import { create, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Business } from '@/lib/business'
import { scopeFromPath, useAuthScope } from './authScope'
import { authStoreFor } from './authStore'

interface BusinessState {
  /** null until the admin picks one on the chooser. */
  business: Business | null
  setBusiness: (business: Business) => void
  clearBusiness: () => void
}

/**
 * Which business the admin console has open. Persisted like the theme, so a
 * reload stays where the admin was; cleared on login, logout and session
 * expiry so every sign-in starts at the chooser.
 */
export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      business: null,
      setBusiness: (business) => set({ business }),
      clearBusiness: () => set({ business: null }),
    }),
    { name: 'ge-business', version: 1 },
  ),
)

/**
 * The business the component's branch works in: the console's choice for the
 * admin, the member's own account for the portal. The two never mix — the
 * admin's choice must not leak into the portal.
 */
export function useActiveBusiness(): Business {
  const scope = useAuthScope()
  const adminBusiness = useBusinessStore((state) => state.business)
  const memberBusiness = useStore(authStoreFor('associate'), (state) => state.user?.business)
  return (scope === 'admin' ? adminBusiness : memberBusiness) ?? 't1'
}

/**
 * Header for code outside React (fetch client, file downloads). The API holds
 * members to their own business whatever this says; sending it keeps the
 * portal's requests honest about where they go.
 */
export function businessHeaders(): Record<string, string> {
  const business =
    scopeFromPath(window.location.pathname) === 'admin'
      ? useBusinessStore.getState().business
      : authStoreFor('associate').getState().user?.business
  return business ? { 'X-Business': business } : {}
}
