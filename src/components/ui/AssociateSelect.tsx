import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchAssociates } from '@/api/associates'
import type { AssociateOption } from '@/api/associates'
import { cn } from '@/lib/cn'
import { Input } from './Input'
import { Spinner } from './Spinner'

interface AssociateSelectProps {
  value: AssociateOption | null
  onChange: (option: AssociateOption | null) => void
  /** Restrict results — 'associate' for issuedTo, omit for receivedBy (staff or member). */
  role?: 'admin' | 'associate'
  /** e.g. 'approved' for a sponsor picker. */
  status?: string
  /** Keeps an associate out of their own sponsor list when editing. */
  exclude?: string
  /** Only members who can still be referred: unplaced and unsponsored. */
  referable?: boolean
  /** Show the Sponsor ID (SPN####) instead of the member code in each row. */
  showSponsorCode?: boolean
  placeholder?: string
  invalid?: boolean
  id?: string
}

export function AssociateSelect({
  value,
  onChange,
  role,
  status,
  exclude,
  referable,
  showSponsorCode,
  placeholder,
  invalid,
  id,
}: AssociateSelectProps) {
  // Sponsor pickers identify people by Sponsor ID; everything else by member code.
  const labelFor = (option: AssociateOption) =>
    (showSponsorCode ? option.sponsorLabel : option.label) ?? option.label
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced so a search endpoint isn't hit on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250)
    return () => clearTimeout(timer)
  }, [term])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['associate-search', debounced, role, status, exclude, referable],
    queryFn: () =>
      searchAssociates(debounced, { role, status, exclude, referable: referable ? 'true' : undefined }),
    enabled: open,
  })

  const options = data?.data ?? []

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-control border border-border-strong bg-white px-3 py-2">
        <span className="truncate text-sm text-text">{labelFor(value)}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setTerm('')
          }}
          className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={term}
        invalid={invalid}
        autoComplete="off"
        placeholder={placeholder ?? 'Search by name or code…'}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value)
          setOpen(true)
        }}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-card border border-border bg-white py-1 shadow-popover">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-subtle">
              <Spinner className="h-3.5 w-3.5" /> Searching…
            </div>
          )}
          {!isFetching && options.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-subtle">No matches</p>
          )}
          {options.map((option) => (
            <button
              key={option._id}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={cn(
                'flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors',
                'hover:bg-neutral-hover',
              )}
            >
              <span className="text-sm font-medium text-text">{labelFor(option)}</span>
              <span className="text-xs text-text-subtle">
                {/* Show the other code too, so a row is identifiable either way. */}
                {showSponsorCode ? option.memberCode : option.sponsorCode}
                {option.email ? ` · ${option.email}` : ''}
                {option.tier ? ` · ${option.tier}` : ''}
                {option.treeStatus === 'unplaced' ? ' · not in tree' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
