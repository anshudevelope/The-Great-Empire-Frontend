import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
  /**
   * 'end' lines the tooltip up with the trigger's right edge so it grows
   * leftwards. Use it on right-most controls: the hidden tooltip still takes up
   * layout space, and a centered one there sticks out past the page edge and
   * causes a horizontal scrollbar.
   */
  align?: 'center' | 'end'
}

// Pure CSS (group-hover/focus-within), so hovering many rows of these never re-renders React.
export function Tooltip({ label, children, side = 'top', align = 'center' }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex focus-within:z-10 hover:z-10">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-blue-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-popover transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  )
}
