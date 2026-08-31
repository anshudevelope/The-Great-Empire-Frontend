import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'info' | 'inverse'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 disabled:bg-navy-300',
  secondary: 'bg-white text-text border border-border-strong hover:bg-navy-50 disabled:text-text-subtle',
  ghost: 'bg-transparent text-text-muted hover:bg-navy-50 hover:text-text',
  danger: 'bg-danger text-white hover:brightness-95 disabled:opacity-60',
  // Semantic outline variants so an action's color matches what it does
  // (e.g. Approve/Reject/Edit on the associate detail page), same tones as Badge/IconButton.
  success: 'border border-success-border bg-success-bg text-success hover:brightness-95',
  warning: 'border border-warning-border bg-warning-bg text-warning hover:brightness-95',
  info: 'border border-info-border bg-info-bg text-info hover:brightness-95',
  // For use on dark surfaces (e.g. the navy landing page header) — kept separate from
  // `secondary` so callers never need to override its background/text via className,
  // which would be a no-op fight against Tailwind's stylesheet-order specificity.
  inverse: 'bg-transparent text-white border border-navy-600 hover:bg-navy-900',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, leftIcon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600',
        'cursor-pointer disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner className="h-4 w-4" /> : leftIcon}
      {children}
    </button>
  )
})
