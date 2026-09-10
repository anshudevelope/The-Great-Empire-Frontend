import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types/auth'

interface ProtectedRouteProps {
  /** Restrict this branch to one role. Omit to allow any signed-in user. */
  role?: UserRole
  /**
   * Which login page to bounce to. Defaults to the associate portal, since
   * that's who most signed-out visitors are — the admin branch overrides it so
   * staff aren't sent to a member-facing screen.
   */
  loginPath?: string
}

export function ProtectedRoute({ role, loginPath = '/associate/login' }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (role && user?.role !== role) {
    // Send people to their own side of the app rather than showing a dead end.
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/portal/dashboard'} replace />
  }

  return <Outlet />
}
