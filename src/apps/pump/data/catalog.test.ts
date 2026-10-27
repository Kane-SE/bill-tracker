import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chartsFileSchema } from './schema'
import { decodeCatalog, getCatalog } from './catalog'
import { fold } from '@/apps/pump/lib/normalize'
import { TRACKS } from './types'

const PATH = 'src/apps/pump/data/charts.json'

describe('decodeCatalog', () => {
  const file = chartsFileSchema.parse({
    meta: { game: 'PHOENIX 2', patch: '1.01.0', builtAt: '2026-10-14', sources: [], badgeNames: ['Runs', 'Twists'], stepArtists: ['BanYa'], imgHosts: ['https://a/', 'https://b/'] },
    songs: [{ t: 'Bee', k: '벌', a: 'BanYa', y: 'ARCADE', ch: 'ORIGINAL', se: 'NX~NXA', bpm: [147, 147], i: [1, 'x.png'] }, { t: 'NoArt', a: 'Z', y: 'ARCADE', se: 'NX~NXA' }],
    charts: [
      { id: 10, s: 0, m: 'S', lv: 19, p: 18, sk: 0b100110, cov: [0, 50, 25, 0, 0], b: [0, 1], g: ['PHOENIX 2 SLOW Lv.1'], f: 1, by: 0 },
      { id: 11, s: 0, m: 'HDB', lv: 20, sk: 0, f: 2 },
    ],
    titles: [{ id: 'RUN_S_5', track: 'RUN S', lv: 5, chart: 10 }],
  })
  const cat = decodeCatalog(file)

  it('expands a compact chart', () => {
    const c = cat.byId.get(10)!
    expect(c).toMatchObject({
      mode: 'S', level: 19, prevLevel: 18, skills: ['run', 'twist', 'gimmick'], badges: ['Runs', 'Twists'],
      gimmickFrom: ['PHOENIX 2 SLOW Lv.1'], premium: true, steamLink: false, stepArtist: 'BanYa', titleIds: ['RUN_S_5'],
    })
    expect(c.coverage).toEqual({ half: 0, run: 50, twist: 25, bracket: 0, drill: 0 })
    expect(c.song).toMatchObject({ title: 'Bee', titleKo: '벌', type: 'ARCADE', series: 'NX~NXA', bpm: [147, 147] })
  })
  it('decodes the song art path to a full URL', () => {
    expect(cat.byId.get(10)!.song.image).toBe('https://b/x.png')
    expect(cat.charts.length).toBe(2)
    expect(decodeCatalog({ ...file, charts: [{ id: 99, s: 1, m: 'S', lv: 5, sk: 0 }] }).byId.get(99)!.song.image).toBeUndefined()
  })
  it('flags Steam Link charts and leaves them without skill data', () => {
    expect(cat.byId.get(11)).toMatchObject({ steamLink: true, premium: false, skills: [], badges: [], coverage: undefined })
  })
  it('links titles to charts and lists the levels present', () => {
    expect(cat.titles[0].chart.id).toBe(10)
    expect(cat.levels).toEqual([19, 20])
  })
  it('folds title, Korean title and artist into one search key', () => {
    expect(cat.byId.get(10)!.song.search).toBe(fold('Bee 벌 BanYa'))
  })
})

describe('committed charts.json', () => {
  const file = chartsFileSchema.parse(JSON.parse(readFileSync(PATH, 'utf8')))
  const cat = decodeCatalog(file)

  it('stays within the 600 KB budget', () => {
    expect(statSync(PATH).size).toBeLessThanOrEqual(600_000)
  })
  it('has the 90 PHOENIX 2 titles, 10 per track, each resolving to a chart', () => {
    expect(cat.titles).toHaveLength(90)
    for (const track of TRACKS) expect(cat.titles.filter((t) => t.track === track)).toHaveLength(10)
    expect(cat.titles.every((t) => t.chart !== undefined)).toBe(true)
  })
  it('tags the 22 gimmick charts, matched by chart id across re-rates', () => {
    expect(cat.charts.filter((c) => c.skills.includes('gimmick'))).toHaveLength(22)
    expect(cat.byId.get(1017)).toMatchObject({ mode: 'D', level: 23 }) // Take Out [SLOW] Lv.9
    expect(cat.byId.get(1017)!.skills).toContain('gimmick')
  })
  it('has only S, D and HDB charts, and every HDB chart is Steam Link', () => {
    expect(new Set(cat.charts.map((c) => c.mode))).toEqual(new Set(['S', 'D', 'HDB']))
    expect(cat.charts.filter((c) => c.mode === 'HDB').every((c) => c.steamLink)).toBe(true)
  })
  it('gives every song art from a known host', () => {
    expect(file.songs.filter((s) => !s.i).map((s) => s.t)).toEqual(['Kitty Cat'])
    expect(file.songs.every((s) => !s.i || s.i[0] < file.meta.imgHosts.length)).toBe(true)
  })
  it('loads the same data through getCatalog', () => {
    expect(getCatalog().charts).toHaveLength(file.charts.length)
  })
})
