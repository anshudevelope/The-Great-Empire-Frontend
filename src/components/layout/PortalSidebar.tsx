import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  BusinessIcon,
  ChevronDownIcon,
  DashboardIcon,
  EarningsIcon,
  RewardsIcon,
  UsersIcon,
} from '@/components/icons/icons'

/** Live counts shown as pills. Keyed so the nav config can name one without knowing where it comes from. */
export type BadgeKey = 'unread' | 'waiting'

/**
 * Both tones are lifted for the solid blue chrome: the old `bg-warning` is a
 * dark amber that muddies against it, and a mid-blue pill would disappear.
 */
const BADGE_STYLE: Record<BadgeKey, string> = {
  // Literal white, not `bg-surface` — these pills sit on the chrome, which stays
  // the same colour in both themes, so they must not follow the canvas.
  unread: 'bg-white text-chrome',
  waiting: 'bg-[#f5b54a] text-blue-950',
}

interface NavLeaf {
  label: string
  to: string
  badge?: BadgeKey
}

interface NavGroup {
  label: string
  /** Only top-level entries carry an icon, exactly as in the admin sidebar. */
  icon: typeof DashboardIcon
  items: NavLeaf[]
}

/** A top-level leaf needs an icon too — only a group's children go without. */
type NavRoot = NavLeaf & { icon: typeof DashboardIcon }

type NavEntry = NavRoot | NavGroup

/**
 * The whole portal menu. Add, move or regroup a page here — nothing else
 * needs to change. A group opens on hover, stays open once clicked, and is
 * always open while you are on one of its pages.
 */
const NAV: NavEntry[] = [
  { label: 'Dashboard', to: '/portal/dashboard', icon: DashboardIcon },
  {
    label: 'Business',
    icon: BusinessIcon,
    items: [
      { label: 'My Referrals', to: '/portal/referrals', badge: 'unread' },
      { label: 'My Invoices', to: '/portal/invoices' },
    ],
  },
  {
    label: 'Team',
    icon: UsersIcon,
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
    icon: EarningsIcon,
    items: [
      { label: 'My Income', to: '/portal/income' },
      { label: 'My Payouts', to: '/portal/payouts' },
    ],
  },
  {
    label: 'Rewards',
    icon: RewardsIcon,
    // One entry per tier as each tier's plan is added.
    items: [{ label: 'Tier I (Insurance)', to: '/portal/rewards/tier-1' }],
  },
]

const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry

/**
 * Same treatment as the admin sidebar's NavIconTile: no tile behind the glyph,
 * just the row's own colour, so both sidebars read as one design.
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

function Badge({ kind, count }: { kind: BadgeKey; count: number }) {
  if (count <= 0) return null
  return (
    <span className={cn('ml-2 rounded-pill px-1.5 py-0.5 text-[10px] font-semibold', BADGE_STYLE[kind])}>
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
    <nav className="scrollbar-chrome flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV.map((entry) => {
        if (!isGroup(entry)) {
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-control py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-chrome-selected text-on-chrome shadow-chrome-selected'
                    : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIconTile icon={entry.icon} active={isActive} />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {entry.badge && <Badge kind={entry.badge} count={counts[entry.badge]} />}
                </>
              )}
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
                'group flex w-full cursor-pointer items-center gap-3 rounded-control py-2 pl-3 pr-3 text-sm font-medium transition-colors',
                active ? 'text-on-chrome' : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
              )}
            >
              <NavIconTile icon={entry.icon} active={active} />
              <span className="flex-1 text-left">{entry.label}</span>
              {!open && hidden.map((item) => <Badge key={item.to} kind={item.badge!} count={counts[item.badge!]} />)}
              <ChevronDownIcon
                className={cn('ml-2 h-4 w-4 text-on-chrome-subtle transition-transform', open && 'rotate-180')}
              />
            </button>
            {open && (
              // Same indent as the admin sidebar, so children line up under the
              // label rather than under the icon.
              <div className="ml-[1.15rem] mt-1 flex flex-col gap-0.5 pl-6">
                {entry.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-control px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-chrome-selected font-medium text-on-chrome shadow-chrome-selected'
                          : 'text-on-chrome-muted hover:bg-chrome-hover hover:text-on-chrome',
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
