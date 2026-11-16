import { describe, expect, it } from 'vitest'
import { buildOwedToMe, owedToMeTsv } from './excel'
import type { Item, Night, Payment } from '@/apps/split/types'

const ME = 'Evan'

/** One item `payer` fronted, split into the given shares. */
function paid(payer: string, shares: Record<string, number>): Item {
  const list = Object.entries(shares).map(([name, amount]) => ({ name, amount }))
  return { id: `${payer}-${Math.random()}`, label: 'food', payer, amount: list.reduce((s, x) => s + x.amount, 0), shares: list }
}

// Midday UTC keeps the local calendar day the same from UTC-11 to UTC+11.
function nomnom(
  id: string,
  day: string,
  items: Item[],
  opts: { title?: string; payments?: Payment[]; status?: 'active' | 'settled' } = {},
): Night {
  return {
    id,
    title: opts.title,
    date: `${day}T12:00:00.000Z`,
    status: opts.status ?? 'active',
    participants: [],
    items,
    payments: opts.payments,
  }
}

describe('Copy for Excel', () => {
  it('lays out totals, a blank row, then one row per Nomnom (the spec example)', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid(ME, { An: 150000, [ME]: 150000 })], { title: "Hotpot at Ba's" }),
      nomnom('n2', '2026-11-05', [paid(ME, { 'Bình': 120000 })], { title: 'Bánh xèo' }),
      nomnom('n3', '2026-11-08', [paid(ME, { An: 300000 })], { title: 'BBQ night' }),
    ]
    expect(owedToMeTsv(buildOwedToMe(nights, ME))).toBe(
      [
        'Who owes me\tTotal',
        'An\t450000',
        'Bình\t120000',
        '',
        'Who owes me\tDate\tNomnom\tAmount',
        'An\t2026-11-08\tBBQ night\t300000',
        "An\t2026-11-03\tHotpot at Ba's\t150000",
        'Bình\t2026-11-05\tBánh xèo\t120000',
      ].join('\n'),
    )
  })

  it('shows a Nomnom where I owe them as a negative row so rows add up to the total', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid(ME, { An: 150000 })], { title: 'Hotpot' }),
      nomnom('n2', '2026-11-04', [paid('An', { [ME]: 50000 })], { title: 'Coffee' }),
    ]
    const sheet = buildOwedToMe(nights, ME)
    expect(sheet.people).toEqual([{ name: 'An', total: 100000 }])
    expect(sheet.rows).toEqual([
      { name: 'An', date: '2026-11-04', nomnom: 'Coffee', amount: -50000 },
      { name: 'An', date: '2026-11-03', nomnom: 'Hotpot', amount: 150000 },
    ])
  })

  it('counts only what is left after a ticked pay-back and skips fully paid Nomnoms', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid(ME, { An: 150000 })], {
        title: 'Hotpot',
        payments: [{ from: 'An', to: ME, amount: 100000 }],
      }),
      nomnom('n2', '2026-11-04', [paid(ME, { An: 80000 })], {
        title: 'Lunch',
        payments: [{ from: 'An', to: ME, amount: 80000 }],
      }),
    ]
    const sheet = buildOwedToMe(nights, ME)
    expect(sheet.people).toEqual([{ name: 'An', total: 50000 }])
    expect(sheet.rows).toEqual([{ name: 'An', date: '2026-11-03', nomnom: 'Hotpot', amount: 50000 }])
  })

  it('ignores archived Nomnoms', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid(ME, { An: 150000 })], { title: 'Hotpot', status: 'settled' }),
      nomnom('n2', '2026-11-04', [paid(ME, { An: 20000 })], { title: 'Tea' }),
    ]
    const sheet = buildOwedToMe(nights, ME)
    expect(sheet.people).toEqual([{ name: 'An', total: 20000 }])
    expect(sheet.rows.map((r) => r.nomnom)).toEqual(['Tea'])
  })

  it('leaves out people I owe and debts between other people', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid('Chi', { [ME]: 80000, An: 40000 }), paid(ME, { 'Bình': 10000 })], { title: 'Hotpot' }),
    ]
    const sheet = buildOwedToMe(nights, ME)
    expect(sheet.people).toEqual([{ name: 'Bình', total: 10000 }])
    expect(sheet.rows).toEqual([{ name: 'Bình', date: '2026-11-03', nomnom: 'Hotpot', amount: 10000 }])
  })

  it('sorts people by biggest total first', () => {
    const nights = [nomnom('n1', '2026-11-03', [paid(ME, { An: 10000, 'Bình': 90000, Chi: 50000 })], { title: 'Hotpot' })]
    expect(buildOwedToMe(nights, ME).people.map((p) => p.name)).toEqual(['Bình', 'Chi', 'An'])
  })

  it('names an untitled Nomnom by its date', () => {
    const nights = [nomnom('n1', '2026-11-03', [paid(ME, { An: 10000 })])]
    expect(buildOwedToMe(nights, ME).rows[0].nomnom).toBe('03 Nov 2026')
  })

  it('summarises how much, from how many people, across how many Nomnoms', () => {
    const nights = [
      nomnom('n1', '2026-11-03', [paid(ME, { An: 150000, 'Bình': 20000 })], { title: 'Hotpot' }),
      nomnom('n2', '2026-11-05', [paid(ME, { 'Bình': 100000 })], { title: 'Bánh xèo' }),
      nomnom('n3', '2026-11-06', [paid('Chi', { An: 30000 })], { title: 'Not mine' }),
    ]
    const sheet = buildOwedToMe(nights, ME)
    expect(sheet.total).toBe(270000)
    expect(sheet.nomnomCount).toBe(2)
  })

  it('is empty when nobody owes me', () => {
    const nights = [nomnom('n1', '2026-11-03', [paid('An', { [ME]: 10000 })], { title: 'Hotpot' })]
    expect(buildOwedToMe(nights, ME)).toEqual({ people: [], rows: [], total: 0, nomnomCount: 0 })
  })

  it('keeps tabs and line breaks in names from splitting cells', () => {
    const nights = [nomnom('n1', '2026-11-03', [paid(ME, { An: 10000 })], { title: 'Hot\tpot\nnight' })]
    expect(owedToMeTsv(buildOwedToMe(nights, ME)).split('\n').at(-1)).toBe('An\t2026-11-03\tHot pot night\t10000')
  })

  it('stops Excel reading a name that starts with = + - @ as a formula', () => {
    const nights = [nomnom('n1', '2026-11-03', [paid(ME, { '+An': 10000 })], { title: '=Birthday' })]
    const lines = owedToMeTsv(buildOwedToMe(nights, ME)).split('\n')
    expect(lines[1]).toBe(' +An\t10000')
    expect(lines.at(-1)).toBe(' +An\t2026-11-03\t =Birthday\t10000')
  })
})
