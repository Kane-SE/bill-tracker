import { describe, expect, it } from 'vitest'
import { deriveTokens, hexToHslToken, hslTokenToHex, TOKEN_NAMES, type CustomColors } from './palette'

const sample: CustomColors = {
  background: '#fffbe9', foreground: '#2b2013', primary: '#ad8b73',
  accent: '#e3caa5', destructive: '#c0392b', success: '#3f8f5b',
}

describe('hexToHslToken', () => {
  it('converts hex to an "H S% L%" token', () => {
    expect(hexToHslToken('#ffffff')).toBe('0 0% 100%')
    expect(hexToHslToken('#000000')).toBe('0 0% 0%')
  })
  it('accepts hex without a leading #', () => {
    expect(hexToHslToken('ffffff')).toBe('0 0% 100%')
  })
})

describe('deriveTokens', () => {
  it('produces a value for every one of the 20 tokens', () => {
    const tokens = deriveTokens(sample)
    for (const name of TOKEN_NAMES) expect(tokens[name]).toMatch(/^\d+ \d+% \d+%$/)
    expect(Object.keys(tokens).sort()).toEqual([...TOKEN_NAMES].sort())
  })
  it('maps the six base colors straight through', () => {
    const tokens = deriveTokens(sample)
    expect(tokens.background).toBe(hexToHslToken(sample.background))
    expect(tokens.primary).toBe(hexToHslToken(sample.primary))
    expect(tokens.destructive).toBe(hexToHslToken(sample.destructive))
  })
  it('derives a warning token that stays readable on light and dark backgrounds', () => {
    const dark = deriveTokens({ ...sample, background: '#0f1117', foreground: '#f2f3f7' })
    const light = deriveTokens({ ...sample, background: '#fafafa', foreground: '#111111' })
    expect(dark.warning).toBe('38 92% 60%')
    expect(light.warning).toBe('30 90% 31%')
  })
})

describe('hslTokenToHex', () => {
  it('converts an "H S% L%" token to hex', () => {
    expect(hslTokenToHex('0 0% 100%')).toBe('#ffffff')
    expect(hslTokenToHex('0 100% 50%')).toBe('#ff0000')
    expect(hslTokenToHex('120 100% 25%')).toBe('#008000')
  })
  it('tolerates the surrounding whitespace getComputedStyle returns', () => {
    expect(hslTokenToHex('  240 100% 50% ')).toBe('#0000ff')
  })
  it('returns null for an unparseable token', () => {
    expect(hslTokenToHex('')).toBeNull()
    expect(hslTokenToHex('nope')).toBeNull()
  })
})
