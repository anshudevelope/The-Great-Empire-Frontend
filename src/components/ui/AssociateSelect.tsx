import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchAssociates } from '@/api/associates'
import type { AssociateOption } from '@/api/associates'
import { cn } from '@/lib/cn'
import { formatTier } from '@/lib/tier'
import { Input } from './Input'
import { Spinner } from './Spinner'

interface AssociateSelectProps {
  value: AssociateOption | null
  onChange: (option: AssociateOption | null) => void
  /** Restrict results — 'associate' for a sponsor, omit for receivedBy (staff or member). */
  role?: 'admin' | 'associate'
  /** e.g. 'approved' for a sponsor picker. */
  status?: string
  /** Keeps an associate out of their own parent list when editing. */
  exclude?: string
  /** Only members already in the tree — sponsors and parents must be. */
  inTree?: boolean
  /** Only members who can still be given a sponsor: unplaced and unsponsored. */
  referable?: boolean
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
  inTree,
  referable,
  placeholder,
  invalid,
  id,
}: AssociateSelectProps) {
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
    queryKey: ['associate-search', debounced, role, status, exclude, inTree, referable],
    queryFn: () =>
      searchAssociates(debounced, {
        role,
        status,
        exclude,
        inTree: inTree ? 'true' : undefined,
        referable: referable ? 'true' : undefined,
      }),
    enabled: open,
  })

  const options = data?.data ?? []

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-control border border-border-strong bg-surface px-3 py-2">
        <span className="truncate text-sm text-text">{value.label}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setTerm('')
          }}
          className="cursor-pointer text-xs font-medium text-blue-600 hover:text-info"
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
        placeholder={placeholder ?? 'Search by name or ID…'}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value)
          setOpen(true)
        }}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-card bg-surface py-1 shadow-popover">
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
              <span className="text-sm font-medium text-text">{option.label}</span>
              <span className="text-xs text-text-subtle">
                {option.email}
                {option.tier ? ` · ${formatTier(option.tier)}` : ''}
                {option.treeStatus === 'unplaced' ? ' · not in tree' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
