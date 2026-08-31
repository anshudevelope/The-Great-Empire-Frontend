import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Tooltip } from '@/components/ui/Tooltip'
import { LogoutIcon, MenuIcon, UserCircleIcon } from '@/components/icons/icons'

export function Header() {
  const email = useAuthStore((state) => state.email)
  const logout = useAuthStore((state) => state.logout)
  const openMobileSidebar = useUIStore((state) => state.openMobileSidebar)
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleLogout() {
    logout()
    setConfirmOpen(false)
    toast.success('Signed out successfully')
    navigate('/admin/login', { replace: true })
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
      <Tooltip label="Open menu" side="bottom">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open menu"
          className="cursor-pointer rounded-control p-2 text-text-muted hover:bg-navy-50 md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </Tooltip>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-sm text-text-muted sm:flex">
          <UserCircleIcon className="h-5 w-5 text-navy-600" />
          <span>{email ?? 'Admin'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<LogoutIcon className="h-4 w-4" />}
          onClick={() => setConfirmOpen(true)}
        >
          Logout
        </Button>
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
    </header>
  )
}
