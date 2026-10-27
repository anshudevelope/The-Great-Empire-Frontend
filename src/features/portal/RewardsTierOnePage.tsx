import { Navigate } from 'react-router-dom'
import { useActiveBusiness } from '@/store/businessStore'
import { RewardPlan } from './RewardPlan'

/**
 * The Tier I (Insurance) reward chart: each stage offers a smaller reward or,
 * for the larger matching pair, a bigger one. The chart itself comes from the
 * API (config/rewards.js), so the page and the claim check never disagree.
 */
export function RewardsTierOnePage() {
  // The Insurance chart; Plots members have their own (tier-2).
  if (useActiveBusiness() !== 't1') return <Navigate to="/portal/dashboard" replace />
  return <RewardPlan />
}
