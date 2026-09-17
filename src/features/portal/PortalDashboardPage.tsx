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
          </div>

          {/* Realtime income — earned since the last closing, not yet paid.
              Deliberately shows carry in RUPEES: the tree tooltip reports it the
              same way, and the old member-count version of "carry" meant
              something different under the same word. */}
          <section className="rounded-card border border-border bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">Realtime income</h2>
              <Link to="/portal/payouts" className="text-xs font-medium text-blue-700 hover:underline">
                Payout history →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <IncomeCard label="Direct (10%)" value={money2(earnings?.directIncome ?? 0)} />
              <IncomeCard label="Matching (5%)" value={money2(earnings?.matchingIncome ?? 0)} />
              <IncomeCard label="Total earning" value={money2(earnings?.totalIncome ?? 0)} accent />
            </div>

            {earnings && (
              <>
                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                  <Meta label="Carry left" value={money2(earnings.carry.left)} />
                  <Meta label="Carry right" value={money2(earnings.carry.right)} />
                  <Meta
                    label="Weaker leg"
                    value={earnings.carry.weakerLeg ?? (earnings.carry.left === 0 ? 'none yet' : 'balanced')}
                  />
                  {earnings.reversals !== 0 && <Meta label="Reversals" value={money2(earnings.reversals)} />}
                </div>

                <p className="mt-3 text-xs text-text-subtle">
                  {earnings.totalIncome > 0
                    ? 'Earned since the last closing and not yet paid. It resets to zero once the company closes the books.'
                    : 'Nothing earned yet this period. Income appears here as soon as someone joins under you.'}
                  {earnings.carry.weakerLeg && (
                    <>
                      {' '}
                      Your {earnings.carry.weakerLeg.toLowerCase()} leg is the smaller one — matching pays
                      only where both sides pair up.
                    </>
                  )}
                </p>
              </>
            )}
          </section>

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

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={accent ? 'mt-1 text-2xl font-semibold text-blue-700' : 'mt-1 text-2xl font-semibold text-text'}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-text-subtle">{hint}</p>}
    </div>
  )
}

function IncomeCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? 'rounded-card border border-success/30 bg-success-bg/40 p-4'
          : 'rounded-card border border-border bg-bg p-4'
      }
    >
      <p className="text-xs text-text-subtle">{label}</p>
      <p
        className={
          accent
            ? 'mt-1 text-2xl font-semibold tabular-nums text-success'
            : 'mt-1 text-2xl font-semibold tabular-nums text-text'
        }
      >
        {value}
      </p>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-text-muted">
      {label}: <span className="font-medium text-text">{value}</span>
    </span>
  )
}
