/**
 * Custom palette engine: derive the full 19-token CSS variable set from 6
 * user-picked base colors. See `src/index.css` for the token list this must
 * match, and `src/shared/lib/theme.ts` for how the tokens get applied.
 */

export interface CustomColors {
  background: string
  foreground: string
  primary: string
  accent: string
  destructive: string
  success: string
}

export const TOKEN_NAMES = [
  'background', 'foreground', 'card', 'card-foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive', 'destructive-foreground', 'success', 'success-foreground', 'border', 'input', 'ring',
]

interface Hsl { h: number; s: number; l: number }

function hexToHsl(hex: string): Hsl {
  const clean = hex.replace('#', '').trim()
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  let s = 0
  let h = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function token({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`
}

export function hexToHslToken(hex: string): string {
  return token(hexToHsl(hex))
}

function clampL(hsl: Hsl, delta: number): Hsl {
  return { ...hsl, l: Math.min(100, Math.max(0, hsl.l + delta)) }
}

/** Pick black or white text (as a token) for readability on a background color. */
function readableOn(bg: Hsl): string {
  return bg.l >= 60 ? '0 0% 12%' : '0 0% 100%'
}

export function deriveTokens(c: CustomColors): Record<string, string> {
  const bg = hexToHsl(c.background)
  const fg = hexToHsl(c.foreground)
  const primary = hexToHsl(c.primary)
  const accent = hexToHsl(c.accent)
  const destructive = hexToHsl(c.destructive)
  const success = hexToHsl(c.success)
  const isLight = bg.l >= 50

  const surfaceStep = isLight ? -6 : 8
  const secondary = clampL({ ...bg, s: Math.min(bg.s + 4, 100) }, surfaceStep)
  const border = clampL(bg, isLight ? -12 : 14)
  const muted = secondary
  const mutedFg = clampL(fg, isLight ? 30 : -28)

  return {
    background: token(bg),
    foreground: token(fg),
    card: token(clampL(bg, isLight ? 2 : 4)),
    'card-foreground': token(fg),
    primary: token(primary),
    'primary-foreground': readableOn(primary),
    secondary: token(secondary),
    'secondary-foreground': token(fg),
    muted: token(muted),
    'muted-foreground': token(mutedFg),
    accent: token(accent),
    'accent-foreground': readableOn(accent),
    destructive: token(destructive),
    'destructive-foreground': readableOn(destructive),
    success: token(success),
    'success-foreground': readableOn(success),
    border: token(border),
    input: token(border),
    ring: token(primary),
  }
}
