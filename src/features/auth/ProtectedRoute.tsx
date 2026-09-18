import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { loginPathFor, useAuthScope } from '@/store/authScope'

/**
 * Guards a branch with the session belonging to that branch.
 *
 * There is no cross-role fallback on purpose. Being signed in as an admin says
 * nothing about the portal, so a failed check sends people to this branch's
 * own login rather than bouncing them to the other side of the app.
 */
export function ProtectedRoute() {
  const scope = useAuthScope()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  // The role is checked as well as the flag: a token for the wrong role in
  // this scope's storage is a session that should never have been created.
  if (!isAuthenticated || user?.role !== scope) {
    return <Navigate to={loginPathFor(scope)} state={{ from: location }} replace />
  }

  return <Outlet />
}
