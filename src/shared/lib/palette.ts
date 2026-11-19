/**
 * Custom palette engine: derive the full 22-token CSS variable set from 6
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
  'destructive', 'destructive-foreground', 'success', 'success-foreground', 'warning', 'new', 'new-foreground',
  'border', 'input', 'ring',
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

/** Inverse of `hexToHslToken`: "H S% L%" -> "#rrggbb", or null if unparseable. */
export function hslTokenToHex(tok: string): string | null {
  const m = tok.trim().match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!m) return null
  const h = Number(m[1])
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function clampL(hsl: Hsl, delta: number): Hsl {
  return { ...hsl, l: Math.min(100, Math.max(0, hsl.l + delta)) }
}

/** WCAG relative luminance of an "H S% L%" token (0 = black, 1 = white). */
function luminance(tok: string): number {
  const hex = hslTokenToHex(tok)
  if (!hex) throw new Error(`Not an "H S% L%" token: "${tok}"`)
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two "H S% L%" tokens, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Gold for "new" marks on `card`: the theme gold when it stands out 3:1, otherwise
 * the nearest lightness of the same gold that does (a mid-grey card needs a much
 * darker or paler gold). Falls back to the best contrast found.
 */
function goldFor(card: string, isLight: boolean): Hsl {
  const base: Hsl = isLight ? { h: 36, s: 90, l: 33 } : { h: 40, s: 92, l: 58 }
  let best = base
  for (let d = 0; d <= 100; d++) {
    for (const l of [base.l - d, base.l + d]) {
      if (l < 0 || l > 100) continue
      const c = { ...base, l }
      if (contrastRatio(token(c), card) >= 3) return c
      if (contrastRatio(token(c), card) > contrastRatio(token(best), card)) best = c
    }
  }
  return best
}

/** White or near-black text on the gold, whichever reads better. */
function textOnGold(gold: Hsl): string {
  const [white, dark] = ['0 0% 100%', '30 60% 8%']
  return contrastRatio(white, token(gold)) >= contrastRatio(dark, token(gold)) ? white : dark
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

  const card = token(clampL(bg, isLight ? 2 : 4))
  const gold = goldFor(card, isLight)

  return {
    background: token(bg),
    foreground: token(fg),
    card,
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
    // Amber for "waiting"/"quiet" signals. Fixed hue so it reads as a warning in any custom palette.
    warning: isLight ? '30 90% 31%' : '38 92% 60%',
    // Gold for songs new in the patch (Pump): fixed hue, so it reads as "new" in any palette, never as primary.
    new: token(gold),
    'new-foreground': textOnGold(gold),
    border: token(border),
    input: token(border),
    ring: token(primary),
  }
}
