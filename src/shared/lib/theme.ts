/**
 * Theme handling. A theme = a palette (which colors) + a mode (light/dark).
 * The actual color values live in `src/index.css`, keyed by the `data-theme`
 * attribute this module sets on <html>. To add a palette: add its token blocks
 * in index.css and a new entry to PALETTES below.
 *
 * The 'custom' palette is different: its tokens aren't in index.css at all
 * (beyond a placeholder `--radius`). They're derived from 6 user-picked base
 * colors via `deriveTokens` and applied as inline CSS variables on <html>.
 */

import { deriveTokens, TOKEN_NAMES, type CustomColors } from '@/shared/lib/palette'

export type Palette = 'default' | 'coffee' | 'custom'
export type Mode = 'light' | 'dark'

export interface ThemeChoice {
  palette: Palette
  mode: Mode
  custom?: CustomColors
}

/** Registered palettes, for the Settings picker. */
export const PALETTES: { value: Palette; label: string }[] = [
  { value: 'default', label: 'Default (Violet)' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'custom', label: 'Custom' },
]

const THEME_KEY = 'bill-splitter-theme'
const DEFAULT: ThemeChoice = { palette: 'default', mode: 'dark' }

/** Fallback base colors for the custom palette until the user picks their own. */
export const DEFAULT_CUSTOM: CustomColors = {
  background: '#0f1117', foreground: '#f2f3f7', primary: '#6d5efc',
  accent: '#241f3a', destructive: '#e5484d', success: '#30a46c',
}

export function getStoredTheme(): ThemeChoice {
  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_KEY) ?? '')
    const palette: Palette =
      parsed?.palette === 'coffee' ? 'coffee' : parsed?.palette === 'custom' ? 'custom' : 'default'
    const mode: Mode = parsed?.mode === 'light' ? 'light' : 'dark'
    const custom: CustomColors | undefined =
      palette === 'custom' && parsed?.custom ? (parsed.custom as CustomColors) : undefined
    return { palette, mode, ...(custom ? { custom } : {}) }
  } catch {
    return DEFAULT
  }
}

/** Map a choice to the `data-theme` value used by the CSS token blocks. */
export function dataThemeFor({ palette, mode }: ThemeChoice): string {
  if (palette === 'coffee') return mode === 'dark' ? 'coffee-dark' : 'coffee'
  if (palette === 'custom') return 'custom'
  return mode // 'light' | 'dark'
}

export function applyTheme(choice: ThemeChoice): void {
  const el = document.documentElement
  // Always clear any previously-applied inline custom vars first, so
  // switching custom -> default/coffee fully reverts to the CSS-defined tokens.
  for (const name of TOKEN_NAMES) el.style.removeProperty(`--${name}`)

  if (choice.palette === 'custom') {
    const tokens = deriveTokens(choice.custom ?? DEFAULT_CUSTOM)
    for (const [name, value] of Object.entries(tokens)) el.style.setProperty(`--${name}`, value)
    el.dataset.theme = 'custom'
    el.classList.remove('dark') // custom is a single fixed set; mode is ignored
  } else {
    el.dataset.theme = dataThemeFor(choice)
    // Keep the `dark` class in sync so any Tailwind `dark:` utilities still work.
    el.classList.toggle('dark', choice.mode === 'dark')
  }
  localStorage.setItem(THEME_KEY, JSON.stringify(choice))
}
