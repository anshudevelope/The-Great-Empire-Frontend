import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Business } from '@/lib/business'
import { useBusinessStore } from '@/store/businessStore'

/**
 * Opens a business. The cache is dropped because every cached list belongs to
 * the business it was fetched in; AdminLayout remounts the page by business
 * key, so nothing still on screen keeps the old data. Always lands on the
 * dashboard — an id open in one business doesn't exist in the other.
 */
export function useSwitchBusiness() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setBusiness = useBusinessStore((state) => state.setBusiness)

  return (business: Business) => {
    const switching = useBusinessStore.getState().business !== null
    // From inside the console, leave the current page first, synchronously:
    // otherwise the business flips while it is still mounted and it refetches
    // its id in the other business, where that id doesn't exist. From the
    // chooser there is no page to leave — and the dashboard would bounce back
    // to the chooser while no business is set yet.
    if (switching) void navigate('/admin/dashboard', { replace: true, flushSync: true })
    setBusiness(business)
    queryClient.clear()
    if (!switching) void navigate('/admin/dashboard', { replace: true })
  }
}
