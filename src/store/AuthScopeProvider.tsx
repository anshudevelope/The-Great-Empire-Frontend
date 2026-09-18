import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AuthScopeContext, scopeFromPath } from './authScope'

/**
 * Wraps the whole router and derives the scope from the current path.
 *
 * It sits inside the router rather than above it because it needs
 * useLocation — which is also why it's a route element with an Outlet rather
 * than a plain wrapper component.
 */
export function AuthScopeProvider() {
  const { pathname } = useLocation()
  const scope = scopeFromPath(pathname)
  const queryClient = useQueryClient()
  const previous = useRef(scope)

  // One QueryClient serves both branches, so crossing between them in a single
  // tab would otherwise hand console responses to portal views (and back).
  // Dropping the cache on the way across keeps each side's data its own.
  useEffect(() => {
    if (previous.current === scope) return
    previous.current = scope
    queryClient.clear()
  }, [scope, queryClient])

  return (
    <AuthScopeContext.Provider value={scope}>
      <Outlet />
    </AuthScopeContext.Provider>
  )
}
