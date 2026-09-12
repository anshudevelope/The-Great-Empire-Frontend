import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDirects } from '@/api/tree'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTier } from '@/lib/tier'

/**
 * "My Directs" — everyone registered under this member's referral.
 *
 * The point of the `Placed under` column: a direct is not necessarily your own
 * child in the binary tree — you may have placed them deeper. Directs not in
 * the tree yet are listed too, with a shortcut to place them.
 */
export function DirectsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['directs'], queryFn: () => fetchDirects() })
  const rows = data?.data ?? []
  const waiting = rows.filter((row) => row.treeStatus === 'unplaced').length

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">My directs</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Associates registered under your referral — {rows.length} in total
          {waiting > 0 && (
            <>
              , {waiting} not placed yet.{' '}
              <Link to="/portal/place-members" className="font-medium text-blue-700 hover:underline">
                Place them →
              </Link>
            </>
          )}
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No directs yet"
          description="Associates the admin registers under you will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Placed under</th>
                <th className="px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const unplaced = row.treeStatus === 'unplaced'
                return (
                  <tr key={row._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                    <td className="px-4 py-3 font-mono text-xs text-text">{row.memberCode}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text">{row.fullName}</span>
                      <span className="block text-xs text-text-subtle">{row.email}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatTier(row.tier)}</td>
                    <td className="px-4 py-3">
                      {unplaced ? (
                        <Link
                          to="/portal/place-members"
                          className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning hover:underline"
                        >
                          Not placed — place now
                        </Link>
                      ) : (
                        <>
                          <span className="font-mono text-xs text-text-muted">{row.placedUnder?.memberCode ?? '—'}</span>
                          {row.isSpillover && (
                            <span className="ml-1.5 rounded-full bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info">
                              deeper
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{unplaced ? '—' : row.depth}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === 'approved' ? 'success' : 'warning'}>{row.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
