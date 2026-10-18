import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyPayouts, type MyPayoutRow } from '@/api/payouts'
import { fetchMyPlotPayouts } from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatShortDate } from '@/lib/datetime'
import { cn } from '@/lib/cn'
import { HeldPill, Stat, money } from '@/features/payouts/payoutBits'
import { useActiveBusiness } from '@/store/businessStore'
import { BUSINESSES } from '@/lib/business'
import { usePlotConfig } from '@/features/plots/hooks'
import { TabStrip } from '@/features/plots/PlotUi'

const day = (value?: string | null) => formatShortDate(value ?? undefined)

const pct = (fraction?: number) => (fraction === undefined ? '' : `${+(fraction * 100).toFixed(2)}%`)

/** T2 is paid from two separate closings: ID referral (registration) and plot sales. */
type Source = 'referral' | 'plot'
type Tab = 'all' | Source

const SOURCE_LABEL: Record<Source, string> = { referral: 'ID Referral', plot: 'Plot' }

/**
 * A member's own payout history.
 *
 * Finalized closings only — the API filters drafts and cancelled batches out,
 * because either would tell someone money is coming when it is not. Written as
 * a statement rather than a data grid: this is what a member checks when they
 * want to know whether they were paid correctly.
 *
 * In T2 the tabs are All / ID Referral / Plot — All lists both, newest first,
 * each card tagged with where it came from. "Total received" adds both
 * together, with the split beneath.
 */
export function MyPayoutsPage() {
  const business = useActiveBusiness()
  const rates = BUSINESSES[business].rates
  const t2 = business === 't2'
  const [tab, setTab] = useState<Tab>('all')
  const [viewing, setViewing] = useState<PayoutRow | null>(null)
  const shown: Tab = t2 ? tab : 'referral'

  const referral = useQuery({ queryKey: ['payouts', 'me'], queryFn: fetchMyPayouts })
  const plot = useQuery({ queryKey: ['plot-commission', 'me', 'payouts'], queryFn: fetchMyPlotPayouts, enabled: t2 })
  const plotRates = usePlotConfig(t2).data?.commission

  if (referral.isLoading || (t2 && plot.isLoading)) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const referralRows = (referral.data?.data ?? []).map((row) => ({ ...row, source: 'referral' as const }))
  const plotRows = (t2 ? (plot.data?.data ?? []) : []).map((row) => ({ ...row, source: 'plot' as const }))
  const rows =
    shown === 'referral'
      ? referralRows
      : shown === 'plot'
        ? plotRows
        : [...referralRows, ...plotRows].sort(
            (a, b) => new Date(b.paidOn ?? b.periodEnd ?? 0).getTime() - new Date(a.paidOn ?? a.periodEnd ?? 0).getTime(),
          )
  const failed = shown === 'referral' ? referral.isError : shown === 'plot' ? plot.isError : referral.isError && plot.isError
  const referralTotal = referral.data?.total ?? 0
  const plotTotal = plot.data?.total ?? 0
  const rateOf = (source: Source) =>
    source === 'plot'
      ? { direct: pct(plotRates?.direct), matching: pct(plotRates?.matching) }
      : { direct: rates.direct, matching: rates.matching }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-text">My payouts</h1>
        <p className="mt-1 text-sm text-text-subtle">
          What you were paid at each closing, and what was deducted.
        </p>
      </header>

      {t2 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card bg-surface p-4">
            <p className="text-xs text-text-subtle">Total received</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{money(referralTotal + plotTotal)}</p>
            <dl className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-text-subtle">ID Referral</dt>
                <dd className="font-medium tabular-nums text-text">{money(referralTotal)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-subtle">Plot</dt>
                <dd className="font-medium tabular-nums text-text">{plot.isError ? '—' : money(plotTotal)}</dd>
              </div>
            </dl>
          </div>
          <Stat label="Closings" value={String(referralRows.length + plotRows.length)} />
        </div>
      )}

      {t2 && (
        <TabStrip<Tab>
          tabs={[
            { value: 'all', label: 'All', count: referralRows.length + plotRows.length },
            { value: 'referral', label: 'ID Referral', count: referralRows.length },
            { value: 'plot', label: 'Plot', count: plotRows.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {failed ? (
        <p className="text-sm text-danger">Could not load your payouts. Please try again.</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Your earnings appear here once the company closes the books for a period."
        />
      ) : (
        <>
          {!t2 && (
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <Stat label="Total received" value={money(referralTotal)} tone="good" />
              <Stat label="Closings" value={String(rows.length)} />
            </div>
          )}

          <PayoutTable rows={rows} tagged={shown === 'all'} onView={setViewing} />
        </>
      )}

      {viewing && (
        <PayoutBreakdownModal row={viewing} rate={rateOf(viewing.source)} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

type PayoutRow = MyPayoutRow & { source: Source }

/**
 * Every closing as a row — just what was earned, what was deducted and what
 * arrived, so it stays readable on a phone. View opens the full breakdown.
 */
function PayoutTable({
  rows,
  tagged,
  onView,
}: {
  rows: PayoutRow[]
  /** On the All tab, say which closing each row was. */
  tagged: boolean
  onView: (row: PayoutRow) => void
}) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-3 py-3 font-semibold">Sno.</th>
            <th className="px-3 py-3 font-semibold">Payout</th>
            <th className="px-3 py-3 font-semibold">Period</th>
            <th className="px-3 py-3 font-semibold">Paid on</th>
            <th className="px-3 py-3 text-right font-semibold">Total</th>
            <th className="px-3 py-3 text-right font-semibold">Deductions</th>
            <th className="px-3 py-3 text-right font-semibold">Received</th>
            <th className="px-3 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.source}-${row.batchNo}`}
              className="border-b border-border last:border-0 hover:bg-neutral-hover/60"
            >
              <td className="px-3 py-2.5 text-text-subtle">{index + 1}</td>
              <td className="px-3 py-2.5">
                <span className="font-mono text-xs font-medium text-info">{row.batchNo}</span>
                {tagged && <SourceTag source={row.source} className="ml-2" />}
              </td>
              <td className="px-3 py-2.5 text-text-muted">{periodText(row)}</td>
              <td className="px-3 py-2.5 text-text-muted">{day(row.paidOn)}</td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums text-text">
                {money(row.total)}
                <HeldPill reason={row.heldReason} />
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-text-subtle">
                −{money(row.adminCharge + row.secondaryCharge)}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-success">
                {money(row.netPayable)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(row)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceTag({ source, className }: { source: Source; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium',
        source === 'plot' ? 'bg-success-bg text-success' : 'bg-info-bg text-info',
        className,
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

/** "1/10/2026 to 31/10/2026", or "Up to 31/10/2026" for closings without a start. */
const periodText = (row: PayoutRow) =>
  row.periodStart ? `${day(row.periodStart)} to ${day(row.periodEnd)}` : `Up to ${day(row.periodEnd)}`

/**
 * One closing in full, laid out like a settlement slip: the statement on the
 * left (what was earned, what came off it), the settlement on the right (the
 * sum, ending in what arrived). On a phone the settlement sits on top.
 */
function PayoutBreakdownModal({
  row,
  rate,
  onClose,
}: {
  row: PayoutRow
  rate: { direct: string; matching: string }
  onClose: () => void
}) {
  const deductions = row.adminCharge + row.secondaryCharge
  const chargeRate = (fraction: number | null) => (fraction === null ? '' : pct(fraction))

  return (
    <Modal open onClose={onClose} title={`Payout ${row.batchNo}`} size="xl" scrollable>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
        {/* Settlement — first in the DOM so a phone reads the answer first. */}
        <aside className="flex flex-col rounded-card bg-success-bg/50 p-5 ring-1 ring-success/25 md:order-2">
          <div className="flex items-center justify-between gap-2">
            <SourceTag source={row.source} />
            <span className="text-xs text-text-subtle">Paid {day(row.paidOn)}</span>
          </div>

          <p className="mt-5 text-sm text-text-muted">You received</p>
          <p className="text-3xl font-semibold leading-tight tabular-nums text-success">{money(row.netPayable)}</p>

          {/* The sum, written the way it would be on a paper slip. */}
          <dl className="mt-5 space-y-1.5 text-sm tabular-nums">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Earned</dt>
              <dd className="text-text">{money(row.total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Deducted</dt>
              <dd className="text-text">−{money(deductions)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-success/30 pt-1.5 font-semibold">
              <dt className="text-text">Received</dt>
              <dd className="text-success">{money(row.netPayable)}</dd>
            </div>
          </dl>

          <p className="mt-auto pt-5 text-xs text-text-subtle">Period {periodText(row)}</p>
        </aside>

        {/* Statement */}
        <div className="flex min-w-0 flex-col gap-6 md:order-1">
          <section aria-labelledby="pb-earned">
            <h3 id="pb-earned" className="text-sm font-semibold text-text">
              Earned
            </h3>
            <dl className="mt-2">
              <StatementLine label="Direct" rate={rate.direct} value={money(row.direct)} />
              <StatementLine label="Matching" rate={rate.matching} value={money(row.matching)} />
              {row.openingAdjustment !== 0 && (
                <StatementLine label="Brought forward" hint="From an earlier closing" value={money(row.openingAdjustment)} />
              )}
              {row.reversals !== 0 && (
                <StatementLine label="Reversals" hint="Commission taken back" value={money(row.reversals)} negative />
              )}
              <StatementLine label="Total earned" value={money(row.total)} total />
            </dl>
            {row.heldReason && (
              <p className="mt-2 flex items-center gap-1 text-xs text-text-subtle">
                <HeldPill reason={row.heldReason} /> This amount rolls into your next payout.
              </p>
            )}
          </section>

          <section aria-labelledby="pb-deducted">
            <h3 id="pb-deducted" className="text-sm font-semibold text-text">
              Deducted
              <span className="ml-1.5 font-normal text-text-subtle">on {money(row.total)} earned</span>
            </h3>
            <dl className="mt-2">
              <StatementLine label="Admin charge" rate={chargeRate(row.adminChargePct)} value={`−${money(row.adminCharge)}`} />
              <StatementLine
                label={row.secondaryChargeLabel}
                rate={chargeRate(row.secondaryChargePct)}
                value={`−${money(row.secondaryCharge)}`}
              />
              <StatementLine label="Total deducted" value={`−${money(deductions)}`} total />
            </dl>
          </section>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </Modal>
  )
}

/**
 * One statement row on a three-column grid — label, rate, amount — so rates
 * and amounts line up down the slip. A total row closes its section with a rule.
 */
function StatementLine({
  label,
  value,
  rate,
  hint,
  total,
  negative,
}: {
  label: string
  value: string
  rate?: string
  hint?: string
  total?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_3.5rem_auto] items-baseline gap-x-3 py-2 text-sm',
        total ? 'mt-1 border-t-2 border-text/15 font-semibold' : 'border-b border-border',
      )}
    >
      <dt className={cn('min-w-0', total ? 'text-text' : 'text-text-muted')}>
        {label}
        {hint && <span className="block text-xs font-normal text-text-subtle">{hint}</span>}
      </dt>
      <span className="text-right text-xs tabular-nums text-text-subtle">{rate}</span>
      <dd className={cn('text-right tabular-nums', negative ? 'text-danger' : 'text-text')}>{value}</dd>
    </div>
  )
}

