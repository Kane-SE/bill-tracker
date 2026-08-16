import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'

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
})
