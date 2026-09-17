import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyCommissions, fetchMyCommissionSummary } from '@/api/commissions'
import type { CommissionLedgerRow } from '@/api/commissions'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/datetime'

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const day = (value?: string | null) => formatShortDate(value ?? undefined)

const TYPE_LABEL: Record<CommissionLedgerRow['type'], string> = {
  direct: 'Direct referral',
  matching: 'Binary matching',
  reversal: 'Reversal',
}

const TYPE_STYLE: Record<CommissionLedgerRow['type'], string> = {
  direct: 'bg-blue-50 text-blue-700',
  matching: 'bg-success-bg text-success',
  reversal: 'bg-danger-bg text-danger',
}

/**
 * My Income — every commission row behind the member's earnings.
 *
 * Defaults to the current period, because that is the number they are chasing
 * and the one the dashboard shows. Switching to all time brings in rows already
 * paid out in an earlier closing, which is why each row carries a paid/unpaid
 * marker: without it the two views would look identical but total differently.
 */
export function MyIncomePage() {
  const [period, setPeriod] = useState<'current' | 'all'>('current')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const summary = useQuery({
    queryKey: ['commissions', 'me', 'summary'],
    queryFn: fetchMyCommissionSummary,
  })

  const ledger = useQuery({
    queryKey: ['commissions', 'me', 'ledger', period, type, page],
    queryFn: () =>
      fetchMyCommissions({
        period,
        type: type || undefined,
        page: String(page),
        limit: '50',
      }),
  })

  const s = summary.data?.data
  const rows = ledger.data?.data ?? []
  const shown = period === 'current' ? s : s?.lifetime

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">My income</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Every commission you have earned, and what produced it.
          </p>
        </div>
        <Link to="/portal/payouts">
          <Button variant="secondary">Payout history</Button>
        </Link>
      </header>

      {summary.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Direct (10%)" value={money(shown?.directIncome ?? 0)} />
            <Tile label="Matching (5%)" value={money(shown?.matchingIncome ?? 0)} />
            <Tile label={period === 'current' ? 'Realtime income' : 'Lifetime income'} value={money(shown?.totalIncome ?? 0)} accent />
            <Tile
              label="Carry waiting"
              value={money(Math.max(s?.carry.left ?? 0, s?.carry.right ?? 0))}
              hint={
                s?.carry.weakerLeg
                  ? `${s.carry.weakerLeg} leg is smaller — matching needs both sides`
                  : 'both legs level'
              }
            />
          </div>

          {period === 'current' && (
            <p className="mb-4 text-xs text-text-subtle">
              Earned since the last closing and not yet paid. This resets to zero when the company
              closes the books; what was paid before then stays under All time.
            </p>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <Select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as 'current' | 'all')
                setPage(1)
              }}
              containerClassName="w-48"
            >
              <option value="current">This period (unpaid)</option>
              <option value="all">All time</option>
            </Select>
            <Select
              value={type}
              onChange={(event) => {
                setType(event.target.value)
                setPage(1)
              }}
              containerClassName="w-48"
            >
              <option value="">All types</option>
              <option value="direct">Direct referral</option>
              <option value="matching">Binary matching</option>
              <option value="reversal">Reversal</option>
            </Select>
          </div>

          {ledger.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title={period === 'current' ? 'Nothing earned this period' : 'No income yet'}
              description="Commission appears here as soon as someone joins under you."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-card border border-border bg-white">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">From</th>
                      <th className="px-4 py-3 font-semibold">Leg</th>
                      <th className="px-4 py-3 text-right font-semibold">Rate</th>
                      <th className="px-4 py-3 text-right font-semibold">Calculated on</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._id} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                        <td className="px-4 py-2.5 text-text-muted">{day(row.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                              TYPE_STYLE[row.type],
                            )}
                          >
                            {TYPE_LABEL[row.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text">{row.sourceMemberCode}</td>
                        <td className="px-4 py-2.5 text-text-muted">{row.basis?.legSide ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                          {row.basis?.rate ? `${+(row.basis.rate * 100).toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                          {row.basis?.base ? money(row.basis.base) : '—'}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2.5 text-right font-semibold tabular-nums',
                            row.amount < 0 ? 'text-danger' : 'text-text',
                          )}
                        >
                          {money(row.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'text-xs',
                              row.payoutBatch ? 'text-text-subtle' : 'font-medium text-success',
                            )}
                          >
                            {row.payoutBatch ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(ledger.data?.pagination.pages ?? 1) > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-text-subtle">
                  <span>
                    Page {ledger.data?.pagination.page} of {ledger.data?.pagination.pages} ·{' '}
                    {ledger.data?.pagination.total} entries
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= (ledger.data?.pagination.pages ?? 1)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        accent ? 'border-success/30 bg-success-bg/40' : 'border-border bg-white',
      )}
    >
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent ? 'text-success' : 'text-text')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  )
}
