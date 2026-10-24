import { describe, expect, it } from 'vitest'
import { joinCoverage, titleKey } from './join.mjs'

const song = (id, title, cut, names = [title]) => [id, { id, title, names, cut }]
const chart = (id, songId, mode, level) => ({ id, songId, mode, level })
const row = (song, mode, level, songType = 'Arcade') => ({ song, mode, level, songType, badges: [], coverage: {} })

const songs = new Map([
  song(1, 'Bee', 'ARCADE'),
  song(2, 'Jupin', 'SHORTCUT'),
  song(3, 'Phalanx', 'ARCADE', ['Phalanx', 'Phalanx "RS2018 edit"']),
  song(4, 'X Treme', 'ARCADE'),
  song(5, 'PRiMA MATERiA', 'SHORTCUT'),
  song(6, '1948', 'ARCADE'),
  song(7, 'Extreme Music School 1st period', 'ARCADE'),
  song(8, 'Bee', 'FULLSONG'),
])
const charts = [
  chart(10, 1, 'S', 19), chart(11, 2, 'S', 20), chart(12, 3, 'D', 24), chart(13, 4, 'S', 18),
  chart(14, 5, 'S', 23), chart(15, 6, 'D', null), chart(16, 7, 'S', 23), chart(17, 8, 'S', 19),
  chart(18, 1, 'HDB', 19),
]

describe('titleKey', () => {
  it('reads a cut suffix and folds the rest', () => {
    expect(titleKey('Jupin - SHORT CUT -')).toEqual({ key: 'jupin', cut: 'SHORTCUT' })
    expect(titleKey('Gargoyle - FULL SONG -')).toEqual({ key: 'gargoyle', cut: 'FULLSONG' })
    expect(titleKey('Bee')).toEqual({ key: 'bee', cut: null })
  })
  it('applies the alias table', () => {
    expect(titleKey('X-Tream').key).toBe('xtreme')
    expect(titleKey('Love is a Danger Zone 2 Try To B.P.M').key).toBe('loveisadangerzonetrytobpm')
  })
})

describe('joinCoverage', () => {
  const { byChart, unmatched } = joinCoverage(charts, songs, [
    row('Bee', 'S', 19),
    row('Jupin - SHORT CUT -', 'S', 20, 'ShortCut'),
    row('Phalanx "RS2018 edit"', 'D', 24),
    row('X-Tream', 'S', 18),
    row('PRiMA MATERiA - SHORT CUT -', 'S', 23, 'Arcade'), // suffix beats the CSV's song type
    row('1948', 'D', 29), // pumpout has no level for this chart
    row('Extreme Music School 1st period feat. Nanahira', 'S', 23), // prefix match
    row('Bee - FULL SONG -', 'S', 19, 'FullSong'),
    row('Nowhere', 'S', 5),
  ])
  it('matches exact titles, aliases, suffix cuts, prefixes and unrated charts', () => {
    expect([...byChart.keys()].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 16, 17])
    expect(byChart.get(15).level).toBe(29)
  })
  it('returns rows it cannot place instead of dropping them', () => {
    expect(unmatched.map((r) => r.song)).toEqual(['Nowhere'])
  })
  it('never attaches CSV rows to Half-Double charts', () => {
    expect(byChart.has(18)).toBe(false)
  })
  it('does not attach two rows to one chart', () => {
    const { byChart: b, unmatched: u } = joinCoverage(charts, songs, [row('Bee', 'S', 19), row('Bee', 'S', 19)])
    expect(b.size).toBe(1)
    expect(u).toHaveLength(1)
  })
})
