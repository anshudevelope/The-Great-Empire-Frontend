import { useQuery } from '@tanstack/react-query'
import { fetchMyCommissionSummary } from '@/api/commissions'
import { Spinner } from '@/components/ui/Spinner'
import { CheckIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'

/**
 * The Tier I (Insurance) reward plan, as issued by the company: each stage
 * offers a smaller reward or, for the larger matching pair, a bigger one.
 * A "pair" is ₹50,000 of business on BOTH legs — 30/30 is ₹15 Lakh/₹15 Lakh.
 */
const PAIR_VALUE = 50_000

interface Milestone {
  pairs: number
  reward: string
  rewardValue: number
}

interface Stage {
  key: string
  label: string
  options: [Milestone, Milestone]
}

const STAGES: Stage[] = [
  {
    key: 'A',
    label: 'Stage A',
    options: [
      { pairs: 30, reward: 'Alto Car', rewardValue: 250_000 },
      { pairs: 60, reward: 'Swift', rewardValue: 500_000 },
    ],
  },
  {
    key: 'B',
    label: 'Stage B',
    options: [
      { pairs: 150, reward: 'Scorpio', rewardValue: 1_200_000 },
      { pairs: 350, reward: 'Fortuner', rewardValue: 2_500_000 },
    ],
  },
  {
    key: 'C',
    label: 'Stage C',
    options: [
      { pairs: 500, reward: 'House Land', rewardValue: 5_000_000 },
      { pairs: 1000, reward: 'House Land', rewardValue: 10_000_000 },
    ],
  },
]

const ALL_MILESTONES = STAGES.flatMap((stage) => stage.options.map((m) => ({ ...m, stage: stage.label })))

/** Indian short form: ₹2.5 Lakh, ₹1.75 Cr. */
function inr(value: number): string {
  if (value >= 10_000_000) return `₹${trim(value / 10_000_000)} Cr`
  if (value >= 100_000) return `₹${trim(value / 100_000)} Lakh`
  return `₹${value.toLocaleString('en-IN')}`
}

const trim = (n: number) => String(Number(n.toFixed(2)))

export function RewardsTierOnePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['commissions', 'me', 'summary'],
    queryFn: fetchMyCommissionSummary,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-sm text-danger">Could not load your business volume. Please try again.</p>
  }

  // Lifetime volume, not carry: carry is consumed by every match, but reward
  // qualification counts all business ever built on each leg. Only Tier I
  // generates volume, so these figures are already Tier I only.
  const left = data.data.volume.left
  const right = data.data.volume.right
  const pairs = Math.floor(Math.min(left, right) / PAIR_VALUE)
  // const next = ALL_MILESTONES.find((m) => pairs < m.pairs)
  const achieved = ALL_MILESTONES.filter((m) => pairs >= m.pairs)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-text">Rewards · Tier I (Insurance)</h1>
        <p className="mt-1 text-sm text-text-subtle">
          Rewards are earned on matching pairs. One pair = {inr(PAIR_VALUE)} of business on both your left and right
          legs.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Left leg business" value={inr(left)} hint={`${Math.floor(left / PAIR_VALUE)} units`} />
        <Tile label="Right leg business" value={inr(right)} hint={`${Math.floor(right / PAIR_VALUE)} units`} />
        <Tile
          label="Matching pairs"
          value={`${pairs}/${pairs}`}
          hint={achieved.length ? `${achieved.length} reward level${achieved.length > 1 ? 's' : ''} reached` : 'No reward yet'}
          accent
        />
      </div>

      {/* {next ? <NextTarget milestone={next} left={left} right={right} /> : <AllDone />} */}

      <RewardTable left={left} right={right} pairs={pairs} />

      <p className="text-xs text-text-subtle">
        Each stage offers one reward or the other. Progress shown is based on your lifetime matched business; final
        reward approval is by the company.
      </p>
    </div>
  )
}

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <p className="text-xs text-text-subtle">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent ? 'text-blue-700' : 'text-text')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-subtle">{hint}</p>}
    </div>
  )
}

// Hidden for now — restore together with the commented-out block in the page.
// /** The one thing to aim for right now, and exactly what each leg still needs. */
// function NextTarget({ milestone, left, right }: { milestone: Milestone & { stage: string }; left: number; right: number }) {
//   const target = milestone.pairs * PAIR_VALUE
//   const needLeft = Math.max(0, target - left)
//   const needRight = Math.max(0, target - right)
//
//   return (
//     <section className="rounded-card border border-blue-200 bg-blue-50 p-5">
//       <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Next reward · {milestone.stage}</p>
//       <p className="mt-1 text-lg font-semibold text-text">
//         {milestone.reward} <span className="font-normal text-text-muted">({inr(milestone.rewardValue)})</span>
//       </p>
//       <p className="mt-0.5 text-sm text-text-muted">
//         Reach {milestone.pairs}/{milestone.pairs} pairs — {inr(target)} on each leg.
//       </p>
//
//       <div className="mt-4 grid gap-4 sm:grid-cols-2">
//         <LegBar side="Left" have={left} target={target} need={needLeft} />
//         <LegBar side="Right" have={right} target={target} need={needRight} />
//       </div>
//     </section>
//   )
// }
//
// function LegBar({ side, have, target, need }: { side: string; have: number; target: number; need: number }) {
//   const pct = Math.min(100, (have / target) * 100)
//
//   return (
//     <div>
//       <div className="flex items-baseline justify-between text-sm">
//         <span className="font-medium text-text">{side} leg</span>
//         <span className="tabular-nums text-text-muted">
//           {inr(Math.min(have, target))} / {inr(target)}
//         </span>
//       </div>
//       <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white">
//         <div
//           className={cn('h-full rounded-full', need === 0 ? 'bg-success' : 'bg-blue-600')}
//           style={{ width: `${pct}%` }}
//         />
//       </div>
//       <p className={cn('mt-1 text-xs', need === 0 ? 'text-success' : 'text-text-subtle')}>
//         {need === 0 ? 'Target met' : `${inr(need)} more needed`}
//       </p>
//     </div>
//   )
// }

/** Laid out like the company's printed chart: SL, matching pair, reward — plus progress. */
function RewardTable({ left, right, pairs }: { left: number; right: number; pairs: number }) {
  // Progress is held back by the weaker leg — that is what limits the pair.
  const matched = Math.min(left, right)

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">SL</th>
            <th className="px-4 py-3 font-semibold">Matching pair / Amounts</th>
            <th className="px-4 py-3 font-semibold">Reward</th>
            <th className="w-56 px-4 py-3 font-semibold">Your progress</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage, stageIndex) =>
            stage.options.map((milestone, i) => {
              const target = milestone.pairs * PAIR_VALUE
              const done = pairs >= milestone.pairs
              const pct = Math.min(100, (matched / target) * 100)

              return (
                <tr
                  key={`${stage.key}-${milestone.pairs}`}
                  className={cn('hover:bg-neutral-hover/60', i === 1 && 'border-b border-border last:border-0')}
                >
                  {i === 0 && (
                    <td rowSpan={2} className="border-r border-border px-4 py-3 align-middle font-semibold text-text">
                      {stageIndex > 0 && <span className="block text-xs font-normal text-text-subtle">Next</span>}
                      {stage.key}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {i === 1 && <span className="mb-1 block text-xs uppercase text-text-subtle">or</span>}
                    <span className="font-medium tabular-nums text-text">
                      {milestone.pairs}/{milestone.pairs}
                    </span>
                    <span className="text-text-muted">
                      {' '}
                      ({inr(target)} / {inr(target)})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-text">{milestone.reward}</span>
                    <span className="text-text-muted"> ({inr(milestone.rewardValue)})</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-hover">
                      <div
                        className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-blue-600')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-text-subtle">
                      {Math.min(pairs, milestone.pairs)} of {milestone.pairs} pairs ({Math.floor(pct)}%)
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                        <CheckIcon className="h-3 w-3" /> Achieved
                      </span>
                    ) : (
                      <span className="text-xs text-text-subtle">{milestone.pairs - pairs} pairs to go</span>
                    )}
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

// function AllDone() {
//   return (
//     <section className="rounded-card border border-success-border bg-success-bg p-5">
//       <p className="font-semibold text-success">Every Tier I reward level reached</p>
//       <p className="mt-0.5 text-sm text-text-muted">Congratulations — contact the company to claim your rewards.</p>
//     </section>
//   )
// }
