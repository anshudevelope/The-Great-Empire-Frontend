import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { MenuIcon } from '@/components/icons/icons'
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal'
import { ProfileMenu } from './ProfileMenu'

interface HeaderProps {
  /** Opens the confirmation owned by AdminLayout — the sidebar shares it. */
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const user = useAuthStore((state) => state.user)
  const openMobileSidebar = useUIStore((state) => state.openMobileSidebar)
  const [changingPassword, setChangingPassword] = useState(false)

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
        <ProfileMenu
          name={user?.fullName ?? 'Admin'}
          subtitle={user?.email}
          monoSubtitle={false}
          onChangePassword={() => setChangingPassword(true)}
          onLogout={onLogout}
        />
      </div>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </header>
  )
}
