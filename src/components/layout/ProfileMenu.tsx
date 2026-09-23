import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { ChevronDownIcon, LogoutIcon, ShieldIcon } from '@/components/icons/icons'

interface ProfileMenuProps {
  name: string
  /** Shown under the name — e.g. the associate ID. */
  subtitle?: string | null
  /** Codes read better in mono; an email or a role doesn't. */
  monoSubtitle?: boolean
  /**
   * The trigger sits on the solid blue topbar rather than a light surface, so
   * it inverts. Only the trigger changes — the dropdown stays a light popover,
   * because it opens over the content canvas, not the chrome.
   */
  onChrome?: boolean
  onChangePassword: () => void
  onLogout: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || 'A'
}

/**
 * Profile button with an account menu (Change password, Log out).
 *
 * Opens on hover, and on click too — hover alone doesn't exist on touch
 * screens or for keyboard users. Closes on leaving, clicking outside, or Esc.
 */
export function ProfileMenu({
  name,
  subtitle,
  monoSubtitle = true,
  onChrome = false,
  onChangePassword,
  onLogout,
}: ProfileMenuProps) {
  const subtitleClass = cn('text-[11px]', onChrome ? 'text-on-chrome-subtle' : 'text-text-subtle', monoSubtitle && 'font-mono')
  // The menu panel always renders on the light canvas, so its own subtitles
  // keep the light-surface colour even when the trigger is inverted.
  const panelSubtitleClass = cn('text-[11px] text-text-subtle', monoSubtitle && 'font-mono')

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // A short grace period so moving the pointer from the button into the menu
  // doesn't close it on the way.
  const closeTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 150)
  }
  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div ref={containerRef} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-pill py-1 pl-1 pr-3 transition-colors',
          // A *filled* pill rather than an outlined one: it reads as a contained
          // control on the chrome without reintroducing a hairline.
          onChrome
            ? 'border-0 bg-chrome-hover hover:bg-chrome-active'
            : 'border border-border bg-surface hover:bg-neutral-hover',
        )}
      >
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
            // The accent, not a white overlay: inside a filled pill an overlay
            // avatar would sit at almost the same value as the pill itself.
            onChrome ? 'bg-chrome-selected text-on-chrome' : 'bg-linear-to-br from-blue-600 to-blue-800 text-white',
          )}
        >
          {initials(name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span
            className={cn(
              'block max-w-40 truncate text-sm font-medium',
              onChrome ? 'text-on-chrome' : 'text-text',
            )}
          >
            {name}
          </span>
          {subtitle && <span className={cn('block max-w-40 truncate', subtitleClass)}>{subtitle}</span>}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 transition-transform',
            onChrome ? 'text-on-chrome-subtle' : 'text-text-subtle',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        // pt-2 is part of the hover area, so there's no gap to fall through.
        <div className="absolute right-0 top-full z-40 pt-2">
          <div role="menu" className="w-56 overflow-hidden rounded-card bg-surface py-1 shadow-popover">
            <div className="border-b border-border px-4 py-2.5">
              <p className="truncate text-sm font-medium text-text">{name}</p>
              {subtitle && <p className={cn('truncate', panelSubtitleClass)}>{subtitle}</p>}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onChangePassword)}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-text transition-colors hover:bg-neutral-hover"
            >
              <ShieldIcon className="h-4 w-4 text-text-subtle" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onLogout)}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
            >
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
