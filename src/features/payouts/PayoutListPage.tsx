import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPayouts } from '@/api/payouts'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatShortDate } from '@/lib/datetime'
import { StatusPill, money } from './payoutBits'

const day = (value?: string | null) => formatShortDate(value ?? undefined)

/** Previous payouts — every closing the company has run. */
export function PayoutListPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['payouts', 'list', status, page],
    queryFn: () => fetchPayouts({ status: status || undefined, page: String(page), limit: '25' }),
  })

  const rows = data?.data ?? []

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Payouts</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Every closing, with what was paid and what was deducted.
          </p>
        </div>
        <Link to="/admin/payouts/generate">
          <Button>Create payout</Button>
        </Link>
      </header>

      <div className="mb-4">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          containerClassName="w-44"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Create one to close the books for the current period and pay everyone what they have earned."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card bg-surface">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 text-right font-semibold">Members</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross</th>
                  <th className="px-4 py-3 text-right font-semibold">Deductions</th>
                  <th className="px-4 py-3 text-right font-semibold">Net paid</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((batch) => (
                  <tr key={batch._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/payouts/${batch._id}`}
                        className="font-mono text-xs font-medium text-info hover:underline"
                      >
                        {batch.batchNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {day(batch.periodStart)} → {day(batch.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">{batch.totals.members}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">{money(batch.totals.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-subtle">
                      −{money(batch.totals.adminCharge + batch.totals.secondaryCharge)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-text">
                      {money(batch.totals.netPayable)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/payouts/${batch._id}`}>
                        {/* A draft still needs finalizing or discarding, so it gets
                            a label that says there is something to do. */}
                        <Button size="sm" variant={batch.status === 'draft' ? 'secondary' : 'ghost'}>
                          {batch.status === 'draft' ? 'Review' : 'View'}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data?.pagination.pages ?? 1) > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-text-subtle">
              <span>
                Page {data?.pagination.page} of {data?.pagination.pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= (data?.pagination.pages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
