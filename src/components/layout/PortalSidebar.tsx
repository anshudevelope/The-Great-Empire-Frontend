import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ChevronDownIcon } from '@/components/icons/icons'

/** Live counts shown as pills. Keyed so the nav config can name one without knowing where it comes from. */
export type BadgeKey = 'unread' | 'waiting'

const BADGE_STYLE: Record<BadgeKey, string> = {
  unread: 'bg-blue-600',
  waiting: 'bg-warning',
}

interface NavLeaf {
  label: string
  to: string
  badge?: BadgeKey
}

interface NavGroup {
  label: string
  items: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

/**
 * The whole portal menu. Add, move or regroup a page here — nothing else
 * needs to change. A group opens on hover, stays open once clicked, and is
 * always open while you are on one of its pages.
 */
const NAV: NavEntry[] = [
  { label: 'Dashboard', to: '/portal/dashboard' },
  {
    label: 'Business',
    items: [
      { label: 'My Referrals', to: '/portal/referrals', badge: 'unread' },
      { label: 'My Invoices', to: '/portal/invoices' },
    ],
  },
  {
    label: 'Team',
    items: [
      // The admin registers associates; the sponsor only decides where they sit.
      { label: 'Place Members', to: '/portal/place-members', badge: 'waiting' },
      { label: 'My Tree', to: '/portal/tree' },
      { label: 'My Directs', to: '/portal/directs' },
      { label: 'Downline', to: '/portal/downline' },
    ],
  },
  {
    label: 'Earnings',
    items: [
      { label: 'My Income', to: '/portal/income' },
      { label: 'My Payouts', to: '/portal/payouts' },
    ],
  },
  {
    label: 'Rewards',
    // One entry per tier as each tier's plan is added.
    items: [{ label: 'Tier I (Insurance)', to: '/portal/rewards/tier-1' }],
  },
]

const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry

function Badge({ kind, count }: { kind: BadgeKey; count: number }) {
  if (count <= 0) return null
  return (
    <span className={cn('ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white', BADGE_STYLE[kind])}>
      {count}
    </span>
  )
}

export function PortalSidebarNav({ counts }: { counts: Record<BadgeKey, number> }) {
  const { pathname } = useLocation()
  // Only groups the user has clicked are stored; the rest follow the route.
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  // Hovering peeks a group open; leaving closes it again unless it was clicked open.
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="scrollbar-thin flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV.map((entry) => {
        if (!isGroup(entry)) {
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
                )
              }
            >
              {entry.label}
              {entry.badge && <Badge kind={entry.badge} count={counts[entry.badge]} />}
            </NavLink>
          )
        }

        const active = entry.items.some((item) => pathname.startsWith(item.to))
        const pinned = toggled[entry.label] ?? active
        const open = pinned || hovered === entry.label
        // A collapsed group still surfaces what is waiting inside it.
        const hidden = entry.items.filter((item) => item.badge && counts[item.badge] > 0)

        return (
          <div
            key={entry.label}
            onMouseEnter={() => setHovered(entry.label)}
            onMouseLeave={() => setHovered((current) => (current === entry.label ? null : current))}
          >
            <button
              type="button"
              // Click pins a hover-opened group so it stays once the mouse leaves; clicking a
              // pinned one closes it now, rather than waiting for the hover to end.
              onClick={() => {
                setToggled((prev) => ({ ...prev, [entry.label]: !pinned }))
                if (pinned) setHovered(null)
              }}
              aria-expanded={open}
              className={cn(
                'flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-blue-700' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
              )}
            >
              <span className="flex-1 text-left">{entry.label}</span>
              {!open && hidden.map((item) => <Badge key={item.to} kind={item.badge!} count={counts[item.badge!]} />)}
              <ChevronDownIcon
                className={cn('ml-2 h-4 w-4 text-text-subtle transition-transform', open && 'rotate-180')}
              />
            </button>
            {open && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                {entry.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-text-muted hover:bg-neutral-hover hover:text-text',
                      )
                    }
                  >
                    {item.label}
                    {item.badge && <Badge kind={item.badge} count={counts[item.badge]} />}
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
