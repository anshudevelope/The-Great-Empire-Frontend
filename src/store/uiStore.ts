import { create } from 'zustand'

/**
 * 'system' follows the OS and keeps following it as the OS changes; 'light' and
 * 'dark' are an explicit override that sticks.
 */
export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_KEY = 'ge-theme'

/** localStorage throws in some privacy modes, so every access is guarded. */
function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* unavailable — fall through to the default */
  }
  return 'system'
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export type ResolvedTheme = 'light' | 'dark'

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? (prefersDark() ? 'dark' : 'light') : preference
}

/** Resolves a preference to the theme actually painted, and applies it. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolve(preference)
  document.documentElement.setAttribute('data-theme', resolved)
  return resolved
}

interface UIState {
  mobileSidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: ThemePreference
  /**
   * What is actually painted right now. Kept in the store rather than read off
   * the DOM at render time: React Compiler is enabled here, and a DOM read
   * during render can be memoised, leaving the toggle's icon stale.
   */
  resolvedTheme: ResolvedTheme
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleSidebarCollapsed: () => void
  setTheme: (theme: ThemePreference) => void
  /** What the topbar control does: flips between light and dark. */
  toggleTheme: () => void
}

const initialTheme = readStoredTheme()

export const useUIStore = create<UIState>((set, get) => ({
  mobileSidebarOpen: false,
  sidebarCollapsed: false,
  theme: initialTheme,
  resolvedTheme: resolve(initialTheme),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => {
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* the choice still applies for this session */
    }
    set({ theme, resolvedTheme: applyTheme(theme) })
  },
  toggleTheme: () => {
    // Flipping the *resolved* theme means that from 'system' this lands on the
    // opposite of whatever the OS is showing, so the control always visibly
    // changes something.
    get().setTheme(get().resolvedTheme === 'dark' ? 'light' : 'dark')
  },
}))

/**
 * Keeps a 'system' preference in step with the OS while the app is open.
 * Returns an unsubscribe so main.tsx can tear it down.
 */
export function watchSystemTheme() {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return () => {}
  const onChange = () => {
    if (useUIStore.getState().theme !== 'system') return
    useUIStore.setState({ resolvedTheme: applyTheme('system') })
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
