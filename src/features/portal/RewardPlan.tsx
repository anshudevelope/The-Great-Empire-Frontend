import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { claimReward, fetchMyRewards, type MyRewards, type RewardClaim, type RewardOption, type RewardStep } from '@/api/rewards'
import { ApiRequestError } from '@/api/fetchClient'
import { useActiveBusiness } from '@/store/businessStore'
import { formatShortDate } from '@/lib/datetime'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Spinner } from '@/components/ui/Spinner'
import { CheckIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import { inr } from './rewardFormat'

/**
 * A member's reward chart (from the API, for the business they are in): where
 * they stand on the current step, a Claim button once its target is reached,
 * and every claim they have made. Each claim starts the next step from zero.
 */
export function RewardPlan() {
  const business = useActiveBusiness()
  const queryKey = ['rewards', 'me', business]
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: fetchMyRewards })
  const queryClient = useQueryClient()
  const [claiming, setClaiming] = useState<{ step: RewardStep; option: RewardOption } | null>(null)

  const claim = useMutation({
    mutationFn: (option: string) => claimReward(option),
    onSuccess: (res) => {
      toast.success(res.message)
      void queryClient.invalidateQueries({ queryKey })
      setClaiming(null)
    },
    onError: (error) => toast.error(error instanceof ApiRequestError ? error.message : 'Could not claim. Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (isError || !data) return <p className="text-sm text-danger">Could not load your rewards. Please try again.</p>

  const r = data.data
  const { unit } = r.chart
  const hasClaimed = r.claims.some((c) => c.status !== 'rejected')
  const allDone = r.stepIndex >= r.chart.steps.length

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-text">Rewards · {r.chart.title}</h1>
        <p className="mt-1 text-sm text-text-subtle">
          {unit
            ? `Rewards are earned on matching pairs. One pair = ${inr(unit.value)} of business on both your left and right legs.`
            : 'Rewards are earned on matching plot business — each amount is needed on both your left and right legs.'}{' '}
          Claim a reward once you reach it; the next one then counts from zero.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Left leg business" value={inr(r.progress.left)} hint={unitHint(r.progress.left, unit)} />
        <Tile label="Right leg business" value={inr(r.progress.right)} hint={unitHint(r.progress.right, unit)} />
        <Tile
          label={unit ? 'Matching pairs' : 'Matching amount'}
          value={unit ? `${pairsOf(r.matched, unit)}/${pairsOf(r.matched, unit)}` : inr(r.matched)}
          hint={hasClaimed ? 'Counted from your last claim' : 'Counted from the start'}
          accent
        />
      </div>

      {r.pendingClaim && (
        <p className="rounded-card border border-warning/40 bg-warning-bg/50 px-5 py-3 text-sm text-text">
          Your claim is waiting for approval by the company. You can claim the next reward once it is decided.
        </p>
      )}
      {allDone && (
        <p className="rounded-card border border-success-border bg-success-bg px-5 py-3 text-sm font-medium text-success">
          You have claimed every reward on the chart.
        </p>
      )}

      <ChartTable data={r} onClaim={(step, option) => setClaiming({ step, option })} />

      <ClaimHistory claims={r.claims} />

      <ConfirmModal
        open={!!claiming}
        title={claiming ? `Claim ${claiming.option.reward}?` : ''}
        description={
          claiming
            ? `${claiming.step.label}: ${claiming.option.reward} (${inr(claiming.option.rewardValue)}). The company will review your claim. ` +
              `Your progress toward the next reward starts again from zero${
                claiming.step.options.length > 1 ? `, and the other reward in ${claiming.step.label} can no longer be claimed.` : '.'
              }`
            : ''
        }
        confirmLabel="Claim reward"
        isLoading={claim.isPending}
        onConfirm={() => claiming && claim.mutate(claiming.option.key)}
        onClose={() => setClaiming(null)}
      />
    </div>
  )
}

type Unit = MyRewards['chart']['unit']

const pairsOf = (amount: number, unit: NonNullable<Unit>) => Math.floor(amount / unit.value)

const unitHint = (amount: number, unit: Unit) => (unit ? `${pairsOf(amount, unit)} ${unit.label}` : undefined)

/** "30/30 pairs (₹15 Lakh / ₹15 Lakh)" or "₹10 Lakh / ₹10 Lakh". */
function TargetText({ target, unit }: { target: number; unit: Unit }) {
  if (!unit) {
    return (
      <span className="text-text-muted tabular-nums">
        {inr(target)} / {inr(target)}
      </span>
    )
  }
  const n = pairsOf(target, unit)
  return (
    <>
      <span className="font-medium tabular-nums text-text">
        {n}/{n} {unit.label}
      </span>
      <span className="block text-xs tabular-nums text-text-muted">
        {inr(target)} / {inr(target)}
      </span>
    </>
  )
}

/** Laid out like the company's printed chart, with progress and a claim action per row. */
function ChartTable({ data, onClaim }: { data: MyRewards; onClaim: (step: RewardStep, option: RewardOption) => void }) {
  const { chart, stepIndex, matched, pendingClaim, claims } = data
  const { unit } = chart

  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">SL</th>
            <th className="px-4 py-3 font-semibold">Matching {unit ? 'pair' : 'amount'}</th>
            <th className="px-4 py-3 font-semibold">Reward</th>
            <th className="w-44 px-4 py-3 font-semibold">Your progress</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {chart.steps.map((step, si) => {
            const claimed = claims.find((c) => c.step === si && c.status !== 'rejected')
            return step.options.map((option, oi) => {
              const last = oi === step.options.length - 1
              return (
                <tr key={option.key} className={cn('hover:bg-neutral-hover/60', last && 'border-b border-border last:border-0')}>
                  {oi === 0 && (
                    <td rowSpan={step.options.length} className="border-r border-border px-4 py-3 align-middle font-semibold text-text">
                      {si + 1}
                      <span className="block text-xs font-normal text-text-subtle">{step.label}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {oi > 0 && <span className="mb-1 block text-xs uppercase text-text-subtle">or</span>}
                    <TargetText target={option.target} unit={unit} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-text">{option.reward}</span>
                    <span className="text-text-muted"> ({inr(option.rewardValue)})</span>
                  </td>
                  <td className="px-4 py-3">
                    {si < stepIndex ? (
                      claimed?.option === option.key ? (
                        <span className="text-xs text-text-subtle">Claimed on {formatShortDate(claimed.createdAt)}</span>
                      ) : (
                        <span className="text-xs text-text-subtle">—</span>
                      )
                    ) : si === stepIndex ? (
                      <Progress have={matched} target={option.target} unit={unit} />
                    ) : (
                      <span className="text-xs text-text-subtle">Starts after step {si}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusCell
                      claimed={si < stepIndex ? claimed : undefined}
                      isOption={claimed?.option === option.key}
                      current={si === stepIndex}
                      reached={matched >= option.target}
                      waiting={!!pendingClaim}
                      toGo={unit ? `${pairsOf(option.target, unit) - pairsOf(matched, unit)} ${unit.label} to go` : `${inr(option.target - matched)} to go`}
                      onClaim={() => onClaim(step, option)}
                    />
                  </td>
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}

function Progress({ have, target, unit }: { have: number; target: number; unit: Unit }) {
  const done = have >= target
  const pct = Math.min(100, (have / target) * 100)
  return (
    <>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-hover">
        <div className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-blue-600')} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-text-subtle">
        {unit
          ? `${Math.min(pairsOf(have, unit), pairsOf(target, unit))} of ${pairsOf(target, unit)} ${unit.label}`
          : `${inr(Math.min(have, target))} of ${inr(target)}`}{' '}
        ({Math.floor(pct)}%)
      </p>
    </>
  )
}

function StatusCell({
  claimed,
  isOption,
  current,
  reached,
  waiting,
  toGo,
  onClaim,
}: {
  claimed?: RewardClaim
  isOption: boolean
  current: boolean
  reached: boolean
  waiting: boolean
  toGo: string
  onClaim: () => void
}) {
  if (claimed) {
    if (!isOption) return <span className="text-xs text-text-subtle">Not chosen</span>
    return <ClaimBadge status={claimed.status} />
  }
  if (!current) return <span className="text-xs text-text-subtle">Locked</span>
  if (!reached) return <span className="text-xs text-text-subtle">{toGo}</span>
  if (waiting) return <span className="text-xs text-text-subtle">Reached — claim after approval</span>
  return (
    <Button size="sm" onClick={onClaim}>
      Claim
    </Button>
  )
}

export function ClaimBadge({ status }: { status: RewardClaim['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
        <CheckIcon className="h-3 w-3" /> Approved
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="whitespace-nowrap rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">Pending approval</span>
    )
  }
  return <span className="whitespace-nowrap rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger">Rejected</span>
}

function ClaimHistory({ claims }: { claims: RewardClaim[] }) {
  if (!claims.length) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-text">Your claims</h2>
      <div className="overflow-x-auto rounded-card bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Claimed on</th>
              <th className="px-4 py-3 font-semibold">Step</th>
              <th className="px-4 py-3 font-semibold">Reward</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c._id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text-muted">{formatShortDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-text">{c.stepLabel}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text">{c.reward}</span>
                  <span className="text-text-muted"> ({inr(c.rewardValue)})</span>
                </td>
                <td className="px-4 py-3">
                  <ClaimBadge status={c.status} />
                  {c.decision.at && <span className="mt-0.5 block text-xs text-text-subtle">{formatShortDate(c.decision.at)}</span>}
                </td>
                <td className="px-4 py-3 text-text-muted">{c.decision.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-card bg-surface p-5">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent ? 'text-info' : 'text-text')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-subtle">{hint}</p>}
    </div>
  )
}
