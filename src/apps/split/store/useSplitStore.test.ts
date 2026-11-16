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

describe('photoId', () => {
  it('updateItem keeps photoId when the patch has none', () => {
    const id = useSplitStore.getState().addNight()
    const shares = [{ name: 'Huy', amount: 180000 }]
    useSplitStore.getState().addItem(id, { label: 'Bò', payer: 'Huy', amount: 180000, shares, photoId: 'ph1' })
    const itemId = useSplitStore.getState().nights.find((x) => x.id === id)!.items[0].id
    useSplitStore.getState().updateItem(id, itemId, { label: 'Bò Mỹ', payer: 'Huy', amount: 180000, shares })
    const item = useSplitStore.getState().nights.find((x) => x.id === id)!.items[0]
    expect(item.photoId).toBe('ph1')
    expect(item.label).toBe('Bò Mỹ')
  })
})

describe('bill photo actions', () => {
  const line = (label: string, photoId?: string) => ({
    label, payer: 'Minh', amount: 100000, shares: [{ name: 'Minh', amount: 100000 }], photoId,
  })
  const itemsOf = (id: string) => useSplitStore.getState().nights.find((x) => x.id === id)!.items

  it('adds every line', () => {
    const id = useSplitStore.getState().addNight({ participants: ['Minh'] })
    useSplitStore.getState().addItemsFromPhoto(id, [line('Bò', 'ph1'), line('Gà', 'ph1')], [])
    const items = itemsOf(id)
    expect(items.map((i) => i.label)).toEqual(['Bò', 'Gà'])
    expect(items[0].id).not.toBe(items[1].id)
    expect(items.every((i) => i.photoId === 'ph1')).toBe(true)
  })

  it('dedupes case-insensitively', () => {
    const id = useSplitStore.getState().addNight({ participants: ['Minh', 'Lan'] })
    useSplitStore.getState().addItemsFromPhoto(id, [line('Bò', 'ph1')], ['lan', 'Thảo'])
    const n = useSplitStore.getState().nights.find((x) => x.id === id)!
    expect(n.participants).toEqual(['Minh', 'Lan', 'Thảo'])
    expect(useSplitStore.getState().knownNames).toContain('Thảo')
  })

  it('deleteItemsByPhoto removes only that photo\'s lines and returns the count', () => {
    const id = useSplitStore.getState().addNight({ participants: ['Minh'] })
    useSplitStore.getState().addItemsFromPhoto(
      id, [line('a', 'ph1'), line('b', 'ph1'), line('c', 'ph2'), line('hand')], [])
    expect(useSplitStore.getState().deleteItemsByPhoto(id, 'ph1')).toBe(2)
    expect(itemsOf(id).map((i) => i.label)).toEqual(['c', 'hand'])
    expect(useSplitStore.getState().deleteItemsByPhoto(id, 'ph1')).toBe(0)
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
