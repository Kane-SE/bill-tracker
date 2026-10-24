import { describe, expect, it } from 'vitest'
import { makeChart, makeSong } from './__fixtures__/charts'
import { applyFilters, defaultFilters, facetCounts, removalSuggestions, toggleValue, withSteamLink, type Filters } from './filters'

const bee = makeSong({ title: 'Bee', artist: 'BanYa', series: 'NX~NXA' })
const conflict = makeSong({ title: 'Conflict', artist: 'Siromaru + Cranky', series: 'XX', type: 'ARCADE' })
const jupin = makeSong({ title: 'Jupin', titleKo: '주핀', artist: 'Nato', series: 'PRIME 2', type: 'SHORTCUT' })

const charts = [
  makeChart({ id: 1, song: bee, mode: 'S', level: 19, skills: ['run'] }),
  makeChart({ id: 2, song: bee, mode: 'D', level: 20, skills: ['run', 'twist'], titleIds: ['RUN_D_4'] }),
  makeChart({ id: 3, song: conflict, mode: 'D', level: 21, skills: ['twist', 'bracket'], premium: true }),
  makeChart({ id: 4, song: jupin, mode: 'S', level: 20, skills: ['run'] }),
  makeChart({ id: 5, song: bee, mode: 'HDB', level: 20, steamLink: true }),
]
const f = (over: Partial<Filters>): Filters => ({ ...defaultFilters, ...over })
const ids = (cs: { id: number }[]) => cs.map((c) => c.id)

describe('applyFilters', () => {
  it('shows everything except Steam Link charts by default, keeping order', () => {
    expect(ids(applyFilters(charts, defaultFilters))).toEqual([1, 2, 3, 4])
    expect(ids(applyFilters(charts, f({ steamLink: true })))).toEqual([1, 2, 3, 4, 5])
  })
  it('ORs values within a facet and ANDs facets', () => {
    expect(ids(applyFilters(charts, f({ modes: ['S', 'D'], level: [20, 21] })))).toEqual([2, 3, 4])
    expect(ids(applyFilters(charts, f({ modes: ['D'], level: [20, 20] })))).toEqual([2])
  })
  it('combines skills with any by default and all on request', () => {
    expect(ids(applyFilters(charts, f({ skills: ['twist', 'bracket'] })))).toEqual([2, 3])
    expect(ids(applyFilters(charts, f({ skills: ['twist', 'bracket'], skillsAll: true })))).toEqual([3])
  })
  it('filters song type, series, title charts and Premium', () => {
    expect(ids(applyFilters(charts, f({ types: ['SHORTCUT'] })))).toEqual([4])
    expect(ids(applyFilters(charts, f({ series: ['NX~NXA', 'XX'] })))).toEqual([1, 2, 3])
    expect(ids(applyFilters(charts, f({ titleOnly: true })))).toEqual([2])
    expect(ids(applyFilters(charts, f({ hidePremium: true })))).toEqual([1, 2, 4])
  })
  it('searches title, Korean title and artist, every token required', () => {
    expect(ids(applyFilters(charts, f({ q: 'banya' })))).toEqual([1, 2])
    expect(ids(applyFilters(charts, f({ q: '주' })))).toEqual([4])
    expect(ids(applyFilters(charts, f({ q: 'bee nato' })))).toEqual([])
    expect(ids(applyFilters(charts, f({ q: '  -  ' })))).toEqual([1, 2, 3, 4]) // blank-ish query = no search
  })
})

describe('facetCounts', () => {
  it('counts each option with all the other facets applied', () => {
    const c = facetCounts(charts, f({ modes: ['D'], skills: ['run'] }))
    expect(c.modes).toEqual({ S: 2, D: 1, HDB: 0 }) // modes ignored, skills=run applied
    expect(c.skills.twist).toBe(2) // skills ignored, modes=D applied: charts 2 and 3
    expect(c.series['NX~NXA']).toBe(1) // series ignored, modes=D + skills=run applied: chart 2
  })
})

describe('removalSuggestions', () => {
  it('offers the best removals first, with counts, and only ones that help', () => {
    const s = removalSuggestions(charts, f({ modes: ['S'], skills: ['bracket'], level: [19, 19] }))
    expect(s.map((r) => [r.label, r.count])).toEqual([
      ['bracket', 1],
    ])
    expect(removalSuggestions(charts, f({ q: 'zzz' })).map((r) => r.label)).toEqual(['"zzz"'])
  })
})

describe('helpers', () => {
  it('toggles a value in a list', () => {
    expect(toggleValue(['S'], 'D')).toEqual(['S', 'D'])
    expect(toggleValue(['S', 'D'], 'S')).toEqual(['D'])
  })
  it('drops the HD mode when Steam Link is turned off', () => {
    expect(withSteamLink(f({ steamLink: true, modes: ['D', 'HDB'] }), false)).toMatchObject({ steamLink: false, modes: ['D'] })
    expect(withSteamLink(f({ modes: ['D'] }), true)).toMatchObject({ steamLink: true, modes: ['D'] })
  })
})
