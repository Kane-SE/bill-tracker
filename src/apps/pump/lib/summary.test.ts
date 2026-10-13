import { describe, expect, it } from 'vitest'
import { defaultFilters } from './filters'
import { activeFacetCount, summarize } from './summary'

describe('summarize', () => {
  it('says what is shown, spelling out or/and', () => {
    expect(summarize(defaultFilters)).toBe('All charts')
    expect(summarize({ ...defaultFilters, modes: ['S', 'D'], level: [18, 20], skills: ['twist', 'bracket'] })).toBe(
      'S or D · Lv 18–20 · twist or bracket',
    )
    expect(summarize({ ...defaultFilters, skills: ['twist', 'run'], skillsAll: true, types: ['SHORTCUT'], titleOnly: true, q: ' vook ' })).toBe(
      'twist and run · Short Cut · title charts · "vook"',
    )
  })
})

describe('activeFacetCount', () => {
  it('counts active facets, not values, and ignores search', () => {
    expect(activeFacetCount(defaultFilters)).toBe(0)
    expect(activeFacetCount({ ...defaultFilters, modes: ['S', 'D'], skills: ['run'], steamLink: true, q: 'x' })).toBe(3)
  })
})
