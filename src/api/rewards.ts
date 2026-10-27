import { apiRequest } from './fetchClient'
import type { ApiSingleResponse } from '@/types/api'

// Reward claims. The chart and the member's figures come from the API for the
// business they are in; an associate claims a step, the admin approves or
// rejects it. Rewards themselves are handed over outside the system.

export interface RewardOption {
  key: string
  /** Matched business needed on EACH leg, counted from the previous claim. */
  target: number
  reward: string
  rewardValue: number
}
export interface RewardStep {
  key: string
  label: string
  /** One or more rewards; claiming any one completes the step. */
  options: RewardOption[]
}
export interface RewardChart {
  title: string
  /** Tier I counts in pairs of ₹50,000; null = plain rupees. */
  unit: { label: string; value: number } | null
  steps: RewardStep[]
}

export type RewardClaimStatus = 'pending' | 'approved' | 'rejected'

export interface RewardClaim {
  _id: string
  associate: string | { _id: string; memberCode: string; fullName: string; phone?: string }
  memberCode: string
  step: number
  stepLabel: string
  option: string
  reward: string
  rewardValue: number
  target: number
  volume: { left: number; right: number }
  baseline: { left: number; right: number }
  /** Matched business when claimed, counted from the previous claim. */
  matched: number
  status: RewardClaimStatus
  decision: { at: string | null; by: { _id: string; fullName: string } | string | null; note: string }
  createdAt: string
}

export interface MyRewards {
  chart: RewardChart
  /** Lifetime business per leg. */
  volume: { left: number; right: number }
  /** Where the current step is counted from — the last live claim's volume. */
  baseline: { left: number; right: number }
  /** Business per leg since the last live claim. */
  progress: { left: number; right: number }
  matched: number
  /** Index of the step being worked on; steps.length when all are claimed. */
  stepIndex: number
  pendingClaim: string | null
  /** Newest first, rejected ones included. */
  claims: RewardClaim[]
}

export const fetchMyRewards = () => apiRequest<ApiSingleResponse<MyRewards>>('/rewards/me')

export const claimReward = (option: string) =>
  apiRequest<ApiSingleResponse<RewardClaim> & { message: string }>('/rewards/me/claims', { method: 'POST', body: { option } })

/** Admin: the open business's chart. */
export const fetchRewardChart = () => apiRequest<ApiSingleResponse<RewardChart>>('/rewards/chart')

export interface RewardClaimList {
  success: true
  data: RewardClaim[]
  total: number
  page: number
  pages: number
  summary: Record<RewardClaimStatus, number>
}

export const fetchRewardClaims = (params: Record<string, string | undefined> = {}) =>
  apiRequest<RewardClaimList>('/rewards/claims', { params })

export const approveRewardClaim = (id: string, note: string) =>
  apiRequest<ApiSingleResponse<RewardClaim> & { message: string }>(`/rewards/claims/${id}/approve`, {
    method: 'POST',
    body: { note },
  })

export const rejectRewardClaim = (id: string, note: string) =>
  apiRequest<ApiSingleResponse<RewardClaim> & { message: string }>(`/rewards/claims/${id}/reject`, {
    method: 'POST',
    body: { note },
  })
