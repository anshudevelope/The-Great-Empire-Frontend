import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyCommissions, fetchMyCommissionSummary } from '@/api/commissions'
import type { CommissionLedgerRow } from '@/api/commissions'
import { fetchMyPlotLedger, fetchMyPlotSummary } from '@/api/plots'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { RefreshIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import { useActiveBusiness } from '@/store/businessStore'
import { BUSINESSES } from '@/lib/business'
import { formatShortDate } from '@/lib/datetime'
import { usePlotConfig } from '@/features/plots/hooks'
import { TabStrip } from '@/features/plots/PlotUi'

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const day = (value?: string | null) => formatShortDate(value ?? undefined)

const pct = (fraction?: number) => (fraction === undefined ? '' : `${+(fraction * 100).toFixed(2)}%`)

type RowType = CommissionLedgerRow['type']

const TYPE_LABEL: Record<RowType, string> = {
  direct: 'Direct referral',
  matching: 'Binary matching',
  reversal: 'Reversal',
}

const TYPE_STYLE: Record<RowType, string> = {
  direct: 'bg-info-bg text-info',
  matching: 'bg-success-bg text-success',
  reversal: 'bg-danger-bg text-danger',
}

/** T2 earns from two separate ledgers: ID referral (registration) and plot sales. */
type Source = 'referral' | 'plot'

/** One ledger row, whichever ledger it came from. */
interface Row {
  _id: string
  type: RowType
  amount: number
  from: string
  /** Plot rows only: the sale that produced it. */
  booking?: string
  leg: string | null
  rate: number
  base: number
  paid: boolean
  createdAt: string
}

interface Totals {
  directIncome: number
  matchingIncome: number
  totalIncome: number
}

interface Carry {
  left: number
  right: number
  weakerLeg: 'Left' | 'Right' | null
}

/**
 * My Income — every commission row behind the member's earnings.
 *
 * Defaults to the current period, because that is the number they are chasing
 * and the one the dashboard shows. Switching to all time brings in rows already
 * paid out in an earlier closing, which is why each row carries a paid/unpaid
 * marker: without it the two views would look identical but total differently.
 *
 * In T2 the cards add ID referral and plot income together, with the split
 * beneath; the tab picks which ledger the table (and carry) shows. Carry is
 * never added up — the two pools match separately.
 */
export function MyIncomePage() {
  const business = useActiveBusiness()
  const rates = BUSINESSES[business].rates
  const t2 = business === 't2'
  const [tab, setTab] = useState<Source>('referral')
  const source: Source = t2 ? tab : 'referral'
  const [period, setPeriod] = useState<'current' | 'all'>('current')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const summary = useQuery({
    queryKey: ['commissions', 'me', 'summary'],
    queryFn: fetchMyCommissionSummary,
  })
  const plotSummary = useQuery({
    queryKey: ['plot-commission', 'me', 'summary'],
    queryFn: fetchMyPlotSummary,
    enabled: t2,
  })
  const plotConfig = usePlotConfig(t2)

  const params = { period, type: type || undefined, page: String(page), limit: '50' }
  const ledger = useQuery({
    queryKey: [source === 'plot' ? 'plot-commission' : 'commissions', 'me', 'ledger', period, type, page],
    queryFn: async (): Promise<{ rows: Row[]; pagination: { page: number; pages: number; total: number } }> => {
      if (source === 'plot') {
        const r = await fetchMyPlotLedger(params)
        return {
          pagination: r.pagination,
          rows: r.data.map((row) => ({
            _id: row._id,
            type: row.type,
            amount: row.amount,
            from: row.sourceAssociateCode,
            booking: row.bookingCode,
            leg: row.basis?.legSide ?? null,
            rate: row.basis?.rate ?? 0,
            base: row.basis?.base ?? 0,
            paid: !!row.payout,
            createdAt: row.createdAt,
          })),
        }
      }
      const r = await fetchMyCommissions(params)
      return {
        pagination: r.pagination,
        rows: r.data.map((row) => ({
          _id: row._id,
          type: row.type,
          amount: row.amount,
          from: row.sourceMemberCode,
          leg: row.basis?.legSide ?? null,
          rate: row.basis?.rate ?? 0,
          base: row.basis?.base ?? 0,
          paid: !!row.payoutBatch,
          createdAt: row.createdAt,
        })),
      }
    },
  })

  const s = summary.data?.data
  const p = plotSummary.data?.data
  const referral: Totals | undefined = period === 'current' ? s : s?.lifetime
  const plot: Totals | undefined = period === 'current' ? p?.current : p?.lifetime
  const carry: Carry | undefined = source === 'plot' ? p?.carry : s?.carry
  const rows = ledger.data?.rows ?? []
  const loading = summary.isLoading || (t2 && plotSummary.isLoading)

  const plotRates = plotConfig.data?.commission

  const refreshing = summary.isFetching || plotSummary.isFetching || ledger.isFetching
  const refresh = () => {
    void summary.refetch()
    if (t2) void plotSummary.refetch()
    void ledger.refetch()
  }

  // Lifetime, for the "this period" note: paid-out income drops off the cards
  // at a closing, while the tree's hover card keeps showing it as earned.
  const lifetimeReferral = s?.lifetime.totalIncome ?? 0
  const lifetimePlot = t2 ? (p?.lifetime.totalIncome ?? 0) : 0

  /** A card's figure: the sum in T2, with the split (and each side's rate) as its breakdown. */
  const card = (key: keyof Totals, rate?: { referral: string; plot?: number }) => ({
    value: money((referral?.[key] ?? 0) + (t2 ? (plot?.[key] ?? 0) : 0)),
    breakdown: t2
      ? [
          { label: rate ? `ID Referral (${rate.referral})` : 'ID Referral', value: money(referral?.[key] ?? 0) },
          {
            label: rate && rate.plot !== undefined ? `Plot (${pct(rate.plot)})` : 'Plot',
            value: plotSummary.isError ? '—' : money(plot?.[key] ?? 0),
          },
        ]
      : undefined,
  })
  const resetPage = () => setPage(1)

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">My income</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Every commission you have earned, and what produced it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={refreshing}
            leftIcon={<RefreshIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Link to="/portal/payouts">
            <Button variant="secondary">Payout history</Button>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label={t2 ? 'Direct' : `Direct (${rates.direct})`}
              {...card('directIncome', { referral: rates.direct, plot: plotRates?.direct })}
            />
            <Tile
              label={t2 ? 'Matching' : `Matching (${rates.matching})`}
              {...card('matchingIncome', { referral: rates.matching, plot: plotRates?.matching })}
            />
            <Tile
              label={period === 'current' ? 'Realtime income' : 'Lifetime income'}
              {...card('totalIncome')}
              accent
            />
            <Tile
              label={t2 ? `Carry waiting · ${source === 'plot' ? 'Plot' : 'ID Referral'}` : 'Carry waiting'}
              value={money(Math.max(carry?.left ?? 0, carry?.right ?? 0))}
              hint={
                carry?.weakerLeg
                  ? `${carry.weakerLeg} leg is smaller — matching needs both sides`
                  : 'both legs level'
              }
            />
          </div>

          {period === 'current' && (
            <p className="mb-4 text-xs text-text-subtle">
              Earned since the last closing and not yet paid. This resets to zero when the company
              closes the books; what was paid before then stays under All time.{' '}
              <span className="font-medium text-text-muted">
                Lifetime earned: {money(lifetimeReferral + lifetimePlot)}
                {t2 && ` (ID Referral ${money(lifetimeReferral)} · Plot ${money(lifetimePlot)})`}
              </span>
            </p>
          )}

          {t2 && (
            <TabStrip<Source>
              tabs={[
                { value: 'referral', label: 'ID Referral' },
                { value: 'plot', label: 'Plot' },
              ]}
              value={tab}
              onChange={(value) => {
                setTab(value)
                resetPage()
              }}
            />
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <Select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as 'current' | 'all')
                resetPage()
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
                resetPage()
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
          ) : ledger.isError ? (
            <p className="text-sm text-danger">Could not load your income. Please try again.</p>
          ) : rows.length === 0 ? (
            <EmptyState
              title={period === 'current' ? 'Nothing earned this period' : 'No income yet'}
              description={
                source === 'plot'
                  ? 'Plot commission appears here once a sale in your network reaches its allotment.'
                  : 'Commission appears here as soon as someone joins under you.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-card bg-surface">
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
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-text">{row.from}</span>
                          {row.booking && (
                            <span className="block font-mono text-[11px] text-text-subtle">{row.booking}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{row.leg ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                          {row.rate ? pct(row.rate) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                          {row.base ? money(row.base) : '—'}
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
                          <span className={cn('text-xs', row.paid ? 'text-text-subtle' : 'font-medium text-success')}>
                            {row.paid ? 'Paid' : 'Unpaid'}
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

function Tile({
  label,
  value,
  hint,
  breakdown,
  accent,
}: {
  label: string
  value: string
  hint?: string
  /** The figures the headline adds up, one per line beneath it. */
  breakdown?: { label: string; value: string }[]
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        accent ? 'border-success/30 bg-success-bg/40' : 'border-border bg-surface',
      )}
    >
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent ? 'text-success' : 'text-text')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-text-subtle">{hint}</p>}
      {breakdown && (
        <dl className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
          {breakdown.map((b) => (
            <div key={b.label} className="flex justify-between gap-2">
              <dt className="text-text-subtle">{b.label}</dt>
              <dd className="font-medium tabular-nums text-text">{b.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
