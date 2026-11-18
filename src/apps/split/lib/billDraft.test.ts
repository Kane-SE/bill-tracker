import { describe, expect, it } from 'vitest'
import {
  addBillPerson,
  assignedTotal,
  draftToItems,
  initialPayer,
  lineShares,
  lineStatus,
  newLine,
  reconcile,
  setLineAmount,
  toggleEveryone,
  toggleLinePerson,
  type DraftLine,
} from './billDraft'
import { computeNightLines, equalShares } from './calc'
import type { Item, Night } from '@/apps/split/types'

function line(label: string, amount: number, people: string[], shares?: DraftLine['shares']): DraftLine {
  return { key: label, label, amount, people, ...(shares ? { shares } : {}) }
}

function nightOf(participants: string[], items: Omit<Item, 'id'>[]): Night {
  return {
    id: 'n',
    date: '2026-11-17',
    status: 'active',
    participants,
    items: items.map((it, i) => ({ ...it, id: `i${i}` })),
  }
}

function balances(n: Night) {
  return computeNightLines(n)
    .map((l) => ({ from: l.from, to: l.to, amount: l.owed }))
    .sort((a, b) => a.from.localeCompare(b.from))
}

const ORDER = ['Minh', 'Lan', 'Huy']
const biaTiger = () =>
  line('Bia Tiger x4', 120000, ['Minh', 'Huy'], [
    { name: 'Minh', amount: 90000 },
    { name: 'Huy', amount: 30000 },
  ])

describe('newLine', () => {
  it('starts blank, or from a preset', () => {
    expect(newLine('a')).toEqual({ key: 'a', label: '', amount: 0, people: [] })
    const preset = { label: 'Tip', people: ['Minh'] }
    const l = newLine('b', preset)
    expect(l).toEqual({ key: 'b', label: 'Tip', amount: 0, people: ['Minh'] })
    expect(l.people).not.toBe(preset.people)
  })
})

describe('lineStatus', () => {
  it('classifies lines', () => {
    expect(lineStatus(newLine('a'))).toBe('empty')
    expect(lineStatus({ ...newLine('a'), label: 'Kem' })).toBe('incomplete')
    expect(lineStatus({ ...newLine('a'), amount: 30000 })).toBe('incomplete')
    expect(lineStatus({ ...newLine('a'), amount: 30000, people: ['Lan'] })).toBe('ready')
    expect(lineStatus({ ...newLine('a'), label: '   ' })).toBe('empty')
  })
})

describe('lineShares', () => {
  it('uneven division adds up exactly', () => {
    const people = ['Minh', 'Lan', 'Huy']
    const shares = lineShares(line('x', 100000, people))
    expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(100000)
    expect(shares.map((s) => s.amount)).toEqual(equalShares(100000, people))
    expect(shares.map((s) => s.name)).toEqual(people)
  })

  it('uses adjusted shares unchanged', () => {
    const l = biaTiger()
    expect(lineShares(l)).toEqual(l.shares)
  })

  it('is empty with nobody picked', () => {
    expect(lineShares(line('x', 1000, []))).toEqual([])
  })
})

describe('toggling people', () => {
  it('toggle clears adjusted shares', () => {
    const l = toggleLinePerson(biaTiger(), 'Huy', ORDER)
    expect(l.people).toEqual(['Minh'])
    expect(l.shares).toBeUndefined()
    expect(lineShares(l)).toEqual([{ name: 'Minh', amount: 120000 }])
    expect(lineStatus(toggleLinePerson(l, 'Minh', ORDER))).toBe('incomplete')
  })

  it('toggle keeps bill order', () => {
    let l = newLine('a')
    l = toggleLinePerson(l, 'Huy', ORDER)
    l = toggleLinePerson(l, 'Minh', ORDER)
    expect(l.people).toEqual(['Minh', 'Huy'])
  })

  it('toggleEveryone picks all, then nobody', () => {
    let l = line('x', 100, ['Lan'])
    l = toggleEveryone(l, ORDER)
    expect(l.people).toEqual(ORDER)
    l = toggleEveryone(l, ORDER)
    expect(l.people).toEqual([])
    const adj = toggleEveryone(biaTiger(), ORDER)
    expect(adj.people).toEqual(ORDER)
    expect(adj.shares).toBeUndefined()
  })
})

describe('setLineAmount', () => {
  it('clears shares only on change', () => {
    const l = biaTiger()
    expect(setLineAmount(l, 120000).shares).toEqual(l.shares)
    expect(setLineAmount(l, 150000).shares).toBeUndefined()
    expect(setLineAmount(l, 150000).amount).toBe(150000)
  })
})

describe('addBillPerson', () => {
  it('reuses names case-insensitively, trims, and rejects blanks', () => {
    expect(addBillPerson(['Minh', 'Lan'], '  lan ')).toEqual({ people: ['Minh', 'Lan'], name: 'Lan' })
    expect(addBillPerson(['Minh'], 'Thảo')).toEqual({ people: ['Minh', 'Thảo'], name: 'Thảo' })
    expect(addBillPerson(['Minh'], '   ')).toEqual({ people: ['Minh'], name: null })
  })
})

describe('assignedTotal and reconcile', () => {
  const lines = [
    line('Lẩu', 330000, ORDER),
    line('Bò', 180000, ['Minh', 'Huy']),
    line('Trà', 30000, ORDER),
    biaTiger(),
    line('half', 99999, []),
    newLine('blank'),
  ]
  it('counts only ready lines plus what is already added', () => {
    expect(assignedTotal(lines, 0)).toBe(660000)
    expect(assignedTotal(lines, 5000)).toBe(665000)
  })
  it('reconciles against the total', () => {
    expect(reconcile(660000, 765000)).toEqual({ kind: 'left', amount: 105000 })
    expect(reconcile(780000, 765000)).toEqual({ kind: 'over', amount: 15000 })
    expect(reconcile(765000, 765000)).toEqual({ kind: 'exact' })
    expect(reconcile(660000, undefined)).toEqual({ kind: 'none' })
    expect(reconcile(660000, 0)).toEqual({ kind: 'none' })
  })
})

describe('draftToItems', () => {
  it('keeps ready lines in order with payer and photoId', () => {
    const items = draftToItems(
      [line('A', 100, ['Minh']), newLine('e'), line('half', 50, []), line('', 60, ['Lan', 'Huy'])],
      'Huy',
      'ph1',
    )
    expect(items).toEqual([
      { label: 'A', payer: 'Huy', amount: 100, shares: [{ name: 'Minh', amount: 100 }], photoId: 'ph1' },
      {
        label: 'Item',
        payer: 'Huy',
        amount: 60,
        shares: [
          { name: 'Lan', amount: 30 },
          { name: 'Huy', amount: 30 },
        ],
        photoId: 'ph1',
      },
    ])
  })
})

describe('initialPayer', () => {
  const participants = ['Minh', 'Lan', 'Huy']
  it('prefers saved, then existing, then me, then empty', () => {
    expect(initialPayer({ saved: 'Lan', existingPayers: ['Huy'], me: 'Minh', participants })).toBe('Lan')
    expect(initialPayer({ existingPayers: ['Zed', 'Huy'], me: 'Minh', participants })).toBe('Huy')
    expect(initialPayer({ existingPayers: [], me: 'Minh', participants })).toBe('Minh')
    expect(initialPayer({ existingPayers: [], me: 'Zed', participants })).toBe('')
    expect(initialPayer({ existingPayers: [], me: null, participants })).toBe('')
  })
  it('initialPayer ignores a saved payer who left', () => {
    expect(initialPayer({ saved: 'Tú', existingPayers: ['Huy'], me: null, participants })).toBe('Huy')
  })
})

describe('real bills through computeNightLines', () => {
  it('hotpot example', () => {
    const lines = [
      line('Lẩu Thái', 330000, ORDER),
      line('Bò Mỹ', 180000, ['Minh', 'Huy']),
      line('Trà đá x3', 30000, ORDER),
      biaTiger(),
      line('Kem dừa', 45000, ['Lan']),
      line('Phí phục vụ', 60000, ORDER),
    ]
    const n = nightOf(ORDER, draftToItems(lines, 'Huy', 'ph1'))
    expect(balances(n)).toEqual([
      { from: 'Lan', to: 'Huy', amount: 185000 },
      { from: 'Minh', to: 'Huy', amount: 320000 },
    ])
  })

  it('sample 1 (SoBanHang)', () => {
    const lines = [
      line('Trà sữa', 200000, ['Lan']),
      line('Sữa', 15000, ['Minh']),
      line('Sữa', 15000, ['Huy']),
      line('Sandwich x2', 30000, ['Minh', 'Huy']),
    ]
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(260000)
    const items = draftToItems(lines, 'Lan', 'ph1')
    expect(balances(nightOf(['Minh', 'Lan', 'Huy'], items))).toEqual([
      { from: 'Huy', to: 'Lan', amount: 30000 },
      { from: 'Minh', to: 'Lan', amount: 30000 },
    ])
  })

  it('sample 2 (handwritten)', () => {
    const all = ['An', 'Bình', 'Chi', 'Huy', 'Lan']
    const k = (label: string, thousands: number) => line(label, thousands * 1000, all)
    const lines = [
      k('Cháo', 250),
      k('Rau', 320),
      k('Mực', 2040),
      k('Tôm', 6975),
      k('Cá', 3975),
      k('Ngao', 1920),
      k('Hàu', 400),
      k('Cơm', 200),
      k('Khăn lạnh', 48),
      line('Cua', 10465000, ['An', 'Bình', 'Huy']),
      line('Rượu', 420000, ['An', 'Huy'], [
        { name: 'An', amount: 280000 },
        { name: 'Huy', amount: 140000 },
      ]),
      line('Nước ngọt 5+1', 120000, ['Chi', 'Lan']),
      line('Nước lọc', 10000, ['An']),
    ]
    expect(lines).toHaveLength(13)
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(27143000)
    const items = draftToItems(lines, 'Huy', 'ph2')
    expect(items).toHaveLength(13)
    for (const it of items) expect(it.shares.reduce((s, x) => s + x.amount, 0)).toBe(it.amount)
    expect(items.find((i) => i.label === 'Cua')!.shares.map((s) => s.amount)).toEqual([3488334, 3488333, 3488333])
    expect(balances(nightOf(all, items))).toEqual([
      { from: 'An', to: 'Huy', amount: 7003934 },
      { from: 'Bình', to: 'Huy', amount: 6713933 },
      { from: 'Chi', to: 'Huy', amount: 3285600 },
      { from: 'Lan', to: 'Huy', amount: 3285600 },
    ])
  })
})
