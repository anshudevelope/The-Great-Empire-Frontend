import { cn } from '@/lib/cn'

/**
 * Placeholder block for loading states.
 *
 * Prefer this over a centred spinner wherever the final layout is known: the
 * page keeps its shape, so content doesn't jump when the data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-neutral-hover', className)} />
}
