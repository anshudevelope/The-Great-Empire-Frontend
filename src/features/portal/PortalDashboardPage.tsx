import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReferralSummary } from '@/api/referrals'
import { fetchPendingPlacement } from '@/api/associates'
import { fetchLevelsReport } from '@/api/reports'
import { fetchMyCommissionSummary } from '@/api/commissions'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatTier } from '@/lib/tier'
import { formatShortDate } from '@/lib/datetime'

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

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
            />
            <Stat label="Members placed" value={String(summary.data?.data.used ?? 0)} hint="Referrals placed in your tree" />
            <Stat label="Total downline" value={String(levels.data?.totals.members ?? 0)} hint="Everyone below you" />
            <Stat label="Active members" value={String(levels.data?.totals.active ?? 0)} hint="Approved status" />
            {/* The date is today's: realtime income is computed live on every
                request, so there is no server-side cutoff to report and no
                reason to ask the API for a date the browser already has. */}
            <Stat
              label="Realtime income"
              value={money2(earnings?.totalIncome ?? 0)}
              hint={`Till ${formatShortDate(new Date().toISOString())}`}
              tone="success"
            />
          </div>

          {/* <section className="rounded-card border border-border bg-white p-6">
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

function Stat({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
  /** Money reads green. Same tile, only the figure changes colour. */
  tone?: 'success'
}) {
  const valueClass =
    tone === 'success'
      ? 'mt-1 text-2xl font-semibold tabular-nums text-success'
      : accent
        ? 'mt-1 text-2xl font-semibold text-blue-700'
        : 'mt-1 text-2xl font-semibold text-text'

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={valueClass}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-subtle">{hint}</p>}
    </div>
  )
}


