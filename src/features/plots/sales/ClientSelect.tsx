import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchClients, type Client } from '@/api/plots'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { PlusIcon, SearchIcon } from '@/components/icons/icons'
import { cn } from '@/lib/cn'

interface ClientSelectProps {
  value: Client | null
  onChange: (client: Client | null) => void
  /** "Add new client" — receives what was typed, to prefill the form. */
  onAddNew: (term: string) => void
  id?: string
}

/**
 * Searchable client picker: type any part of the name, mobile, email or client
 * code. Keyboard: ↑/↓ to move, Enter to pick, Esc to close. The last row adds
 * a new client prefilled with what was typed.
 */
export function ClientSelect({ value, onChange, onAddNew, id }: ClientSelectProps) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250)
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
    queryKey: ['plot-clients', 'picker', debounced],
    queryFn: () => fetchClients({ search: debounced || undefined, limit: '8' }),
    enabled: open,
  })
  const options = data?.data ?? []
  // Options, then the "add new" row, as one keyboard-navigable list.
  const rowCount = options.length + 1
  const activeIndex = Math.min(active, rowCount - 1)

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const pick = (client: Client) => {
    if (client.status !== 'active') return
    onChange(client)
    setOpen(false)
    setTerm('')
  }
  const addNew = () => {
    setOpen(false)
    onAddNew(term.trim())
  }

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-strong bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-info-bg text-sm font-semibold text-info">
            {value.fullName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {value.title ? `${value.title} ` : ''}
              {value.fullName} <span className="font-mono text-xs font-normal text-text-subtle">{value.code}</span>
            </p>
            <p className="truncate text-xs text-text-muted">
              {[value.mobile, value.email, value.city].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer text-xs font-medium text-info hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle" />
      <Input
        id={id}
        value={term}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? `${id}-list` : undefined}
        placeholder="Search by name, mobile, email or client code…"
        className="pl-9"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, rowCount - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && open) {
            e.preventDefault()
            if (activeIndex < options.length) pick(options[activeIndex])
            else addNew()
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />

      {open && (
        <div
          ref={listRef}
          id={id ? `${id}-list` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-card border border-border bg-surface py-1 shadow-popover"
        >
          {isFetching && !options.length && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-subtle">
              <Spinner className="h-3.5 w-3.5" /> Searching…
            </div>
          )}
          {!isFetching && options.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-subtle">
              {debounced ? `No client matches “${debounced}”.` : 'No clients yet.'}
            </p>
          )}
          {options.map((client, i) => {
            const inactive = client.status !== 'active'
            return (
              <button
                key={client._id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                aria-disabled={inactive}
                data-row={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(client)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                  inactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  i === activeIndex && !inactive && 'bg-neutral-hover',
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-info-bg text-xs font-semibold text-info">
                  {client.fullName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">
                    {client.fullName} <span className="font-mono text-xs font-normal text-text-subtle">{client.code}</span>
                  </span>
                  <span className="block truncate text-xs text-text-subtle">
                    {[client.mobile, client.email, client.city].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {inactive && <span className="text-[11px] text-text-subtle">inactive</span>}
              </button>
            )
          })}
          <button
            type="button"
            data-row={options.length}
            onMouseEnter={() => setActive(options.length)}
            onClick={addNew}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-info transition-colors',
              activeIndex === options.length && 'bg-neutral-hover',
            )}
          >
            <PlusIcon className="h-4 w-4" />
            {term.trim() ? `Add “${term.trim()}” as a new client` : 'Add new client'}
          </button>
        </div>
      )}
    </div>
  )
}
