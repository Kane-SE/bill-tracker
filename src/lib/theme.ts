/**
 * Theme handling. A theme = a palette (which colors) + a mode (light/dark).
 * The actual color values live in `src/index.css`, keyed by the `data-theme`
 * attribute this module sets on <html>. To add a palette: add its token blocks
 * in index.css and a new entry to PALETTES below.
 */

export type Palette = 'default' | 'coffee'
export type Mode = 'light' | 'dark'

export interface ThemeChoice {
  palette: Palette
  mode: Mode
}

/** Registered palettes, for the Settings picker. */
export const PALETTES: { value: Palette; label: string }[] = [
  { value: 'default', label: 'Default (Violet)' },
  { value: 'coffee', label: 'Coffee' },
]

const THEME_KEY = 'bill-splitter-theme'
const DEFAULT: ThemeChoice = { palette: 'default', mode: 'dark' }

export function getStoredTheme(): ThemeChoice {
  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_KEY) ?? '')
    const palette: Palette = parsed?.palette === 'coffee' ? 'coffee' : 'default'
    const mode: Mode = parsed?.mode === 'light' ? 'light' : 'dark'
    return { palette, mode }
  } catch {
    return DEFAULT
  }
}

/** Map a choice to the `data-theme` value used by the CSS token blocks. */
export function dataThemeFor({ palette, mode }: ThemeChoice): string {
  if (palette === 'coffee') return mode === 'dark' ? 'coffee-dark' : 'coffee'
  return mode // 'light' | 'dark'
}

export function applyTheme(choice: ThemeChoice): void {
  const el = document.documentElement
  el.dataset.theme = dataThemeFor(choice)
  // Keep the `dark` class in sync so any Tailwind `dark:` utilities still work.
  el.classList.toggle('dark', choice.mode === 'dark')
  localStorage.setItem(THEME_KEY, JSON.stringify(choice))
}
