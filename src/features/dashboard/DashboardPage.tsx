import { Link } from 'react-router-dom'
import { useAssociates } from '@/features/associates/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { CheckIcon, ClockIcon, PlusIcon, UsersIcon, XIcon } from '@/components/icons/icons'

const STAT_CONFIG = [
  { key: 'total', label: 'Total Associates', icon: UsersIcon, tone: 'bg-blue-600 text-white' },
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy={isLoading}>
        {isLoading
          ? // Same card shell as the real stats, so nothing shifts when the
            // numbers arrive.
            STAT_CONFIG.map((stat) => (
              <div key={stat.key} className="rounded-card border border-border bg-white p-5 shadow-card">
                <Skeleton className="mb-4 h-10 w-10 rounded-lg" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))
          : STAT_CONFIG.map((stat) => (
              <div
                key={stat.key}
                className="group rounded-card border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-text">{counts[stat.key]}</p>
                <p className="mt-1 text-sm text-text-subtle">{stat.label}</p>
              </div>
            ))}
      </div>

      <div className="rounded-card border border-border bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-text">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/admin/associates">
            <Button variant="secondary" leftIcon={<UsersIcon className="h-4 w-4" />}>
              View all associates
            </Button>
          </Link>
          <Link to="/admin/associates/register">
            <Button variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />}>
              Register new associate
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
