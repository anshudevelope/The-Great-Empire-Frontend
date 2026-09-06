import { apiRequest } from './fetchClient'
import type { ApiSingleResponse } from '@/types/api'

export interface TreeNodeData {
  _id: string
  memberCode: string
  fullName: string
  email: string
  phone: string
  status: string
  tier: string
  position: string | null
  profileImage?: { url: string; public_id: string }
  sponsorCode: string | null
  parentCode: string | null
  depth: number
  directCount: number
  joinedAt: string
  /** Raw pointers — distinguish an empty slot from a child beyond the fetch depth. */
  leftChild: string | null
  rightChild: string | null
  /** Sponsor ≠ placement parent: this member was moved down a leg by spillover. */
  isSpillover: boolean
  left: TreeNodeData | null
  right: TreeNodeData | null
  hasMoreLeft: boolean
  hasMoreRight: boolean
}

export interface BinaryTreeResponse {
  success: true
  meta: { rootDepth: number; depth: number; nodesReturned: number }
  data: TreeNodeData
}

export interface SponsorTreeNode extends Omit<TreeNodeData, 'left' | 'right' | 'hasMoreLeft' | 'hasMoreRight'> {
  children: SponsorTreeNode[]
  hasMore: boolean
}

export interface DirectRow extends Omit<TreeNodeData, 'left' | 'right' | 'hasMoreLeft' | 'hasMoreRight'> {
  placedUnder: { memberCode: string | null; fullName: string | null } | null
}

const withId = (base: string, id?: string) => (id ? `${base}/${id}` : base)

export function fetchBinaryTree(id?: string, depth = 3): Promise<BinaryTreeResponse> {
  return apiRequest<BinaryTreeResponse>(withId('/tree/binary', id), { params: { depth: String(depth) } })
}

export function fetchSponsorTree(id?: string, depth = 3): Promise<ApiSingleResponse<SponsorTreeNode>> {
  return apiRequest<ApiSingleResponse<SponsorTreeNode>>(withId('/tree/sponsor', id), {
    params: { depth: String(depth) },
  })
}

export function fetchDirects(id?: string): Promise<{ success: true; count: number; data: DirectRow[] }> {
  return apiRequest<{ success: true; count: number; data: DirectRow[] }>(withId('/tree/directs', id))
}
