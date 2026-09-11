import { useState } from 'react'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/cn'
import { CheckIcon, EyeIcon, EyeOffIcon } from '@/components/icons/icons'

interface PasswordTextProps {
  value: string | null | undefined
  /** Shown when no readable password is stored for this account. */
  emptyLabel?: ReactNode
  className?: string
}

/**
 * An associate's password for the admin: hidden until the eye is clicked, so it
 * doesn't sit in plain view on screen, with one-click copy either way.
 */
export function PasswordText({ value, emptyLabel = 'Not set', className }: PasswordTextProps) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!value) {
    return <span className={cn('text-xs text-text-subtle', className)}>{emptyLabel}</span>
  }

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      toast.success('Password copied')
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <span className="truncate font-mono text-[13px] text-text" title={shown ? value : undefined}>
        {shown ? value : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        title={shown ? 'Hide password' : 'Show password'}
        className="shrink-0 cursor-pointer rounded p-1 text-text-subtle hover:bg-neutral-hover hover:text-blue-600"
      >
        {shown ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy password"
        title="Copy password"
        className="shrink-0 cursor-pointer rounded px-1 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-neutral-hover"
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : 'Copy'}
      </button>
    </span>
  )
}
