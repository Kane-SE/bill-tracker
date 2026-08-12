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
