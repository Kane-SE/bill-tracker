import { describe, expect, it } from 'vitest'
import { makeChart, makeSong } from './__fixtures__/charts'
import { rowSkills, sortCharts, toRows } from './order'

const a = makeSong({ title: 'apple' })
const b = makeSong({ title: 'Banana' })

describe('sortCharts', () => {
  it('orders by level, then title (case-insensitive), then S, D, HD', () => {
    const cs = [
      makeChart({ id: 1, song: b, level: 20, mode: 'S' }),
      makeChart({ id: 2, song: a, level: 20, mode: 'D' }),
      makeChart({ id: 3, song: a, level: 20, mode: 'S' }),
      makeChart({ id: 4, song: b, level: 19, mode: 'D' }),
    ]
    expect(sortCharts(cs).map((c) => c.id)).toEqual([4, 3, 2, 1])
  })
})

describe('toRows', () => {
  it('puts a header with a count before each level', () => {
    const cs = sortCharts([makeChart({ id: 1, level: 19 }), makeChart({ id: 2, level: 20 }), makeChart({ id: 3, level: 20 })])
    expect(toRows(cs).map((r) => (r.kind === 'header' ? `Lv${r.level}:${r.count}` : r.chart.id))).toEqual(['Lv19:1', 1, 'Lv20:2', 2, 3])
  })
})

describe('rowSkills', () => {
  const c = makeChart({ skills: ['run', 'twist', 'bracket', 'gimmick'], coverage: { half: 0, run: 30, twist: 70, bracket: 10, drill: 0 } })
  it('shows gimmick first, then the strongest skills', () => {
    expect(rowSkills(c, [])).toEqual(['gimmick', 'twist'])
  })
  it('puts selected skills first', () => {
    expect(rowSkills(c, ['bracket'])).toEqual(['bracket', 'gimmick'])
  })
})
