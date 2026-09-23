import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useCompanyBrand } from '@/api/company'
import { useUIStore } from '@/store/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  BuildingIcon,
  ChevronDownIcon,
  DashboardIcon,
  InvoiceIcon,
  LogoutIcon,
  PayoutIcon,
  ReportIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons/icons'

interface NavChild {
  label: string
  to: string
}

interface NavItem {
  label: string
  to?: string
  icon: typeof DashboardIcon
  children?: NavChild[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: DashboardIcon },
  {
    label: 'Associates',
    icon: UsersIcon,
    children: [
      { label: 'All Associates', to: '/admin/associates' },
      { label: 'Register', to: '/admin/associates/register' },
      { label: 'Tree View', to: '/admin/associates/tree' },
    ],
  },
  // {
  //   label: 'Referrals',
  //   icon: UsersIcon,
  //   children: [
  //     { label: 'All Referrals', to: '/admin/referrals' },
  //     { label: 'Generate', to: '/admin/referrals/generate' },
  //   ],
  // },
  {
    label: 'Invoices',
    icon: InvoiceIcon,
    children: [{ label: 'All Invoices', to: '/admin/invoices' }],
  },
  {
    label: 'Payouts',
    icon: PayoutIcon,
    children: [
      { label: 'All Payouts', to: '/admin/payouts' },
      { label: 'Create Payout', to: '/admin/payouts/generate' },
    ],
  },
  {
    label: 'Reports',
    icon: ReportIcon,
    children: [{ label: 'Downline', to: '/admin/reports/downline' }],
  },
]

/**
 * On the solid chrome the icon carries no tile of its own — a filled square
 * behind each icon reads as damage against the blue, and the row's own hover
 * and active fills already do that job. The icon just follows the row's colour.
 */
function NavIconTile({ icon: Icon, active }: { icon: typeof DashboardIcon; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center transition-colors',
        active ? 'text-on-chrome' : 'text-on-chrome-muted group-hover:text-on-chrome',
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

function SidebarContent() {
  const location = useLocation()
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    Associates: location.pathname.startsWith('/admin/associates'),
  }))

  return (
    <nav className="scrollbar-chrome flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-on-chrome-subtle">Menu</p>
      {NAV_ITEMS.map((item) => {
        if (!item.children) {
          return (
            <NavLink
              key={item.label}
              to={item.to ?? '/admin/dashboard'}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-control py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                  // The current page is a lifted accent tile. A brighter fill
                  // plus its own shadow separates it from the chrome far more
                  // cleanly than a white indicator rule did.
                  isActive
                    ? 'bg-chrome-selected text-on-chrome shadow-chrome-selected'
                    : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIconTile icon={item.icon} active={isActive} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        }

        const isGroupActive = item.children.some((child) => location.pathname.startsWith(child.to))
        const isExpanded = expanded[item.label] ?? isGroupActive

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [item.label]: !isExpanded }))}
              className={cn(
                'group flex w-full cursor-pointer items-center gap-3 rounded-control py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                isGroupActive
                  ? 'text-on-chrome'
                  : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
              )}
            >
              <NavIconTile icon={item.icon} active={isGroupActive} />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDownIcon
                className={cn('h-4 w-4 text-on-chrome-subtle transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
            {isExpanded && (
              // Indentation alone groups the children — the rail was one more line.
              <div className="ml-[1.15rem] mt-1 flex flex-col gap-0.5 pl-6">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      cn(
                        'rounded-control px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-chrome-selected font-medium text-on-chrome shadow-chrome-selected'
                          : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
                      )
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBrand() {
  // Name comes from the server's data/company.json — one file renames the app.
  const company = useCompanyBrand()

  return (
    <div className="flex items-center gap-2.5">
      {/* A white-on-blue tile: the old blue gradient is invisible on the chrome. */}
      <div className="flex h-8 w-8 items-center justify-center rounded-control bg-chrome-active text-on-chrome">
        <BuildingIcon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="truncate text-[14px] font-semibold tracking-tight text-on-chrome">{company.name}</p>
        <p className="text-[11px] text-on-chrome-subtle">Admin Console</p>
      </div>
    </div>
  )
}

/** Pinned to the bottom, as in the associate portal. Also in the profile menu. */
function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)

  return (
    // No top rule — the nav's own scroll area and this block's padding are the
    // separation.
    <div className="p-3">
      <button
        type="button"
        onClick={() => {
          closeMobileSidebar()
          onLogout()
        }}
        // danger-bg is a pale pink that disappears on the chrome, so the warning
        // is carried by the label colour over a neutral white overlay instead.
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-on-chrome-muted transition-colors hover:bg-chrome-hover hover:text-on-chrome-danger"
      >
        <LogoutIcon className="h-4 w-4" />
        Log out
      </button>
    </div>
  )
}

interface SidebarProps {
  /** Opens the confirmation owned by AdminLayout — the topbar shares it. */
  onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen)
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)

  return (
    <>
      {/* No right border: the sidebar and topbar are one continuous blue frame,
          and the canvas edge is separation enough. */}
      <aside className="hidden w-64 shrink-0 flex-col bg-chrome md:flex">
        <div className="flex h-16 items-center px-5">
          <SidebarBrand />
        </div>
        <SidebarContent />
        <SidebarFooter onLogout={onLogout} />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={closeMobileSidebar} aria-hidden="true" />
          <aside className="relative flex h-full w-64 animate-fade-in flex-col bg-chrome shadow-popover">
            <div className="flex h-16 items-center justify-between px-5">
              <SidebarBrand />
              <Tooltip label="Close menu" side="bottom">
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  aria-label="Close menu"
                  className="cursor-pointer rounded-control p-1.5 text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
            <SidebarContent />
            <SidebarFooter onLogout={onLogout} />
          </aside>
        </div>
      )}
    </>
  )
}
