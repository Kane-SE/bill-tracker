import { describe, expect, it } from 'vitest'
import { nextLevelRange } from './level-range'

describe('nextLevelRange', () => {
  it('first tap picks one level and waits for a second', () => {
    expect(nextLevelRange(null, null, 18)).toEqual({ value: [18, 18], anchor: 18 })
  })
  it('second tap makes the inclusive range, either direction', () => {
    expect(nextLevelRange([18, 18], 18, 20)).toEqual({ value: [18, 20], anchor: null })
    expect(nextLevelRange([20, 20], 20, 18)).toEqual({ value: [18, 20], anchor: null })
  })
  it('a third tap starts over', () => {
    expect(nextLevelRange([18, 20], null, 22)).toEqual({ value: [22, 22], anchor: 22 })
  })
  it('tapping the only selected level clears it', () => {
    expect(nextLevelRange([19, 19], 19, 19)).toEqual({ value: null, anchor: null })
  })
  it('a single level restored from the URL acts as the first tap', () => {
    expect(nextLevelRange([19, 19], null, 21)).toEqual({ value: [19, 21], anchor: null })
    expect(nextLevelRange([19, 19], null, 19)).toEqual({ value: null, anchor: null })
  })
})
