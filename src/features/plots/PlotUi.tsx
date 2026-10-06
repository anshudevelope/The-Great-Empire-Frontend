import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useActiveBusiness } from '@/store/businessStore'
import { Button } from '@/components/ui/Button'

// Layout pieces shared by the plot module's screens. Same tokens and shapes as
// the rest of the console (cards, stats, pager), kept here so the module does
// not reach into another feature's files.

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Section({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card bg-surface p-5 shadow-card', className)}>
      {title && <h2 className="mb-4 text-sm font-semibold text-text">{title}</h2>}
      {children}
    </div>
  )
}

/** Form grid used inside a Section. */
export function FieldGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2',
        columns >= 3 && 'lg:grid-cols-3',
        columns === 4 && 'xl:grid-cols-4',
      )}
    >
      {children}
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'warn' | 'good' }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-xs text-text-subtle">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'accent' ? 'text-info' : tone === 'warn' ? 'text-danger' : tone === 'good' ? 'text-success' : 'text-text',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-text-subtle">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

/** A scrolling table card with the console's header styling. */
export function DataTable({ head, children, minWidth = 880 }: { head: ReactNode; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-text-subtle">
          {head}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const Th = ({ children, right }: { children?: ReactNode; right?: boolean }) => (
  <th className={cn('px-4 py-3 font-semibold', right && 'text-right')}>{children}</th>
)

export const Td = ({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <td className={cn('px-4 py-3 align-middle', right && 'text-right tabular-nums', className)}>{children}</td>
)


/** Status pills as a tab strip: "All 13 · Available 10 · Hold 1 · Booked 2". */
export function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-control bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'cursor-pointer rounded-control px-3 py-1.5 text-sm font-medium transition-colors',
            tab.value === value ? 'bg-info-bg text-info' : 'text-text-muted hover:bg-neutral-hover hover:text-text',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs tabular-nums opacity-80">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Wraps the module's routes: the property / plot-sales screens exist only in T2. */
export function RequireT2({ children }: { children: ReactNode }) {
  const business = useActiveBusiness()
  if (business !== 't2') return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}
