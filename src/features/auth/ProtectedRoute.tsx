import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types/auth'

interface ProtectedRouteProps {
  /** Restrict this branch to one role. Omit to allow any signed-in user. */
  role?: UserRole
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // The API refuses every other route until the temporary password is
  // replaced, so there is nothing useful to render anywhere else.
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (role && user?.role !== role) {
    // Send people to their own side of the app rather than showing a dead end.
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/portal/dashboard'} replace />
  }

  return <Outlet />
}
