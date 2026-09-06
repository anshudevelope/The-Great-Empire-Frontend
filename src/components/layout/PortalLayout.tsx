import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReferralSummary } from '@/api/referrals'
import { useCompanyBrand } from '@/api/company'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'
import { BuildingIcon } from '@/components/icons/icons'
import { Button } from '@/components/ui/Button'

const NAV = [
  { label: 'Dashboard', to: '/portal/dashboard' },
  { label: 'My Referrals', to: '/portal/referrals' },
  { label: 'My Invoices', to: '/portal/invoices' },
  { label: 'Add Member', to: '/portal/add-member' },
  { label: 'My Tree', to: '/portal/tree' },
  { label: 'My Directs', to: '/portal/directs' },
  { label: 'Downline', to: '/portal/downline' },
]

export function PortalLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const company = useCompanyBrand()
  const navigate = useNavigate()

  // Drives the unread badge on My Referrals.
  const { data: summary } = useQuery({ queryKey: ['referral-summary'], queryFn: fetchReferralSummary })
  const unread = summary?.data.unread ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-blue-800 text-white">
            <BuildingIcon className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="truncate text-[14px] font-semibold tracking-tight text-text">{company.name}</p>
            <p className="text-[11px] text-text-subtle">Associate Portal</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
                )
              }
            >
              {item.label}
              {item.to === '/portal/referrals' && unread > 0 && (
                <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="px-2 text-xs font-medium text-text">{user?.fullName}</p>
          <p className="px-2 pb-2 font-mono text-[11px] text-text-subtle">{user?.memberCode}</p>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
          <div className="md:hidden">
            <p className="text-sm font-semibold text-text">{company.name}</p>
            <p className="font-mono text-[11px] text-text-subtle">{user?.memberCode}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <NavLink to="/change-password" className="text-sm text-text-muted hover:text-text">
              Change password
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
