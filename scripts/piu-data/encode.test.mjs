import { describe, expect, it } from 'vitest'
import { encodeCatalog, stringifyCatalog } from './encode.mjs'

const songs = new Map([
  [1, { id: 1, title: 'Bee', titleKo: null, artist: 'BanYa', cut: 'ARCADE', channel: 'ORIGINAL', series: 'NX~NXA', bpm: [147, 147] }],
  [2, { id: 2, title: '1948', titleKo: '천구백사십팔', artist: 'X', cut: 'ARCADE', channel: null, series: 'PHOENIX 2', bpm: null }],
])
const charts = [
  { id: 20, songId: 2, mode: 'D', level: null, prevLevel: null, premium: false, steamLink: false, stepArtist: null },
  { id: 10, songId: 1, mode: 'S', level: 19, prevLevel: 18, premium: true, steamLink: false, stepArtist: 'BanYa' },
]
const byChart = new Map([
  [10, { level: 19, badges: ['Runs', 'Twists'], coverage: { run: 0.5, twist_90: 0.25, mid6_doubles: 0 } }],
  [20, { level: 29, badges: ['Runs'], coverage: { run: 0.123 } }],
])
const skillsById = new Map([[10, new Set(['run', 'twist', 'gimmick'])], [20, new Set(['run'])]])

describe('encodeCatalog', () => {
  const { file, warnings } = encodeCatalog({
    songs, charts, byChart, skillsById,
    gimmickFrom: new Map([[10, ['PHOENIX 2 SLOW Lv.1']]]),
    titles: [{ id: 'RUN_S_5', track: 'RUN S', lv: 5, chart: 10 }],
    meta: { game: 'PHOENIX 2', patch: '1.01.0', builtAt: '2026-10-14', sources: [] },
  })

  it('orders charts by id and indexes songs, badges and step artists', () => {
    expect(file.charts.map((c) => c.id)).toEqual([10, 20])
    expect(file.songs.map((s) => s.t)).toEqual(['Bee', '1948'])
    expect(file.meta.badgeNames).toEqual(['Runs', 'Twists'])
    expect(file.meta.stepArtists).toEqual(['BanYa'])
  })
  it('packs a chart compactly', () => {
    expect(file.charts[0]).toEqual({
      id: 10, s: 0, m: 'S', lv: 19, p: 18,
      sk: 0b100110, // run (bit 1) + twist (bit 2) + gimmick (bit 5)
      cov: [0, 50, 25, 0, 0], b: [0, 1], g: ['PHOENIX 2 SLOW Lv.1'], f: 1, by: 0,
    })
  })
  it('falls back to the PIU Scores level when pumpout has none, with a warning', () => {
    expect(file.charts[1].lv).toBe(29)
    expect(warnings).toEqual(['1948 D: no pumpout level, using PIU Scores D29'])
  })
  it('keeps optional song fields out when empty', () => {
    expect(file.songs[0]).toEqual({ t: 'Bee', a: 'BanYa', y: 'ARCADE', ch: 'ORIGINAL', se: 'NX~NXA', bpm: [147, 147] })
    expect(file.songs[1]).toEqual({ t: '1948', k: '천구백사십팔', a: 'X', y: 'ARCADE', se: 'PHOENIX 2' })
  })
  it('stringifies one array element per line and round-trips', () => {
    const text = stringifyCatalog(file)
    expect(JSON.parse(text)).toEqual(file)
    expect(text.split('\n').length).toBeGreaterThan(file.charts.length + file.songs.length)
  })
})
