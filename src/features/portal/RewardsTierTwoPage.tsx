import { Navigate } from 'react-router-dom'
import { useActiveBusiness } from '@/store/businessStore'
import { RewardPlan } from './RewardPlan'

/** /portal/rewards opens the plan of the business the member is working in. */
export function RewardsIndex() {
  return <Navigate to={useActiveBusiness() === 't2' ? 'tier-2' : 'tier-1'} replace />
}

/**
 * The Tier II (Plots) reward chart: one reward per level, each counted on the
 * commissionable plot business since the member's previous claim.
 */
export function RewardsTierTwoPage() {
  if (useActiveBusiness() !== 't2') return <Navigate to="/portal/dashboard" replace />
  return <RewardPlan />
}
