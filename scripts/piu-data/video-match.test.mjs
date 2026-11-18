import { describe, expect, it } from 'vitest'
import { applyOverrides, checkVideos, encodeVideos, matchVideos, stringifyVideos, videoCoverage } from './video-match.mjs'

const song = (t, y = 'ARCADE') => ({ t, a: '', y, se: 'PRIME 2' })
const file = {
  songs: [
    song('Sarabande'), // 0
    song('Sarabande', 'SHORTCUT'), // 1
    song('Mr. Larpus'), // 2
    song('Night Duty'), // 3
    song('Jogging'), // 4
    song('Lucky Star'), // 5
    song('Underworld'), // 6
    song('Underworld (PIU Edit.)'), // 7
    song('Beat Of The War 2', 'REMIX'), // 8
  ],
  charts: [
    { id: 10, s: 0, m: 'D', lv: 21 },
    { id: 11, s: 0, m: 'S', lv: 12 },
    { id: 12, s: 1, m: 'S', lv: 17 },
    { id: 13, s: 1, m: 'S', lv: 19 },
    { id: 14, s: 2, m: 'D', lv: 19, p: 18 },
    { id: 15, s: 3, m: 'S', lv: 19 },
    { id: 16, s: 3, m: 'S', lv: 20 },
    { id: 17, s: 4, m: 'D', lv: 22 },
    { id: 18, s: 5, m: 'HDB', lv: 18 },
    { id: 19, s: 6, m: 'D', lv: 20 },
    { id: 20, s: 7, m: 'D', lv: 20 },
    { id: 21, s: 8, m: 'D', lv: 21 },
    { id: 22, s: 0, m: 'S', lv: 16 },
  ],
}
const v = (id, title) => ({ id, title })
// newest first, like an uploads list
const videos = [
  v('F9jchbo1OFI', '[PUMP IT UP PHOENIX] Sarabande (사라반드) D21 | RUN D LV.6 Title'),
  v('p2s12', '[PUMP IT UP PHOENIX 2] Sarabande (사라반드) S12'),
  v('pairS12S16', '[PUMP IT UP PHOENIX] Sarabande(사라반드) S12 & S16'),
  v('p1s12', '[PUMP IT UP PHOENIX] Sarabande(사라반드) S12'),
  v('soloS16', '[PUMP IT UP PHOENIX] Sarabande(사라반드) S16'),
  v('oldD21', '[PUMP IT UP PHOENIX] Sarabande(사라반드) D21'),
  v('oldS16', '[PUMP IT UP PHOENIX] Sarabande(사라반드) S16'),
  v('xS17', '[PUMP IT UP PHOENIX] Sarabande(사라반드) - SHORT CUT - S17 & S19 (Phoenix Modified ver.)'),
  v('p1d18', '[PUMP IT UP PHOENIX] Mr. Larpus(미스터 라푸스) D18'),
  v('nd1720', '[PUMP IT UP PHOENIX] Night Duty (야근) S17 & S20 (XX S19 / SLOW LV.4 TITLE)'),
  v('xxNd19', '[PUMP IT UP XX] Night Duty S19'),
  v('xxJog', '[PUMP IT UP XX] 조깅(Jogging) D22 | PIU XX 2.04 Update'),
  v('riseLs', '[PUMP IT UP RISE] Lucky Star (럭키 스타) HD18'),
  v('uw', '[PUMP IT UP PHOENIX] Underworld ft.X (Foo) D20'),
  v('remix', '[PUMP IT UP PHOENIX] Beat Of The War 2 D21'),
  v('session', '[PIU PHOENIX] NEVSIST - Sarabande S20 PERFECT GAME'),
]
const { picks, unknownSongs, parsed } = matchVideos(file, videos)

describe('matchVideos', () => {
  it('picks Sarabande D21 from its PHOENIX video', () => {
    expect(picks.get(10)).toMatchObject({ v: 'F9jchbo1OFI', mix: 'PHOENIX' })
    expect(picks.get(10).side).toBeUndefined()
  })
  it('prefers a PHOENIX 2 video over a PHOENIX one', () => expect(picks.get(11)).toMatchObject({ v: 'p2s12', mix: 'PHOENIX 2' }))
  it('matches a re-rated chart by its PHOENIX level', () => expect(picks.get(14)).toMatchObject({ v: 'p1d18', mix: 'PHOENIX' }))
  it('prefers the PNX1-noted video over the PHOENIX-level one', () => {
    const more = [...videos, v('pnx', '[PUMP IT UP PHOENIX] Mr. Larpus (미스터 라푸스) D19 (PNX1 D18, XX D17)')]
    expect(matchVideos(file, more).picks.get(14)).toMatchObject({ v: 'pnx', mix: 'PHOENIX 2' })
  })
  it('gives the lower level the left side', () => {
    expect(picks.get(12)).toMatchObject({ v: 'xS17', side: 'L' })
    expect(picks.get(13)).toMatchObject({ v: 'xS17', side: 'R' })
    expect(picks.get(16)).toMatchObject({ v: 'nd1720', side: 'R' })
  })
  it('prefers a solo video, then the newest, within a mix', () => {
    expect(picks.get(22)).toMatchObject({ v: 'soloS16' })
  })
  it('falls back to an XX video', () => expect(picks.get(17)).toMatchObject({ v: 'xxJog', mix: 'XX' }))
  it('blocks an XX video whose level a PHOENIX title says moved', () => expect(picks.has(15)).toBe(false))
  it('matches a half-double only from RISE', () => expect(picks.get(18)).toMatchObject({ v: 'riseLs', mix: 'RISE' }))
  it('ignores a loose key shared by two songs', () => {
    expect(picks.has(19)).toBe(false)
    expect(picks.has(20)).toBe(false)
    expect(unknownSongs.get('Underworld ft.X (Foo) [ARCADE]')).toBe(1)
  })
  it('lets an ARCADE-typed video reach a REMIX song', () => expect(picks.get(21)).toMatchObject({ v: 'remix' }))
  it('counts the titles it could parse', () => expect(parsed).toBe(videos.length - 1))
})

describe('applyOverrides', () => {
  it('drops a pick with null and replaces one with an object', () => {
    const { picks: out, applied } = applyOverrides(picks, { 10: null, 15: { v: 'manual', mix: 'XX' } })
    expect(applied).toBe(2)
    expect(out.has(10)).toBe(false)
    expect(out.get(15)).toMatchObject({ v: 'manual', mix: 'XX' })
    expect(picks.has(10)).toBe(true) // the input is not changed
  })
})

describe('videoCoverage', () => {
  it('counts charts with a video by mode', () => {
    expect(videoCoverage(file, picks)).toEqual({ S: { yes: 5, total: 6 }, D: { yes: 4, total: 6 }, HDB: { yes: 1, total: 1 } })
  })
})

describe('checkVideos', () => {
  const full = { S: { yes: 100, total: 100 }, D: { yes: 100, total: 100 }, HDB: { yes: 0, total: 50 } }
  it('fails below 10,000 listed videos', () => expect(checkVideos({ listed: 9_999, coverage: full })).toHaveLength(1))
  it('fails below 95 % singles+doubles coverage', () => {
    expect(checkVideos({ listed: 12_000, coverage: { ...full, S: { yes: 94, total: 100 }, D: { yes: 95, total: 100 } } })).toHaveLength(1)
  })
  it('passes otherwise, whatever the half-doubles', () => expect(checkVideos({ listed: 12_000, coverage: full })).toEqual([]))
})

describe('encodeVideos', () => {
  const one = new Map([
    [10, { v: 'F9jchbo1OFI', mix: 'PHOENIX', title: 't' }],
    [3, { v: 'xS17', mix: 'PHOENIX', side: 'L', title: 't' }],
  ])
  const encoded = encodeVideos(one, { builtAt: '2026-11-11', listed: 3 })
  it('stores picks by chart id with mix indexes and sides', () => {
    expect(encoded.v).toEqual({ 3: ['xS17', 1, 'L'], 10: ['F9jchbo1OFI', 1] })
    expect(encoded.mixes).toEqual(['PHOENIX 2', 'PHOENIX', 'RISE', 'XX'])
    expect(encoded.meta).toEqual({ builtAt: '2026-11-11', channel: 'NEVSISTER', url: 'https://www.youtube.com/@NEVSISTER', listed: 3 })
  })
  it('writes one pick per line and parses back', () => {
    const text = stringifyVideos(encoded)
    expect(JSON.parse(text)).toEqual(encoded)
    expect(text).toContain('\n"10":["F9jchbo1OFI",1]')
  })
})
