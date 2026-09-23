import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-control border bg-surface px-3 text-sm text-text placeholder:text-text-subtle',
        'transition-shadow focus:outline-none focus:ring-[3px] focus:ring-blue-600/20 focus:border-blue-500',
        'disabled:bg-surface-sunken disabled:text-text-subtle',
        invalid ? 'border-danger' : 'border-border-strong',
        className,
      )}
      {...props}
    />
  )
})
