import { describe, expect, it } from 'vitest'
import { checkCatalog, diffCatalogs } from './report.mjs'

const file = (charts) => ({
  meta: {}, titles: Array(90).fill({}),
  songs: [{ t: 'Bee', i: 'a.png' }, { t: 'Conflict', i: 'b.png' }],
  charts,
})

describe('diffCatalogs', () => {
  it('lists new, removed and re-rated charts by name', () => {
    const prev = file([{ id: 1, s: 0, m: 'S', lv: 19 }, { id: 2, s: 1, m: 'D', lv: 24 }])
    const next = file([{ id: 2, s: 1, m: 'D', lv: 25 }, { id: 3, s: 0, m: 'HDB', lv: 20 }])
    expect(diffCatalogs(prev, next)).toEqual({ added: ['Bee HD20'], removed: ['Bee S19'], rerated: ['Conflict D24 → D25'] })
  })
  it('treats a first build as all new', () => {
    expect(diffCatalogs(null, file([{ id: 1, s: 0, m: 'S', lv: 19 }])).added).toEqual(['Bee S19'])
  })
})

describe('checkCatalog', () => {
  const ok = { missingTitles: [], unmatched: [], sdCount: 100, sdWithSkills: 98, bytes: 500_000 }
  it('passes a healthy build', () => {
    expect(checkCatalog(file([{ id: 1, s: 0, m: 'S', lv: 19 }]), ok)).toEqual([])
  })
  it('fails on missing title charts, unrated charts, low skill coverage, size and many unmatched rows', () => {
    const errors = checkCatalog(file([{ id: 1, s: 0, m: 'S', lv: null }]), {
      missingTitles: [{ label: 'Take Out D23' }],
      unmatched: Array(51).fill({ song: 'x' }),
      sdCount: 100, sdWithSkills: 90, bytes: 600_001,
    })
    expect(errors).toHaveLength(5)
  })
  it('passes at 668/669 songs with art and fails below 95%', () => {
    const withArt = (n) => ({
      ...file([{ id: 1, s: 0, m: 'S', lv: 19 }]),
      songs: Array.from({ length: 669 }, (_, k) => (k < n ? { t: 'x', i: 'a.png' } : { t: 'x' })),
    })
    expect(checkCatalog(withArt(668), ok)).toEqual([])
    expect(checkCatalog(withArt(300), ok)).toEqual(['Only 300/669 songs have song art (need ≥ 95%)'])
  })
})
