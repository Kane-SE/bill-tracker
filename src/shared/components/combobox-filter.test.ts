import { describe, expect, it } from 'vitest'
import { filterSuggestions } from './combobox-filter'

describe('filterSuggestions', () => {
  it('returns all suggestions for an empty query', () => {
    expect(filterSuggestions(['Anna', 'Bob'], '')).toEqual(['Anna', 'Bob'])
  })
  it('matches case-insensitive substrings', () => {
    expect(filterSuggestions(['Anna', 'Bob', 'Bao'], 'b')).toEqual(['Bob', 'Bao'])
  })
  it('trims the query', () => {
    expect(filterSuggestions(['Anna'], '  an ')).toEqual(['Anna'])
  })
  it('returns [] when nothing matches', () => {
    expect(filterSuggestions(['Anna'], 'zzz')).toEqual([])
  })
})
