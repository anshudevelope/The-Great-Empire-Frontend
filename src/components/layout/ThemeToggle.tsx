import { useUIStore } from '@/store/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { MoonIcon, SunIcon } from '@/components/icons/icons'

/**
 * Flips between light and dark. Sits on the chrome, so it matches the mobile
 * menu button's dimensions and uses the same white-overlay hover.
 *
 * The icon shows the theme you'd switch *to*, which is the convention users
 * already read correctly — a sun means "go light".
 */
export function ThemeToggle() {
  // The resolved theme, not the preference: 'system' would tell us nothing
  // about which icon to show.
  const isDark = useUIStore((state) => state.resolvedTheme === 'dark')
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        // Announces the control as a toggle rather than a plain button.
        aria-pressed={isDark}
        className="cursor-pointer rounded-control p-2 text-on-chrome-muted transition-colors hover:bg-chrome-hover hover:text-on-chrome"
      >
        {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
      </button>
    </Tooltip>
  )
}
