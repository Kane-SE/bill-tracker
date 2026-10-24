import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, parseBackup } from './backup'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'

const v2 = {
  version: 2,
  apps: { split: { knownNames: ['Anna'], nights: [], promotedNames: [] } },
  appearance: { palette: 'coffee', mode: 'light' },
}
const v1 = { version: 1, knownNames: ['Bob'], nights: [] }

describe('parseBackup', () => {
  it('accepts a v2 file', () => {
    const r = parseBackup(JSON.stringify(v2))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.apps.split.knownNames).toEqual(['Anna'])
  })
  it('migrates a v1 file into the v2 shape', () => {
    const r = parseBackup(JSON.stringify(v1))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.version).toBe(2)
      expect(r.data.apps.split.knownNames).toEqual(['Bob'])
      expect(r.data.apps.split.promotedNames).toEqual([])
    }
  })
  it('rejects non-JSON', () => {
    expect(parseBackup('not json').ok).toBe(false)
  })
  it('rejects a foreign object', () => {
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false)
  })
  it('round-trips Nomnom payments in a v2 file', () => {
    const night = {
      id: 'n1', date: '2026-09-29', status: 'active', participants: ['A', 'B'],
      items: [], payments: [{ from: 'B', to: 'A', amount: 30000 }],
    }
    const file = { ...v2, apps: { split: { ...v2.apps.split, nights: [night] } } }
    const r = parseBackup(JSON.stringify(file))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.apps.split.nights[0].payments).toEqual(night.payments)
  })
})

describe('backup and Pump earned titles', () => {
  it('still imports a v2 file made before Pump existed', () => {
    const r = parseBackup(JSON.stringify(v2))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.apps.pump).toBeUndefined()
  })
  it('round-trips earned titles', () => {
    usePumpStore.setState({ earnedTitles: ['HALF_1', 'TWIST_D_7'] })
    const r = parseBackup(JSON.stringify(buildBackup()))
    expect(r.ok).toBe(true)
    usePumpStore.setState({ earnedTitles: [] })
    // No appearance: applyTheme() needs a DOM, and these tests run in node.
    if (r.ok) applyBackup({ ...r.data, appearance: undefined })
    expect(usePumpStore.getState().earnedTitles).toEqual(['HALF_1', 'TWIST_D_7'])
  })
  it('rejects a malformed pump section', () => {
    const bad = { ...v2, apps: { ...v2.apps, pump: { earnedTitles: 'HALF_1' } } }
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })
})
