import { Link } from 'react-router-dom'
import { useAssociates } from '@/features/associates/hooks'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { PlusIcon, UsersIcon } from '@/components/icons/icons'

const STAT_CONFIG = [
  { key: 'total', label: 'Total Associates', tone: 'bg-navy-900 text-white' },
  { key: 'pending', label: 'Pending Approval', tone: 'bg-warning-bg text-warning' },
  { key: 'approved', label: 'Approved', tone: 'bg-success-bg text-success' },
  { key: 'rejected', label: 'Rejected', tone: 'bg-danger-bg text-danger' },
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

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-navy-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CONFIG.map((stat) => (
            <div key={stat.key} className="rounded-card border border-border bg-white p-5 shadow-card">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${stat.tone}`}>
                <UsersIcon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-text">{counts[stat.key]}</p>
              <p className="mt-1 text-sm text-text-subtle">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

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
