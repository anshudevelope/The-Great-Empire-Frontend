import { Navigate, Outlet } from 'react-router-dom'
import { useBusinessStore } from '@/store/businessStore'

/** The console needs a business open; without one, back to the chooser. */
export function RequireBusiness() {
  const business = useBusinessStore((state) => state.business)
  if (!business) return <Navigate to="/admin/select" replace />
  return <Outlet />
}
