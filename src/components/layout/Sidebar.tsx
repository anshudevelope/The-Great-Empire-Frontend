import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/store/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { BuildingIcon, ChevronDownIcon, DashboardIcon, UsersIcon, XIcon } from '@/components/icons/icons'

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
  {
    label: 'Referrals',
    icon: UsersIcon,
    children: [
      { label: 'Invoices', to: '/admin/referrals' },
      { label: 'Generate', to: '/admin/referrals/generate' },
    ],
  },
  {
    label: 'Reports',
    icon: DashboardIcon,
    children: [{ label: 'Downline', to: '/admin/reports/downline' }],
  },
]

function NavIconTile({ icon: Icon, active }: { icon: typeof DashboardIcon; active: boolean }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-blue-600 text-white' : 'bg-neutral-hover text-text-subtle group-hover:text-blue-600',
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
    <nav className="scrollbar-thin flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">Menu</p>
      {NAV_ITEMS.map((item) => {
        if (!item.children) {
          return (
            <NavLink
              key={item.label}
              to={item.to ?? '/admin/dashboard'}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
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
                'group flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                isGroupActive ? 'text-blue-700' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
              )}
            >
              <NavIconTile icon={item.icon} active={isGroupActive} />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDownIcon
                className={cn('h-4 w-4 text-text-subtle transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
            {isExpanded && (
              <div className="ml-[1.15rem] mt-1 flex flex-col gap-0.5 border-l border-border pl-6">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      cn(
                        'rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-text-muted hover:bg-neutral-hover hover:text-text',
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
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-xs">
        <BuildingIcon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[14px] font-semibold tracking-tight text-text">Great Empire</p>
        <p className="text-[11px] text-text-subtle">Admin Console</p>
      </div>
    </div>
  )
}

export function Sidebar() {
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen)
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <SidebarBrand />
        </div>
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-text/40 backdrop-blur-[2px]" onClick={closeMobileSidebar} aria-hidden="true" />
          <aside className="relative flex h-full w-64 animate-fade-in flex-col bg-white shadow-popover">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <SidebarBrand />
              <Tooltip label="Close menu" side="bottom">
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  aria-label="Close menu"
                  className="cursor-pointer rounded-lg p-1.5 text-text-muted hover:bg-neutral-hover hover:text-text"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
