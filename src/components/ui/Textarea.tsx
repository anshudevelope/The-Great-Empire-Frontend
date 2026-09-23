import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-control border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle',
        'transition-shadow focus:outline-none focus:ring-[3px] focus:ring-blue-600/20 focus:border-blue-500',
        'disabled:bg-surface-sunken disabled:text-text-subtle',
        invalid ? 'border-danger' : 'border-border-strong',
        className,
      )}
      {...props}
    />
  )
})
