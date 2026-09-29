import { describe, expect, it, beforeEach } from 'vitest'
import { useSplitStore } from './useSplitStore'

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
