import { useQuery } from '@tanstack/react-query'
import { fetchRewardChart } from '@/api/rewards'
import { useActiveBusiness } from '@/store/businessStore'
import { Spinner } from '@/components/ui/Spinner'
import { DataTable, PageHeader, Td, Th } from '@/features/plots/PlotUi'
import { inr } from '@/features/portal/rewardFormat'

/**
 * Rewards → Structure: the open business's reward chart, read-only. The same
 * chart associates see and claims are checked against (config/rewards.js).
 */
export function RewardStructurePage() {
  const business = useActiveBusiness()
  const { data, isLoading, isError } = useQuery({ queryKey: ['reward-chart', business], queryFn: fetchRewardChart })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (isError || !data) return <p className="text-sm text-danger">Could not load the reward structure.</p>

  const chart = data.data
  const { unit } = chart

  return (
    <div>
      <PageHeader
        title={`Reward structure · ${chart.title}`}
        description={
          (unit
            ? `Earned on matching pairs — one pair is ${inr(unit.value)} of business on both the left and right legs. Each stage offers one reward or the other.`
            : 'Earned on matching plot business — each amount is needed on both the left and right legs.') +
          ' Steps are claimed in order, and each claim starts the next step from zero.'
        }
      />

      <DataTable
        minWidth={640}
        head={
          <tr>
            <Th>SL</Th>
            <Th>Matching {unit ? 'pair' : 'amount'} (each leg)</Th>
            <Th>Reward</Th>
            <Th right>Reward value</Th>
          </tr>
        }
      >
        {chart.steps.map((step, si) =>
          step.options.map((option, oi) => (
            <tr key={option.key} className={oi === step.options.length - 1 ? 'border-b border-border last:border-0' : undefined}>
              {oi === 0 && (
                <td rowSpan={step.options.length} className="border-r border-border px-4 py-3 align-middle font-semibold text-text">
                  {si + 1}
                  <span className="block text-xs font-normal text-text-subtle">{step.label}</span>
                </td>
              )}
              <Td>
                {oi > 0 && <span className="mb-1 block text-xs uppercase text-text-subtle">or</span>}
                {unit ? (
                  <>
                    <span className="font-medium tabular-nums text-text">
                      {option.target / unit.value}/{option.target / unit.value} {unit.label}
                    </span>
                    <span className="block text-xs tabular-nums text-text-muted">
                      {inr(option.target)} / {inr(option.target)}
                    </span>
                  </>
                ) : (
                  <span className="font-medium tabular-nums text-text">
                    {inr(option.target)} / {inr(option.target)}
                  </span>
                )}
              </Td>
              <Td className="font-medium text-text">{option.reward}</Td>
              <Td right className="text-text">
                {inr(option.rewardValue)}
              </Td>
            </tr>
          )),
        )}
      </DataTable>
    </div>
  )
}
