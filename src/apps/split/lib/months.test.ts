import { describe, expect, it } from 'vitest'
import { groupByMonth } from './months'
import type { Night } from '@/apps/split/types'

const n = (id: string, date: string): Night => ({ id, date, status: 'active', participants: [], items: [] })

describe('groupByMonth', () => {
  it('groups by month, newest month and newest Nomnom first', () => {
    const groups = groupByMonth([
      n('oct', '2026-10-05'),
      n('nov-early', '2026-11-02'),
      n('nov-late', '2026-11-24'),
      n('sep', '2026-09-30'),
    ])
    expect(groups.map((g) => [g.key, g.label, g.nights.map((x) => x.id)])).toEqual([
      ['2026-11', 'November 2026', ['nov-late', 'nov-early']],
      ['2026-10', 'October 2026', ['oct']],
      ['2026-09', 'September 2026', ['sep']],
    ])
  })

  it('puts unreadable dates last under "No date"', () => {
    const groups = groupByMonth([n('bad', 'nope'), n('ok', '2026-11-01')])
    expect(groups.map((g) => [g.key, g.label])).toEqual([
      ['2026-11', 'November 2026'],
      ['', 'No date'],
    ])
  })

  it('returns nothing for no Nomnoms', () => {
    expect(groupByMonth([])).toEqual([])
  })
})
