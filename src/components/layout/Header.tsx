import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Tooltip } from '@/components/ui/Tooltip'
import { LogoutIcon, MenuIcon } from '@/components/icons/icons'

function getInitials(name: string | null): string {
  if (!name) return 'A'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'A'
}

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const openMobileSidebar = useUIStore((state) => state.openMobileSidebar)
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleLogout() {
    logout()
    setConfirmOpen(false)
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-white/80 px-4 shadow-xs backdrop-blur-sm md:px-6">
      <Tooltip label="Open menu" side="bottom">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open menu"
          className="cursor-pointer rounded-control p-2 text-text-muted hover:bg-blue-50 md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </Tooltip>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2.5 border-r border-border pr-4 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-700 to-blue-900 text-xs font-semibold text-white">
            {getInitials(user?.fullName ?? null)}
          </div>
          <span className="text-sm font-medium text-text">{user?.fullName ?? 'Admin'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/change-password')}>
          Password
        </Button>
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
