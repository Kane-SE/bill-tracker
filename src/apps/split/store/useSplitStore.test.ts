import { describe, expect, it, beforeEach } from 'vitest'
import { useSplitStore } from './useSplitStore'
import { computeBalances } from '@/apps/split/lib/calc'
import type { Night } from '@/apps/split/types'

beforeEach(() => {
  useSplitStore.setState({ nights: [], knownNames: [], promotedNames: [] })
})

describe('promoteFrequentNames', () => {
  it('promotes a name after it appears in 3 nights and keeps it removable', () => {
    const s = useSplitStore.getState()
    const ids = [s.addNight(), s.addNight(), s.addNight()]
    ids.forEach((id) => useSplitStore.getState().setParticipants(id, ['Anna']))
    expect(useSplitStore.getState().knownNames).toContain('Anna')

    useSplitStore.getState().removeKnownName('Anna')
    useSplitStore.getState().promoteFrequentNames()
    expect(useSplitStore.getState().knownNames).not.toContain('Anna') // not re-added
  })
})

describe('line payments', () => {
  it('markLinePaid upserts one payment per pair and tops up on re-tick', () => {
    const id = useSplitStore.getState().addNight()
    useSplitStore.getState().markLinePaid(id, 'B', 'A', 30000)
    useSplitStore.getState().markLinePaid(id, 'B', 'A', 50000)
    const n = useSplitStore.getState().nights.find((x) => x.id === id)!
    expect(n.payments).toEqual([{ from: 'B', to: 'A', amount: 50000 }])
  })

  it('unmarkLinePaid removes only that pair', () => {
    const id = useSplitStore.getState().addNight()
    useSplitStore.getState().markLinePaid(id, 'B', 'A', 30000)
    useSplitStore.getState().markLinePaid(id, 'C', 'A', 30000)
    useSplitStore.getState().unmarkLinePaid(id, 'B', 'A')
    const n = useSplitStore.getState().nights.find((x) => x.id === id)!
    expect(n.payments).toEqual([{ from: 'C', to: 'A', amount: 30000 }])
  })

  it('ignores unknown Nomnom ids', () => {
    useSplitStore.getState().markLinePaid('nope', 'B', 'A', 1)
    expect(useSplitStore.getState().nights).toEqual([])
  })
})

function fixtureNights(): Night[] {
  return [
    {
      id: 'pizza', title: 'Pizza Fri', date: '2026-10-02', status: 'active',
      participants: ['Minh', 'Lan', 'Huy'], payments: [],
      items: [{ id: 'p', label: 'Pizza', payer: 'Lan', amount: 300000,
        shares: [{ name: 'Minh', amount: 100000 }, { name: 'Lan', amount: 100000 }, { name: 'Huy', amount: 100000 }] }],
    },
    {
      id: 'bbq', title: 'BBQ Sun', date: '2026-10-04', status: 'active',
      participants: ['Minh', 'Lan'], payments: [],
      items: [{ id: 'b', label: 'Drinks', payer: 'Minh', amount: 60000,
        shares: [{ name: 'Minh', amount: 30000 }, { name: 'Lan', amount: 30000 }] }],
    },
  ]
}

describe('resolvePair', () => {
  it('pays both directions, archives fully paid Nomnoms and returns the before-snapshot', () => {
    const original = fixtureNights()
    useSplitStore.setState({ nights: original })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    expect(snapshot).toEqual(original)

    const nights = useSplitStore.getState().nights
    const pizza = nights.find((n) => n.id === 'pizza')!
    const bbq = nights.find((n) => n.id === 'bbq')!
    expect(pizza.status).toBe('active')
    expect(pizza.payments).toEqual([{ from: 'Minh', to: 'Lan', amount: 100000 }])
    expect(bbq.status).toBe('settled')
    expect(bbq.settledAt).toBeTruthy()
    expect(computeBalances(nights.filter((n) => n.status === 'active'))).toEqual([
      { from: 'Huy', to: 'Lan', amount: 100000 },
    ])
  })

  it('restoreNightsSnapshot puts the nights back exactly', () => {
    const original = fixtureNights()
    useSplitStore.setState({ nights: original })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    useSplitStore.getState().restoreNightsSnapshot(snapshot)
    expect(useSplitStore.getState().nights).toEqual(original)
  })

  it('restoreNightsSnapshot ignores Nomnoms that were deleted meanwhile', () => {
    useSplitStore.setState({ nights: fixtureNights() })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    useSplitStore.getState().deleteNight('bbq')
    useSplitStore.getState().restoreNightsSnapshot(snapshot)
    expect(useSplitStore.getState().nights.map((n) => n.id)).toEqual(['pizza'])
  })

  it('returns an empty snapshot and changes nothing when there is nothing to resolve', () => {
    useSplitStore.setState({ nights: fixtureNights() })
    const before = useSplitStore.getState().nights
    expect(useSplitStore.getState().resolvePair('An', 'Lan')).toEqual([])
    expect(useSplitStore.getState().nights).toBe(before)
  })
})
