import type { AssociateStatus } from '@/types/associate'

export const STATUS_TONE: Record<AssociateStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}
