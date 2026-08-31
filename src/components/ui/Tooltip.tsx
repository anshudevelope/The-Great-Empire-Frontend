import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
}

// Pure CSS (group-hover/focus-within), so hovering many rows of these never re-renders React.
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex focus-within:z-10 hover:z-10">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-popover transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  )
}
