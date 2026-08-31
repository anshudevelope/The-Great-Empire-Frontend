import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Input } from './Input'
import { Tooltip } from './Tooltip'
import { EyeIcon, EyeOffIcon } from '@/components/icons/icons'

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <Tooltip label={visible ? 'Hide password' : 'Show password'}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-text-subtle hover:text-text"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </Tooltip>
    </div>
  )
})
