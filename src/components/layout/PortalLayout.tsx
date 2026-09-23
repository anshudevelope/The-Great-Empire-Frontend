import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReferralSummary } from '@/api/referrals'
import { fetchPendingPlacement } from '@/api/associates'
import { useCompanyBrand } from '@/api/company'
import { useAuthStore } from '@/store/authStore'
import { BuildingIcon, LogoutIcon } from '@/components/icons/icons'
import { ChangePasswordModal } from '@/features/auth/ChangePasswordModal'
import { ProfileMenu } from './ProfileMenu'
import { PortalSidebarNav } from './PortalSidebar'
import { ThemeToggle } from './ThemeToggle'

export function PortalLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const company = useCompanyBrand()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)

  // Shared by the sidebar's Log out and the profile menu.
  const signOut = () => {
    logout()
    navigate('/associate/login', { replace: true })
  }

  // Drive the badges on My Referrals and Place Members.
  const { data: summary } = useQuery({ queryKey: ['referral-summary'], queryFn: fetchReferralSummary })
  const unread = summary?.data.unread ?? 0

  const { data: pending } = useQuery({ queryKey: ['pending-placement'], queryFn: fetchPendingPlacement })
  const waiting = pending?.count ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Same solid chrome as the admin panel — one visual language per product. */}
      <aside className="hidden w-60 shrink-0 flex-col bg-chrome md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-chrome-active text-on-chrome">
            <BuildingIcon className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="truncate text-[14px] font-semibold tracking-tight text-on-chrome">{company.name}</p>
            <p className="text-[11px] text-on-chrome-subtle">Associate Portal</p>
          </div>
        </div>

        <PortalSidebarNav counts={{ unread, waiting }} />

        {/* Pinned to the bottom, as in most CRMs. Also in the profile menu. */}
        <div className="p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-on-chrome-muted transition-colors hover:bg-chrome-hover hover:text-on-chrome-danger"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between bg-chrome px-4 md:px-6">
          <div className="md:hidden">
            <p className="text-sm font-semibold text-on-chrome">{company.name}</p>
            <p className="font-mono text-[11px] text-on-chrome-subtle">{user?.memberCode}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <ProfileMenu
              name={user?.fullName ?? 'Associate'}
              subtitle={user?.memberCode}
              onChrome
              onChangePassword={() => setChangingPassword(true)}
              onLogout={signOut}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* A popup over the current page — mounted only while open, so the form starts empty. */}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
