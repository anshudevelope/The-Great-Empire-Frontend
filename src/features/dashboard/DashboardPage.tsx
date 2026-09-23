import { Link } from 'react-router-dom'
import { useAssociates } from '@/features/associates/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { QuickActions, type QuickAction } from '@/components/ui/QuickActions'
import {
  CheckIcon,
  ClockIcon,
  InvoiceIcon,
  PayoutIcon,
  PlusIcon,
  ReportIcon,
  TreeIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons/icons'

/**
 * Shortcuts into the sections an admin works in, in sidebar order. Dashboard
 * itself is omitted — it is the page you are already on.
 *
 * Mostly one per sidebar group, plus the two sub-pages that are destinations in
 * their own right rather than a filtered view of a list: the tree, and creating
 * a payout.
 */
const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: 'All Associates', to: '/admin/associates', icon: UsersIcon },
  { label: 'Tree View', to: '/admin/associates/tree', icon: TreeIcon },
  { label: 'All Invoices', to: '/admin/invoices', icon: InvoiceIcon },
  { label: 'All Payouts', to: '/admin/payouts', icon: PayoutIcon },
  { label: 'Create Payout', to: '/admin/payouts/generate', icon: PlusIcon },
  { label: 'Downline Report', to: '/admin/reports/downline', icon: ReportIcon },
] as const

// Soft tinted tiles rather than one solid-filled card: a saturated tile fights
// the navy chrome, and tinting all four keeps the row reading as one set.
const STAT_CONFIG = [
  { key: 'total', label: 'Total Associates', icon: UsersIcon, tone: 'bg-info-bg text-info' },
  { key: 'pending', label: 'Pending Approval', icon: ClockIcon, tone: 'bg-warning-bg text-warning' },
  { key: 'approved', label: 'Approved', icon: CheckIcon, tone: 'bg-success-bg text-success' },
  { key: 'rejected', label: 'Rejected', icon: XIcon, tone: 'bg-danger-bg text-danger' },
] as const

export function DashboardPage() {
  const { data, isLoading } = useAssociates({})

  const associates = data?.data ?? []
  const counts = {
    total: associates.length,
    pending: associates.filter((associate) => associate.status === 'pending').length,
    approved: associates.filter((associate) => associate.status === 'approved').length,
    rejected: associates.filter((associate) => associate.status === 'rejected').length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-subtle">Overview of your associate network</p>
        </div>
        <Link to="/admin/associates/register">
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>Register Associate</Button>
        </Link>
      </div>

      {/* Outside the loading gate on purpose — these go somewhere regardless of
          what the figures below say, so there is no reason to withhold them
          while the query is still in flight. */}
      <QuickActions actions={QUICK_ACTIONS} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy={isLoading}>
        {isLoading
          ? // Same card shell as the real stats, so nothing shifts when the
            // numbers arrive.
            STAT_CONFIG.map((stat) => (
              <div key={stat.key} className="rounded-card bg-surface p-5 shadow-card">
                <Skeleton className="mb-4 h-10 w-10 rounded-lg" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))
          : STAT_CONFIG.map((stat) => (
              <div
                key={stat.key}
                className="group rounded-card bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-text">{counts[stat.key]}</p>
                <p className="mt-1 text-sm text-text-subtle">{stat.label}</p>
              </div>
            ))}
      </div>

    </div>
  )
}
