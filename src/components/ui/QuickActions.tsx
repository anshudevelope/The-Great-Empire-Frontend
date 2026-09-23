import { Link } from 'react-router-dom'
import type { IconType } from 'react-icons'

export interface QuickAction {
  label: string
  to: string
  icon: IconType
}

/**
 * A row of shortcut pills into the sections below, used by both dashboards.
 *
 * Shared rather than duplicated per page so the hover behaviour is tuned in one
 * place — the admin and the portal have to feel like the same product.
 *
 * The hover does three things at once instead of only deepening a shadow: the
 * icon's soft tint fills with the accent, the pill lifts, and the label darkens.
 * The icon carries most of it, because it is the only part of the pill with
 * colour to change.
 */
export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className={[
            'group inline-flex items-center gap-2 rounded-pill bg-surface py-2 pl-3 pr-4',
            'text-sm font-medium text-text-muted shadow-card',
            'transition-all duration-200 ease-out',
            'hover:-translate-y-0.5 hover:text-text hover:shadow-card-hover',
            // The lift is decoration; the colour change already carries the
            // meaning, so motion is dropped when the OS asks for less of it.
            'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
          ].join(' ')}
        >
          <span
            className={[
              'flex h-6 w-6 items-center justify-center rounded-full',
              'bg-info-bg text-info',
              'transition-colors duration-200 ease-out',
              'group-hover:bg-blue-600 group-hover:text-white',
            ].join(' ')}
          >
            <action.icon className="h-3.5 w-3.5" />
          </span>
          {action.label}
        </Link>
      ))}
    </nav>
  )
}
