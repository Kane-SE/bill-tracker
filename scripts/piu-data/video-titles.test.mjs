import { describe, expect, it } from 'vitest'
import { MIXES, parseVideoTitle, songKeys } from './video-titles.mjs'

describe('parseVideoTitle', () => {
  it('reads a PHOENIX showcase title', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Sarabande (사라반드) D21 | RUN D LV.6 Title')).toMatchObject({
      mix: 'PHOENIX', era: 'P1', rank: 2, type: 'ARCADE', codes: [{ mode: 'D', level: 21 }], moved: [],
    })
  })
  it('treats a PNX1-noted PHOENIX title as a PHOENIX 2 video', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Mr. Larpus (미스터 라푸스) D19 (PNX1 D18, XX D17)')).toMatchObject({
      mix: 'PHOENIX 2', era: 'P2', rank: 0.5, codes: [{ mode: 'D', level: 19 }],
    })
  })
  it('reads a PHOENIX 2 title', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX 2] Do the Dance (빌려온 고양이) D22')).toMatchObject({ mix: 'PHOENIX 2', era: 'P2', rank: 0 })
  })
  it('reads a SHORT CUT pair', () => {
    const p = parseVideoTitle('[PUMP IT UP PHOENIX] Sarabande(사라반드) - SHORT CUT - S17 & S19 (Phoenix Modified ver.)')
    expect(p).toMatchObject({ type: 'SHORTCUT', codes: [{ mode: 'S', level: 17 }, { mode: 'S', level: 19 }] })
    expect(songKeys(p.song)[0]).toBe('sarabande')
  })
  it('reads a FULL SONG title', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Canon D(캐논 디) - FULL SONG - D23 (Phoenix Modified ver.)')).toMatchObject({ type: 'FULLSONG' })
  })
  it('drops the artist from Basic-mode titles', () => {
    const p = parseVideoTitle('[펌프 잇 업 2024] MAX(맥스) - Sarabande(사라반드) S4 & S7')
    expect(p).toMatchObject({ mix: 'PHOENIX', era: 'P1', rank: 3 })
    expect(songKeys(p.song)[0]).toBe('sarabande')
    const q = parseVideoTitle('[펌프 잇 업 2026] Camellia & Nanahira - Can I friend you on Bassbook? lol (베이스라인 하고있니? ㅎ) S4 & S7')
    expect(q).toMatchObject({ mix: 'PHOENIX 2', era: 'P2', rank: 1 })
    expect(songKeys(q.song)[0]).toBe('canifriendyouonbassbooklol')
    expect(parseVideoTitle('[펌프잇업 20주년] BanYa - Mr. Larpus(미스터 라푸스) S3 & S5')).toMatchObject({ mix: 'XX', era: 'XX', rank: 6 })
  })
  it('keeps only half-double codes from RISE', () => {
    expect(parseVideoTitle('[PUMP IT UP RISE] Lucky Star (럭키 스타) HD18')).toMatchObject({ mix: 'RISE', era: 'P2', rank: 4, codes: [{ mode: 'HDB', level: 18 }] })
    expect(parseVideoTitle('[PUMP IT UP RISE] PHYSALIS (피살리스) S22 (0.4.1 Update)')).toBeNull()
  })
  it('reads XX titles, including a code right before a bracket', () => {
    expect(parseVideoTitle('[PUMP IT UP XX] Monolith D22 (pre D23 → D22)')).toMatchObject({ mix: 'XX', era: 'XX', rank: 5, codes: [{ mode: 'D', level: 22 }] })
    expect(parseVideoTitle('[PUMP IT UP XX] Radetzky Can Can S8 & S13(Update for 2.05) | PIU XX 2.05 Update').codes).toHaveLength(2)
  })
  it('keeps a chart video whose notes mention a BGA version', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Ultimatum(얼티메이텀) S17 & S21 (Phoenix Modified ver.) & S17 BGA On Ver.')).toMatchObject({
      mix: 'PHOENIX', codes: [{ mode: 'S', level: 17 }, { mode: 'S', level: 21 }],
    })
  })
  it('lists the XX levels a PHOENIX title says moved', () => {
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Night Duty (야근) S17 & S20 (XX S19 / SLOW LV.4 TITLE)').moved).toEqual([{ mode: 'S', level: 19 }])
    expect(parseVideoTitle('[PUMP IT UP PHOENIX] Last Rebirth(라스트 리버스) D17 (pre D16 → D17 / Phoenix Modified ver.)').moved).toEqual([{ mode: 'D', level: 16 }])
  })
  it.each([
    '[PUMP IT UP XX] Bad Apple!! feat. Nomico - FULL SONG - D22(HALF LV.8) Mirror Pattern',
    '[PIU PHOENIX] NEVSIST - Dopplelganger(도플갱어) S20 PERFECT GAME 1,000,000 Score',
    '[PUMP IT UP PHOENIX] Sarabande(사라반드) CO-OP X2 (Phoenix Modified ver.)',
    '[PUMP IT UP PHOENIX] 1948 D?? RS (Random Step)',
    '[PUMP IT UP RISE] JUSTITIA (유스티티아) 6K D27 (EZ2ON REBOOT : R DLC)',
    '[PUMP IT UP XX] Radetzky Can Can(라젠스키 캉캉) BGA',
    '[PUMP IT UP PHOENIX] KUGUTSU(꼭두각시) S25 Gimmick Remove Part Compare | 기믹 제거 버전 비교',
    'NEVSIST - Soceress Elise Double Lv.24',
  ])('skips %s', (title) => {
    expect(parseVideoTitle(title)).toBeNull()
  })
})

describe('songKeys', () => {
  it('drops a Korean bracket for the exact key', () => expect(songKeys('Sarabande (사라반드)')[0]).toBe('sarabande'))
  it('uses the Latin name of a Korean-first title', () => expect(songKeys('조깅(Jogging)')).toContain('jogging'))
  it('keeps a Latin bracket as its own key', () => expect(songKeys('%X(Percent X)')).toContain('percentx'))
  it('drops ft. credits and subtitles', () => {
    expect(songKeys('Underworld(언더월드) ft.Skizzo (PIU Edit.)')).toContain('underworld')
    expect(songKeys('Underworld (PIU Edit.)')).toContain('underworld')
    expect(songKeys('Dement ~After Legend~')).toContain('dement')
  })
  it("drops the catalog's own type words", () => expect(songKeys('Canon D FULL Song MIX')).toContain('canond'))
  it('folds curly quotes like straight ones', () => {
    expect(songKeys('Reincarnate in “A” (리인카네이트 인 “A”)')[0]).toBe(songKeys('Reincarnate in "A"')[0])
  })
  it('lists the mixes in display order', () => expect(MIXES).toEqual(['PHOENIX 2', 'PHOENIX', 'RISE', 'XX']))
})
