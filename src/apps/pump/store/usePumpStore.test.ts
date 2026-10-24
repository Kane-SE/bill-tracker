import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_PRESETS, PUMP_STORAGE_KEY, usePumpStore } from './usePumpStore'

beforeEach(() => {
  usePumpStore.setState({ lastFilters: '', presets: [], earnedTitles: [] })
})

describe('usePumpStore', () => {
  it('remembers the last filters', () => {
    usePumpStore.getState().setLastFilters('m=D&lv=20-22')
    expect(usePumpStore.getState().lastFilters).toBe('m=D&lv=20-22')
  })
  it('saves up to 12 presets and deletes them', () => {
    const { savePreset } = usePumpStore.getState()
    for (let i = 0; i < MAX_PRESETS; i++) expect(savePreset(` P${i} `, `lv=${i + 1}`)).toBe(true)
    expect(savePreset('one too many', 'lv=20')).toBe(false)
    const { presets } = usePumpStore.getState()
    expect(presets).toHaveLength(MAX_PRESETS)
    expect(presets[0]).toMatchObject({ name: 'P0', query: 'lv=1' })
    usePumpStore.getState().deletePreset(presets[0].id)
    expect(usePumpStore.getState().presets).toHaveLength(MAX_PRESETS - 1)
  })
  it('toggles earned titles', () => {
    const { toggleTitle } = usePumpStore.getState()
    toggleTitle('HALF_1')
    toggleTitle('TWIST_D_7')
    toggleTitle('HALF_1')
    expect(usePumpStore.getState().earnedTitles).toEqual(['TWIST_D_7'])
  })
  it('persists only the three data fields', () => {
    usePumpStore.getState().toggleTitle('RUN_S_1')
    const stored = JSON.parse(localStorage.getItem(PUMP_STORAGE_KEY)!)
    expect(Object.keys(stored.state).sort()).toEqual(['earnedTitles', 'lastFilters', 'presets'])
  })
  it('falls back field by field when stored data is malformed', async () => {
    localStorage.setItem(PUMP_STORAGE_KEY, JSON.stringify({ state: { lastFilters: 5, presets: 'x', earnedTitles: ['A'] }, version: 1 }))
    await usePumpStore.persist.rehydrate()
    expect(usePumpStore.getState()).toMatchObject({ lastFilters: '', presets: [], earnedTitles: ['A'] })
  })
})
