import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyPlotSummary } from '@/api/plots'
import { useActiveBusiness } from '@/store/businessStore'
import { Spinner } from '@/components/ui/Spinner'
import { CheckIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'
import { Tile } from './RewardsTierOnePage'
import { inr } from './rewardFormat'

/**
 * The Tier II (Plots) reward plan, as issued by the company. Unlike Tier I,
 * every level is its own reward, and each "Next" amount adds on to the one
 * before it — so level 2 needs 10 L + 50 L = 60 L matched. A matching amount
 * is needed on BOTH legs: 10 Lakh is 10 Lakh left and 10 Lakh right.
 */
interface Level {
  /** The chart's own wording for this step. */
  step: string
  amount: number
  reward: string
  rewardValue: number
}

const STEPS: Level[] = [
  { step: '10 Lakh', amount: 1_000_000, reward: 'Mobile', rewardValue: 30_000 },
  { step: 'Next 50 Lakh', amount: 5_000_000, reward: 'Car Fund', rewardValue: 250_000 },
  { step: 'Next 2.5 Cr', amount: 25_000_000, reward: 'Car Fund', rewardValue: 500_000 },
  { step: 'Next 5 Cr', amount: 50_000_000, reward: 'Car Fund', rewardValue: 1_200_000 },
  { step: 'Next 10 Cr', amount: 100_000_000, reward: 'Car Fund', rewardValue: 2_500_000 },
  { step: 'Next 20 Cr', amount: 200_000_000, reward: 'House Land', rewardValue: 5_000_000 },
]

/** Each level's running target on each leg. */
const LEVELS = STEPS.reduce<(Level & { target: number })[]>((acc, level) => {
  const before = acc.length ? acc[acc.length - 1].target : 0
  return [...acc, { ...level, target: before + level.amount }]
}, [])

/** /portal/rewards opens the plan of the business the member is working in. */
export function RewardsIndex() {
  return <Navigate to={useActiveBusiness() === 't2' ? 'tier-2' : 'tier-1'} replace />
}

export function RewardsTierTwoPage() {
  const business = useActiveBusiness()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['plot-commission', 'me', 'summary'],
    queryFn: fetchMyPlotSummary,
    enabled: business === 't2',
  })

  if (business !== 't2') return <Navigate to="/portal/dashboard" replace />

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-sm text-danger">Could not load your plot business. Please try again.</p>
  }

  // Lifetime commissionable plot business, not carry: carry is consumed by
  // every match, but reward qualification counts all business ever built.
  const { left, right } = data.data.ratedVolume
  const matched = Math.min(left, right)
  const achieved = LEVELS.filter((l) => matched >= l.target)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-text">Rewards · Tier II (Plots)</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Rewards are earned on matching plot business — each amount is needed on both your left and right legs. Each
          level adds on to the one before it.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Left leg business" value={inr(left)} />
        <Tile label="Right leg business" value={inr(right)} />
        <Tile
          label="Matching amount"
          value={inr(matched)}
          hint={
            achieved.length ? `${achieved.length} reward level${achieved.length > 1 ? 's' : ''} reached` : 'No reward yet'
          }
          accent
        />
      </div>

      <RewardTable matched={matched} />

      <p className="text-xs text-text-subtle">
        Counts the commissionable share of plot payments, once a booking's allotment is reached. Progress shown is based
        on your lifetime matched business; final reward approval is by the company.
      </p>
    </div>
  )
}

/** Laid out like the company's printed chart: SL, matching amount, reward — plus progress. */
function RewardTable({ matched }: { matched: number }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">SL</th>
            <th className="px-4 py-3 font-semibold">Matching amount</th>
            <th className="px-4 py-3 font-semibold">Reward</th>
            <th className="w-56 px-4 py-3 font-semibold">Your progress</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {LEVELS.map((level, i) => {
            const done = matched >= level.target
            const pct = Math.min(100, (matched / level.target) * 100)

            return (
              <tr key={level.step} className="border-b border-border last:border-0 hover:bg-neutral-hover/60">
                <td className="px-4 py-3 font-semibold text-text">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text">{level.step}</span>
                  <span className="block text-xs tabular-nums text-text-muted">
                    {inr(level.target)} / {inr(level.target)} in total
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-text">{level.reward}</span>
                  <span className="text-text-muted"> ({inr(level.rewardValue)})</span>
                </td>
                <td className="px-4 py-3">
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-hover">
                    <div
                      className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-blue-600')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-text-subtle">
                    {inr(Math.min(matched, level.target))} of {inr(level.target)} ({Math.floor(pct)}%)
                  </p>
                </td>
                <td className="px-4 py-3">
                  {done ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                      <CheckIcon className="h-3 w-3" /> Achieved
                    </span>
                  ) : (
                    <span className="text-xs text-text-subtle">{inr(level.target - matched)} to go</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
