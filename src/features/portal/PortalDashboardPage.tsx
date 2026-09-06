import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReferralSummary } from '@/api/referrals'
import { fetchLegsReport, fetchLevelsReport } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

export function PortalDashboardPage() {
  const user = useAuthStore((state) => state.user)

  const summary = useQuery({ queryKey: ['referral-summary'], queryFn: fetchReferralSummary })
  const legs = useQuery({ queryKey: ['legs'], queryFn: () => fetchLegsReport() })
  const levels = useQuery({ queryKey: ['levels'], queryFn: () => fetchLevelsReport() })

  const loading = summary.isLoading || legs.isLoading || levels.isLoading

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Welcome, {user?.fullName.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-text-subtle">
            <span className="font-mono">{user?.memberCode}</span> · {user?.tier}
          </p>
        </div>
        {(summary.data?.data.unused ?? 0) > 0 && (
          <Link to="/portal/add-member">
            <Button>Add a member</Button>
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
              label="Unused referrals"
              value={String(summary.data?.data.unused ?? 0)}
              hint={summary.data ? `${money(summary.data.data.unusedAmount)} paid` : undefined}
              accent
            />
            <Stat label="Members added" value={String(summary.data?.data.used ?? 0)} hint="Referrals redeemed" />
            <Stat label="Total downline" value={String(levels.data?.totals.members ?? 0)} hint="Everyone below you" />
            <Stat label="Active members" value={String(levels.data?.totals.active ?? 0)} hint="Approved status" />
          </div>

          {/* The leg view is the shape a binary plan pays on: the weaker leg
              matches, the difference carries forward. */}
          <section className="rounded-card border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-text">Your legs</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <LegCard title="Left leg" stats={legs.data?.data.left} weaker={legs.data?.data.weakerLeg === 'Left'} />
              <LegCard title="Right leg" stats={legs.data?.data.right} weaker={legs.data?.data.weakerLeg === 'Right'} />
            </div>
            {legs.data && (
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                <Meta label="Matched" value={String(legs.data.data.matched)} />
                <Meta label="Carry left" value={String(legs.data.data.carryLeft)} />
                <Meta label="Carry right" value={String(legs.data.data.carryRight)} />
                <Meta label="Weaker leg" value={legs.data.data.weakerLeg} />
              </div>
            )}
          </section>

          <section className="rounded-card border border-border bg-white p-6">
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
          </section>
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

function LegCard({
  title,
  stats,
  weaker,
}: {
  title: string
  stats?: { rootCode: string | null; total: number; active: number }
  weaker?: boolean
}) {
  return (
    <div className="rounded-card border border-border bg-bg p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">{title}</p>
        {weaker && (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-medium text-warning">weaker</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-text">{stats?.total ?? 0}</p>
      <p className="mt-0.5 text-xs text-text-subtle">
        {stats?.rootCode ? `from ${stats.rootCode}` : 'empty'} · {stats?.active ?? 0} active
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
