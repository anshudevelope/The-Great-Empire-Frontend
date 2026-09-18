import { createContext, useContext } from 'react'

/**
 * Which of the two sessions a page belongs to.
 *
 * The admin console and the member portal are separate logins that can be
 * signed in at the same time, in the same browser. The URL is what decides
 * which one is in play — there is no "current user", only a current scope and
 * the session stored under it.
 *
 * Everything about scope lives here except the provider component, which is
 * kept apart so a file exporting both a component and these values doesn't
 * lose its Fast Refresh boundary.
 */
export type AuthScope = 'admin' | 'associate'

/**
 * The single rule, used by every consumer.
 *
 * `/admin/login` and `/admin/*` are the console. Everything else — the portal,
 * the associate login, the landing page — is the member side.
 */
export function scopeFromPath(pathname: string): AuthScope {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'associate'
}

/** Where each scope lands once signed in. */
export const homeFor = (scope: AuthScope) => (scope === 'admin' ? '/admin/dashboard' : '/portal/dashboard')

/** Where each scope sends people who aren't signed in. */
export const loginPathFor = (scope: AuthScope) => (scope === 'admin' ? '/admin/login' : '/associate/login')

export const AuthScopeContext = createContext<AuthScope | null>(null)

/** The scope of the branch this component is mounted in. */
export function useAuthScope(): AuthScope {
  const scope = useContext(AuthScopeContext)
  if (!scope) throw new Error('useAuthScope must be used inside AuthScopeProvider')
  return scope
}
