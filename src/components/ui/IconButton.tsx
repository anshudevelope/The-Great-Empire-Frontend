import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

export type IconActionTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

// Semantic per-action color so Approve/Reject/Delete/etc. are recognizable by
// color alone, matching the tones already used for status Badges.
const toneClasses: Record<IconActionTone, string> = {
  neutral: 'text-text-muted hover:bg-neutral-hover hover:text-text',
  info: 'text-text-muted hover:bg-info-bg hover:text-info',
  success: 'text-text-muted hover:bg-success-bg hover:text-success',
  warning: 'text-text-muted hover:bg-warning-bg hover:text-warning',
  danger: 'text-text-muted hover:bg-danger-bg hover:text-danger',
}

const iconButtonBaseClasses =
  'inline-flex cursor-pointer items-center justify-center rounded-control p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  tone?: IconActionTone
  tooltipSide?: 'top' | 'bottom'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tone = 'neutral', tooltipSide = 'top', className, ...props },
  ref,
) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(iconButtonBaseClasses, toneClasses[tone], className)}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  )
})

interface IconLinkProps extends LinkProps {
  icon: ReactNode
  label: string
  tone?: IconActionTone
  tooltipSide?: 'top' | 'bottom'
}

export function IconLink({ icon, label, tone = 'neutral', tooltipSide = 'top', className, ...props }: IconLinkProps) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      <Link aria-label={label} className={cn(iconButtonBaseClasses, toneClasses[tone], className)} {...props}>
        {icon}
      </Link>
    </Tooltip>
  )
}
