import { describe, expect, it } from 'vitest'
import { computeBalances, equalShares, redistribute, shareRemainder, type SplitRow } from './calc'
import type { Item, Night } from '@/apps/split/types'

function rows(...names: string[]): SplitRow[] {
  return names.map((name) => ({ name, included: true, locked: false, amount: 0 }))
}
function amountsByName(r: SplitRow[]): Record<string, number> {
  return Object.fromEntries(r.filter((x) => x.included).map((x) => [x.name, x.amount]))
}

function item(partial: Partial<Item>): Item {
  return {
    id: partial.id ?? 'i',
    label: partial.label ?? 'item',
    payer: partial.payer ?? 'A',
    amount: partial.amount ?? 0,
    shares: partial.shares ?? [],
  }
}

function night(id: string, items: Item[]): Night {
  return {
    id,
    date: '2026-08-07',
    status: 'active',
    participants: [],
    items,
  }
}

describe('equalShares', () => {
  it('splits evenly when divisible', () => {
    expect(equalShares(90000, ['A', 'B', 'C'])).toEqual([30000, 30000, 30000])
  })

  it('distributes the remainder to the front so shares sum exactly', () => {
    const shares = equalShares(100000, ['A', 'B', 'C'])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100000)
    expect(shares).toEqual([33334, 33333, 33333])
  })

  it('handles a single person', () => {
    expect(equalShares(50000, ['A'])).toEqual([50000])
  })
})

describe('shareRemainder', () => {
  it('is zero when balanced', () => {
    expect(
      shareRemainder({ amount: 100, shares: [{ name: 'A', amount: 60 }, { name: 'B', amount: 40 }] }),
    ).toBe(0)
  })
  it('is positive when shares are short of the total', () => {
    expect(shareRemainder({ amount: 100, shares: [{ name: 'A', amount: 60 }] })).toBe(40)
  })
})

describe('redistribute (per-person locking)', () => {
  it('reproduces the worked example step by step (total 200k, A,B,C,D)', () => {
    let r = rows('A', 'B', 'C', 'D')

    // Start: equal split.
    r = redistribute(r, 200000)
    expect(amountsByName(r)).toEqual({ A: 50000, B: 50000, C: 50000, D: 50000 })

    // Lock B = 80k -> A,C,D share the remaining 120k -> 40k each.
    r = r.map((x) => (x.name === 'B' ? { ...x, locked: true, amount: 80000 } : x))
    r = redistribute(r, 200000)
    expect(amountsByName(r)).toEqual({ A: 40000, B: 80000, C: 40000, D: 40000 })

    // Lock A = 60k -> C,D share the remaining 60k -> 30k each.
    r = r.map((x) => (x.name === 'A' ? { ...x, locked: true, amount: 60000 } : x))
    r = redistribute(r, 200000)
    expect(amountsByName(r)).toEqual({ A: 60000, B: 80000, C: 30000, D: 30000 })

    // Lock C = 40k -> D alone gets the remaining 20k.
    r = r.map((x) => (x.name === 'C' ? { ...x, locked: true, amount: 40000 } : x))
    r = redistribute(r, 200000)
    expect(amountsByName(r)).toEqual({ A: 60000, B: 80000, C: 40000, D: 20000 })
  })

  it('re-derives an untouched person when the total changes', () => {
    let r = rows('A', 'B')
    r = r.map((x) => (x.name === 'A' ? { ...x, locked: true, amount: 30000 } : x))
    r = redistribute(r, 100000)
    expect(amountsByName(r)).toEqual({ A: 30000, B: 70000 })
    r = redistribute(r, 50000) // B (auto) re-derives; A (locked) stays
    expect(amountsByName(r)).toEqual({ A: 30000, B: 20000 })
  })

  it('excluding a person removes them and re-splits the rest', () => {
    let r = rows('A', 'B', 'C')
    r = r.map((x) => (x.name === 'C' ? { ...x, included: false } : x))
    r = redistribute(r, 100000)
    expect(amountsByName(r)).toEqual({ A: 50000, B: 50000 })
  })

  it('clamps auto shares to zero when locked amounts exceed the total', () => {
    let r = rows('A', 'B')
    r = r.map((x) => (x.name === 'A' ? { ...x, locked: true, amount: 120000 } : x))
    r = redistribute(r, 100000)
    expect(amountsByName(r)).toEqual({ A: 120000, B: 0 })
  })
})

describe('computeBalances', () => {
  it('the payer owes nothing; others owe the payer their share', () => {
    const n = night('n1', [
      item({
        payer: 'A',
        amount: 100000,
        shares: [
          { name: 'A', amount: 40000 },
          { name: 'B', amount: 20000 },
          { name: 'C', amount: 30000 },
        ],
      }),
    ])
    const debts = computeBalances([n])
    expect(debts).toEqual([
      { from: 'C', to: 'A', amount: 30000 },
      { from: 'B', to: 'A', amount: 20000 },
    ])
  })

  it('aggregates debts across multiple nights toward the same payer', () => {
    const n1 = night('n1', [
      item({ payer: 'A', amount: 30000, shares: [{ name: 'C', amount: 30000 }] }),
    ])
    const n2 = night('n2', [
      item({ payer: 'A', amount: 20000, shares: [{ name: 'C', amount: 20000 }] }),
    ])
    expect(computeBalances([n1, n2])).toEqual([{ from: 'C', to: 'A', amount: 50000 }])
  })

  it('nets opposite debts within a pair', () => {
    // A paid for B (B owes A 50k); later B paid for A (A owes B 20k) -> B owes A 30k
    const n1 = night('n1', [
      item({ payer: 'A', amount: 50000, shares: [{ name: 'B', amount: 50000 }] }),
    ])
    const n2 = night('n2', [
      item({ payer: 'B', amount: 20000, shares: [{ name: 'A', amount: 20000 }] }),
    ])
    expect(computeBalances([n1, n2])).toEqual([{ from: 'B', to: 'A', amount: 30000 }])
  })

  it('drops a pair that nets to zero', () => {
    const n1 = night('n1', [
      item({ payer: 'A', amount: 50000, shares: [{ name: 'B', amount: 50000 }] }),
    ])
    const n2 = night('n2', [
      item({ payer: 'B', amount: 50000, shares: [{ name: 'A', amount: 50000 }] }),
    ])
    expect(computeBalances([n1, n2])).toEqual([])
  })

  it('handles multiple payers across items independently', () => {
    const n = night('n1', [
      item({ payer: 'A', amount: 60000, shares: [{ name: 'B', amount: 30000 }, { name: 'C', amount: 30000 }] }),
      item({ payer: 'B', amount: 20000, shares: [{ name: 'C', amount: 20000 }] }),
    ])
    const debts = computeBalances([n])
    // B owes A 30k; C owes A 30k; C owes B 20k
    expect(debts).toContainEqual({ from: 'B', to: 'A', amount: 30000 })
    expect(debts).toContainEqual({ from: 'C', to: 'A', amount: 30000 })
    expect(debts).toContainEqual({ from: 'C', to: 'B', amount: 20000 })
    expect(debts).toHaveLength(3)
  })
})
