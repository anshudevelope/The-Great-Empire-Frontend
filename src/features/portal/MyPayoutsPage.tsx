import { useQuery } from '@tanstack/react-query'
import { fetchMyPayouts } from '@/api/payouts'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatShortDate } from '@/lib/datetime'
import { HeldPill, Stat, money } from '@/features/payouts/payoutBits'

const day = (value?: string | null) => formatShortDate(value ?? undefined)

/**
 * A member's own payout history.
 *
 * Finalized closings only — the API filters drafts and cancelled batches out,
 * because either would tell someone money is coming when it is not. Written as
 * a statement rather than a data grid: this is what a member checks when they
 * want to know whether they were paid correctly.
 */
export function MyPayoutsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['payouts', 'me'], queryFn: fetchMyPayouts })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const rows = data?.data ?? []

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">My payouts</h1>
        <p className="mt-1 text-sm text-text-subtle">
          What you were paid at each closing, and what was deducted.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Your earnings appear here once the company closes the books for a period."
        />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <Stat label="Total received" value={money(data?.total ?? 0)} tone="good" />
            <Stat label="Closings" value={String(rows.length)} />
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.batchNo} className="rounded-card bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-medium text-info">{row.batchNo}</p>
                    <p className="mt-0.5 text-xs text-text-subtle">
                      {day(row.periodStart)} → {day(row.periodEnd)}
                      {row.paidOn && ` · paid ${day(row.paidOn)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums text-success">{money(row.netPayable)}</p>
                    <p className="text-[11px] text-text-subtle">received</p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-text-subtle">Direct (10%)</dt>
                    <dd className="tabular-nums text-text">{money(row.direct)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">Matching (5%)</dt>
                    <dd className="tabular-nums text-text">{money(row.matching)}</dd>
                  </div>
                  {row.openingAdjustment !== 0 && (
                    <div>
                      <dt className="text-text-subtle">Brought forward</dt>
                      <dd className="tabular-nums text-text">{money(row.openingAdjustment)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-text-subtle">Total earned</dt>
                    <dd className="font-medium tabular-nums text-text">
                      {money(row.total)}
                      <HeldPill reason={row.heldReason} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">Admin charge</dt>
                    <dd className="tabular-nums text-text-muted">−{money(row.adminCharge)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">{row.secondaryChargeLabel}</dt>
                    <dd className="tabular-nums text-text-muted">−{money(row.secondaryCharge)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
