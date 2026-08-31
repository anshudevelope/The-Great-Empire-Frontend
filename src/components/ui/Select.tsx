import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { ChevronDownIcon } from '@/components/icons/icons'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, containerClassName, ...props },
  ref,
) {
  return (
    <div className={cn('relative', containerClassName)}>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-control border bg-white pl-3 pr-9 text-sm text-text',
          'focus:outline-none focus:ring-2 focus:ring-blue-700/25 focus:border-blue-500',
          'disabled:bg-neutral-hover disabled:text-text-subtle',
          invalid ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
    </div>
  )
})
