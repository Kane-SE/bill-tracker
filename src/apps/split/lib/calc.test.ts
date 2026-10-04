import { describe, expect, it } from 'vitest'
import {
  computeBalances,
  computeNightLines,
  computePairBreakdown,
  planPairResolve,
  applyPairChanges,
  equalShares,
  redistribute,
  shareRemainder,
  summarizePeople,
  type SplitRow,
} from './calc'
import type { Item, Night, Payment } from '@/apps/split/types'

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

function night(id: string, items: Item[], payments?: Payment[]): Night {
  return {
    id,
    date: '2026-08-07',
    status: 'active',
    participants: [],
    items,
    ...(payments ? { payments } : {}),
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

describe('payments', () => {
  // A paid 90k, split A/B/C -> B owes A 30k, C owes A 30k.
  const dinner = item({
    payer: 'A',
    amount: 90000,
    shares: [
      { name: 'A', amount: 30000 },
      { name: 'B', amount: 30000 },
      { name: 'C', amount: 30000 },
    ],
  })

  it('a payment fully cancels its line in computeBalances', () => {
    const n = night('n1', [dinner], [{ from: 'B', to: 'A', amount: 30000 }])
    expect(computeBalances([n])).toEqual([{ from: 'C', to: 'A', amount: 30000 }])
  })

  it('nights without a payments field behave as before', () => {
    const n = night('n1', [dinner])
    expect(n.payments).toBeUndefined()
    expect(computeBalances([n])).toHaveLength(2)
    expect(computeNightLines(n).every((l) => l.paid === 0 && l.remaining === l.owed)).toBe(true)
  })

  it('computeNightLines reports owed / paid / remaining per line', () => {
    const n = night('n1', [dinner], [{ from: 'B', to: 'A', amount: 30000 }])
    expect(computeNightLines(n)).toEqual([
      { from: 'B', to: 'A', owed: 30000, paid: 30000, remaining: 0 },
      { from: 'C', to: 'A', owed: 30000, paid: 0, remaining: 30000 },
    ])
  })

  it('a line reopens with the remainder when an item edit grows it', () => {
    const bigger = { ...dinner, amount: 150000, shares: [
      { name: 'A', amount: 50000 },
      { name: 'B', amount: 50000 },
      { name: 'C', amount: 50000 },
    ] }
    const n = night('n1', [bigger], [{ from: 'B', to: 'A', amount: 30000 }])
    const line = computeNightLines(n).find((l) => l.from === 'B')
    expect(line).toEqual({ from: 'B', to: 'A', owed: 50000, paid: 30000, remaining: 20000 })
    expect(computeBalances([n])).toContainEqual({ from: 'B', to: 'A', amount: 20000 })
  })

  it('an overpayment surfaces as a reverse debt in computeBalances', () => {
    const smaller = { ...dinner, amount: 60000, shares: [
      { name: 'A', amount: 20000 },
      { name: 'B', amount: 20000 },
      { name: 'C', amount: 20000 },
    ] }
    const n = night('n1', [smaller], [{ from: 'B', to: 'A', amount: 30000 }])
    expect(computeNightLines(n).find((l) => l.from === 'B')?.remaining).toBe(0)
    expect(computeBalances([n])).toContainEqual({ from: 'A', to: 'B', amount: 10000 })
  })

  it('payments net correctly across multiple Nomnoms', () => {
    const n1 = night('n1', [dinner], [{ from: 'B', to: 'A', amount: 30000 }])
    const n2 = night('n2', [dinner])
    expect(computeBalances([n1, n2])).toEqual([
      { from: 'C', to: 'A', amount: 60000 },
      { from: 'B', to: 'A', amount: 30000 },
    ])
  })
})

// ---- pair fixtures (the explainer's example) ------------------------------
const pizzaItem = item({
  id: 'p', label: 'Pizza', payer: 'Lan', amount: 300000,
  shares: [{ name: 'Minh', amount: 100000 }, { name: 'Lan', amount: 100000 }, { name: 'Huy', amount: 100000 }],
})
const bbqItem = item({
  id: 'b', label: 'Drinks', payer: 'Minh', amount: 60000,
  shares: [{ name: 'Minh', amount: 30000 }, { name: 'Lan', amount: 30000 }],
})
function pizza(payments?: Payment[]): Night {
  return { ...night('pizza', [pizzaItem], payments), title: 'Pizza Fri', date: '2026-10-02', participants: ['Minh', 'Lan', 'Huy'] }
}
function bbq(payments?: Payment[]): Night {
  return { ...night('bbq', [bbqItem], payments), title: 'BBQ Sun', date: '2026-10-04', participants: ['Minh', 'Lan'] }
}
/** Signed home balance for from → to (negative = the other way). */
function netFor(nights: Night[], from: string, to: string): number {
  const d = computeBalances(nights).find(
    (x) => (x.from === from && x.to === to) || (x.from === to && x.to === from),
  )
  if (!d) return 0
  return d.from === from ? d.amount : -d.amount
}

describe('computePairBreakdown', () => {
  it('lists both directions, newest first, and sums to the home row', () => {
    const nights = [pizza(), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.map((e) => [e.nightId, e.lineFrom, e.lineTo, e.contribution])).toEqual([
      ['bbq', 'Lan', 'Minh', -30000],
      ['pizza', 'Minh', 'Lan', 100000],
    ])
    expect(b.entries[0].title).toBe('BBQ Sun')
    expect(b.settledCount).toBe(0)
    expect(b.net).toBe(70000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('counts a partial payment as owed minus paid', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 40000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.find((e) => e.nightId === 'pizza')!.contribution).toBe(60000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('leaves out fully paid Nomnoms and counts them in settledCount', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 100000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.map((e) => e.nightId)).toEqual(['bbq'])
    expect(b.settledCount).toBe(1)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('shows an over-payment as a negative contribution', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 120000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.find((e) => e.nightId === 'pizza')!.contribution).toBe(-20000)
    expect(b.net).toBe(-50000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('includes an orphan payment (its line no longer exists)', () => {
    const old: Night = { ...night('old', [], [{ from: 'Lan', to: 'Minh', amount: 50000 }]), date: '2026-09-01' }
    const nights = [pizza(), old]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    const e = b.entries.find((x) => x.nightId === 'old')!
    expect([e.owed, e.paid, e.contribution]).toEqual([0, 50000, 50000])
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('ignores Nomnoms where the pair has nothing', () => {
    const b = computePairBreakdown([pizza(), bbq()], 'Huy', 'Lan')
    expect(b.entries.map((e) => e.nightId)).toEqual(['pizza'])
    expect(b.net).toBe(100000)
  })
})

describe('planPairResolve + applyPairChanges', () => {
  function applyAll(nights: Night[], plan: ReturnType<typeof planPairResolve>): Night[] {
    return nights.map((n) => applyPairChanges(n, plan.changes))
  }

  it('ticks both directions and archives only Nomnoms that end fully paid', () => {
    const nights = [pizza(), bbq()]
    const plan = planPairResolve(nights, 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'pizza', title: 'Pizza Fri', from: 'Minh', to: 'Lan', kind: 'tick', before: 0, after: 100000 },
      { nightId: 'bbq', title: 'BBQ Sun', from: 'Lan', to: 'Minh', kind: 'tick', before: 0, after: 30000 },
    ])
    expect(plan.toArchive).toEqual([{ nightId: 'bbq', title: 'BBQ Sun' }]) // pizza still has Huy -> Lan
    const after = applyAll(nights, plan)
    expect(netFor(after, 'Minh', 'Lan')).toBe(0)
    expect(computeBalances(after)).toEqual([{ from: 'Huy', to: 'Lan', amount: 100000 }])
  })

  it('tops up a partial payment', () => {
    const plan = planPairResolve([pizza([{ from: 'Minh', to: 'Lan', amount: 40000 }])], 'Minh', 'Lan')
    expect(plan.changes[0]).toMatchObject({ kind: 'tick', before: 40000, after: 100000 })
  })

  it('trims an over-payment', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 120000 }])]
    const plan = planPairResolve(nights, 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'pizza', title: 'Pizza Fri', from: 'Minh', to: 'Lan', kind: 'adjust', before: 120000, after: 100000 },
    ])
    expect(netFor(applyAll(nights, plan), 'Minh', 'Lan')).toBe(0)
  })

  it('removes an orphan payment', () => {
    const old: Night = { ...night('old', [], [{ from: 'Lan', to: 'Minh', amount: 50000 }]), title: 'Old' }
    const plan = planPairResolve([old], 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'old', title: 'Old', from: 'Lan', to: 'Minh', kind: 'remove', before: 50000, after: 0 },
    ])
    expect(plan.toArchive).toEqual([]) // no lines, nothing to archive
    expect(applyPairChanges(old, plan.changes).payments).toEqual([])
  })

  it('changes nothing when payments already match', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 100000 }])]
    expect(planPairResolve(nights, 'Minh', 'Lan')).toEqual({ changes: [], toArchive: [] })
  })

  it('never archives a Nomnom it did not touch', () => {
    const doneHuy = {
      ...pizza([
        { from: 'Minh', to: 'Lan', amount: 100000 },
        { from: 'Huy', to: 'Lan', amount: 100000 },
      ]),
      id: 'done',
    }
    const plan = planPairResolve([doneHuy, bbq()], 'Minh', 'Lan')
    expect(plan.toArchive.map((t) => t.nightId)).toEqual(['bbq'])
  })

  it('applyPairChanges ignores changes for other nights', () => {
    const p = pizza()
    expect(applyPairChanges(p, [{ nightId: 'bbq', title: 'BBQ Sun', from: 'Lan', to: 'Minh', kind: 'tick', before: 0, after: 1 }])).toBe(p)
  })
})

describe('summarizePeople', () => {
  it('lists everyone from any Nomnom alphabetically with their totals', () => {
    const archived: Night = { ...night('arch', []), status: 'settled', participants: ['An', 'Minh'] }
    const debts = computeBalances([pizza(), bbq()])
    expect(summarizePeople([pizza(), bbq(), archived], debts)).toEqual([
      { name: 'An', owes: 0, owed: 0 },
      { name: 'Huy', owes: 100000, owed: 0 },
      { name: 'Lan', owes: 0, owed: 170000 },
      { name: 'Minh', owes: 70000, owed: 0 },
    ])
  })
})
