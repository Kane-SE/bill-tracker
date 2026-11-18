import { describe, expect, it } from 'vitest'
import { scaleMoney } from './format'

describe('scaleMoney', () => {
  it('parses typed digits into whole dong', () => {
    expect(scaleMoney.parse('250', 1000)).toBe(250000)
    expect(scaleMoney.parse('250', 1)).toBe(250)
    expect(scaleMoney.parse('', 1000)).toBe(0)
  })
  it('displays in thousands, rounded down', () => {
    expect(scaleMoney.display(3488334, 1000)).toBe('3.488')
    expect(scaleMoney.display(250000, 1000)).toBe('250')
  })
  it('displays full dong at unit 1', () => {
    expect(scaleMoney.display(250000, 1)).toBe('250.000')
  })
  it('shows nothing for 0', () => {
    expect(scaleMoney.display(0, 1)).toBe('')
    expect(scaleMoney.display(999, 1000)).toBe('')
  })
})
