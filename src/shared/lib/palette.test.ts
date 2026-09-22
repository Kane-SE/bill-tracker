import { describe, expect, it } from 'vitest'
import { deriveTokens, hexToHslToken, TOKEN_NAMES, type CustomColors } from './palette'

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
  it('produces a value for every one of the 19 tokens', () => {
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
})
