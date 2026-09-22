import { describe, expect, it } from 'vitest'
import { frequentNames } from './names'
import type { Night } from '@/apps/split/types'

function night(participants: string[]): Night {
  return { id: Math.random().toString(), date: '', status: 'active', participants, items: [] }
}

describe('frequentNames', () => {
  it('returns names in more than 2 distinct nights by default', () => {
    const nights = [night(['Anna', 'Bob']), night(['Anna', 'Cara']), night(['Anna', 'Bob'])]
    expect(frequentNames(nights)).toEqual(['Anna']) // Anna in 3, Bob in 2
  })
  it('is case-insensitive but keeps first-seen casing', () => {
    const nights = [night(['anna']), night(['Anna']), night(['ANNA'])]
    expect(frequentNames(nights)).toEqual(['anna'])
  })
  it('counts distinct nights, not repeats within one night', () => {
    const nights = [night(['Anna', 'Anna', 'Anna'])]
    expect(frequentNames(nights)).toEqual([])
  })
  it('respects a custom threshold', () => {
    const nights = [night(['Bob']), night(['Bob'])]
    expect(frequentNames(nights, 1)).toEqual(['Bob']) // >1 distinct night
  })
})
