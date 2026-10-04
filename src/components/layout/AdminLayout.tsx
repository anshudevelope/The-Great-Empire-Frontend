import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useBusinessStore } from '@/store/businessStore'
import { useCompanyBrand } from '@/api/company'
import { BUSINESSES } from '@/lib/business'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AdminLayout() {
  const logout = useAuthStore((state) => state.logout)
  const business = useBusinessStore((state) => state.business)
  const clearBusiness = useBusinessStore((state) => state.clearBusiness)
  const company = useCompanyBrand()

  // The tab says which business is open, so two tabs can't be confused; the
  // plain title comes back when the console unmounts (logout, chooser).
  useEffect(() => {
    if (!business) return
    const previous = document.title
    document.title = `${BUSINESSES[business].code} · ${company.name}`
    return () => {
      document.title = previous
    }
  }, [business, company.name])
  const navigate = useNavigate()
  // Shared by the sidebar footer and the topbar profile menu, so both go
  // through the same confirmation.
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleLogout() {
    logout()
    clearBusiness()
    setConfirmOpen(false)
    toast.success('Signed out successfully')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar onLogout={() => setConfirmOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onLogout={() => setConfirmOpen(true)} />
        {/* Keyed by business: switching remounts the page, so no query or
            local state from the other business survives on screen. */}
        <main key={business} className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Log out of admin panel?"
        description="You'll need to sign in again to access the dashboard and associate records."
        confirmLabel="Log out"
        tone="danger"
        onConfirm={handleLogout}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
