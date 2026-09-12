import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ChevronDownIcon, SearchIcon } from '@/components/icons/icons'
import { Input } from './Input'
import { Spinner } from './Spinner'

interface SearchSelectProps<T> {
  id?: string
  value: T | null
  onChange: (option: T) => void
  /** The current result list — the caller searches (usually server-side) on `search`. */
  options: T[]
  getKey: (option: T) => string
  /** How the chosen option looks in the closed field. */
  renderValue: (option: T) => ReactNode
  /** How each row looks in the dropdown. */
  renderOption: (option: T) => ReactNode
  search: string
  onSearchChange: (term: string) => void
  loading?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

/**
 * A closed field that opens into a search box with a dropdown list.
 *
 * Closes on pick, click outside, Escape or Tab — Escape is kept from reaching a
 * surrounding Modal, so it closes only the list. Arrow keys move through the
 * list and Enter picks.
 */
export function SearchSelect<T>({
  id,
  value,
  onChange,
  options,
  getKey,
  renderValue,
  renderOption,
  search,
  onSearchChange,
  loading,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        onSearchChange('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onSearchChange])

  const close = () => {
    setOpen(false)
    onSearchChange('')
  }

  const choose = (option: T) => {
    onChange(option)
    close()
  }

  const activeIndex = Math.min(active, Math.max(options.length - 1, 0))
  const selectedKey = value ? getKey(value) : null

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(activeIndex + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(activeIndex - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (options[activeIndex]) choose(options[activeIndex])
    } else if (event.key === 'Escape') {
      // Close just this list, not the dialog around it.
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => {
            setActive(0)
            setOpen(true)
          }}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-control border border-border-strong bg-white px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-hover"
        >
          <span className="min-w-0 flex-1">
            {value ? renderValue(value) : <span className="text-text-subtle">{placeholder}</span>}
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-text-subtle" />
        </button>
      ) : (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Input
            id={id}
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls={listId}
            autoComplete="off"
            className="pl-9"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-card border border-border bg-white py-1 shadow-popover"
        >
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-subtle">
              <Spinner className="h-3.5 w-3.5" /> Searching…
            </li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-text-subtle">{emptyText}</li>
          ) : (
            options.map((option, index) => {
              const key = getKey(option)
              return (
                <li
                  key={key}
                  role="option"
                  aria-selected={key === selectedKey}
                  // Keep focus in the search box so the click lands before it closes.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5',
                    key === selectedKey ? 'bg-blue-50' : index === activeIndex && 'bg-neutral-hover',
                  )}
                >
                  {renderOption(option)}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
