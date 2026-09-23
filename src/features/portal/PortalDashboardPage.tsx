import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReferralSummary } from '@/api/referrals'
import { fetchPendingPlacement } from '@/api/associates'
import { fetchLevelsReport } from '@/api/reports'
import { fetchMyCommissionSummary } from '@/api/commissions'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  BusinessIcon,
  ChevronRightIcon,
  EarningsIcon,
  RewardsIcon,
  TreeIcon,
} from '@/components/icons/icons'
import { formatTier } from '@/lib/tier'
import { formatShortDate } from '@/lib/datetime'

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

/**
 * One shortcut per sidebar group, pointing at that group's main page — the
 * sections a member actually works in, reachable without opening a dropdown.
 *
 * Deliberately not a copy of the whole menu: the sidebar is still the complete
 * index, and repeating every child here would make both harder to scan.
 */
const QUICK_ACTIONS = [
  { label: 'My Referrals', to: '/portal/referrals', icon: BusinessIcon },
  { label: 'My Tree', to: '/portal/tree', icon: TreeIcon },
  { label: 'My Income', to: '/portal/income', icon: EarningsIcon },
  { label: 'Rewards', to: '/portal/rewards/tier-1', icon: RewardsIcon },
] as const

/** Two decimals for anything that is actually payable. */
const money2 = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function PortalDashboardPage() {
  const user = useAuthStore((state) => state.user)

  const summary = useQuery({ queryKey: ['referral-summary'], queryFn: fetchReferralSummary })
  const levels = useQuery({ queryKey: ['levels'], queryFn: () => fetchLevelsReport() })
  const income = useQuery({ queryKey: ['commissions', 'me', 'summary'], queryFn: fetchMyCommissionSummary })
  const pending = useQuery({ queryKey: ['pending-placement'], queryFn: fetchPendingPlacement })
  const waiting = pending.data?.count ?? 0

  const loading = summary.isLoading || levels.isLoading || income.isLoading
  const earnings = income.data?.data

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Welcome, {user?.fullName.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-text-subtle">
            <span className="font-mono">{user?.memberCode}</span> · {formatTier(user?.tier)}
          </p>
        </div>
        {waiting > 0 && (
          <Link to="/portal/place-members">
            <Button>Place members ({waiting})</Button>
          </Link>
        )}
      </header>

      {/* Outside the loading gate on purpose — these go somewhere regardless of
          what the figures below say, so there is no reason to withhold them
          while the queries are still in flight. */}
      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group inline-flex items-center gap-2 rounded-pill bg-surface py-2 pl-3 pr-4 text-sm font-medium text-text-muted shadow-card transition-all hover:text-text hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info-bg text-info">
              <action.icon className="h-3.5 w-3.5" />
            </span>
            {action.label}
          </Link>
        ))}
      </nav>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Waiting to be placed"
              value={String(waiting)}
              hint={summary.data ? `${money(summary.data.data.unusedAmount)} paid` : undefined}
              accent
              to="/portal/place-members"
              linkLabel="Place members"
            />
            <Stat
              label="Members placed"
              value={String(summary.data?.data.used ?? 0)}
              hint="Referrals placed in your tree"
              to="/portal/referrals"
              linkLabel="View referrals"
            />
            <Stat
              label="Total downline"
              value={String(levels.data?.totals.members ?? 0)}
              hint="Everyone below you"
              to="/portal/downline"
              linkLabel="View downline"
            />
            <Stat
              label="Active members"
              value={String(levels.data?.totals.active ?? 0)}
              hint="Approved status"
              to="/portal/downline"
              linkLabel="View downline"
            />
            {/* The date is today's: realtime income is computed live on every
                request, so there is no server-side cutoff to report and no
                reason to ask the API for a date the browser already has. */}
            <Stat
              label="Realtime income"
              value={money2(earnings?.totalIncome ?? 0)}
              hint={`Till ${formatShortDate(new Date().toISOString())}`}
              tone="success"
              to="/portal/income"
              linkLabel="View income"
            />
          </div>

          {/* <section className="rounded-card bg-surface p-6">
            <h2 className="mb-4 text-sm font-semibold text-text">Members by level</h2>
            {levels.data && levels.data.data.length > 0 ? (
              <div className="flex flex-col gap-2">
                {levels.data.data.map((row) => (
                  <div key={row.level} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-text-subtle">Level {row.level}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-hover">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{
                          width: `${(row.total / Math.max(...levels.data.data.map((r) => r.total))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium text-text">{row.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-subtle">No downline members yet.</p>
            )}
          </section> */}
        </>
      )}
    </div>
  )
}

/**
 * A figure plus the page that figure comes from.
 *
 * The whole tile is the link — a card that reads as clickable but only responds
 * on a small piece of text is a worse target than one big one. The "View …" row
 * stays because the hover state alone never tells you *where* the tile goes, and
 * on touch there is no hover at all.
 */
function Stat({
  label,
  value,
  hint,
  accent,
  tone,
  to,
  linkLabel,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  /** Money reads green. Same tile, only the figure changes colour. */
  tone?: 'success'
  /** The section this figure is drawn from. */
  to: string
  linkLabel: string
}) {
  const valueClass =
    tone === 'success'
      ? 'mt-1 text-2xl font-semibold tabular-nums text-success'
      : accent
        ? 'mt-1 text-2xl font-semibold text-info'
        : 'mt-1 text-2xl font-semibold text-text'

  return (
    <Link
      to={to}
      // flex + h-full so the link row sits on the baseline of every tile in the
      // row, whatever height the tallest one ends up being.
      className="group flex h-full flex-col rounded-card bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={valueClass}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-subtle">{hint}</p>}
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-info transition-colors group-hover:text-blue-600">
        {linkLabel}
        <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}


