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
    ],
  },
]

function SidebarContent() {
  const location = useLocation()
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    Associates: location.pathname.startsWith('/admin/associates'),
  }))

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon

        if (!item.children) {
          return (
            <NavLink
              key={item.label}
              to={item.to ?? '/admin/dashboard'}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
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
                'flex w-full cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors',
                isGroupActive ? 'text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDownIcon className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
            </button>
            {isExpanded && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-navy-700 pl-4">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      cn(
                        'rounded-control px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-navy-800 text-white' : 'text-navy-300 hover:bg-navy-800/60 hover:text-white',
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

export function Sidebar() {
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen)
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 md:flex">
        <div className="flex h-16 items-center gap-2 px-5 text-white">
          <BuildingIcon className="h-6 w-6 text-navy-200" />
          <span className="text-[15px] font-semibold tracking-tight">Great Empire</span>
        </div>
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={closeMobileSidebar} aria-hidden="true" />
          <aside className="relative flex h-full w-64 animate-fade-in flex-col bg-navy-950">
            <div className="flex h-16 items-center justify-between px-5 text-white">
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-6 w-6 text-navy-200" />
                <span className="text-[15px] font-semibold tracking-tight">Great Empire</span>
              </div>
              <Tooltip label="Close menu" side="bottom">
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  aria-label="Close menu"
                  className="cursor-pointer p-1 text-navy-200 hover:text-white"
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
