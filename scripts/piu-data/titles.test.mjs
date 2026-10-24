import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveLadders } from './titles.mjs'

const ladders = {
  P2: [
    { track: 'TWIST D', lv: 7, chart: 206, label: 'Love is a Danger Zone D21' },
    { track: 'SLOW', lv: 9, chart: 1017, label: 'Take Out D23' },
    { track: 'GIMMICK', lv: 1, chart: 7427, label: 'STAGER S17' },
  ],
  P1: [
    { track: 'TWIST', lv: 7, chart: 206, label: 'Love is a Danger Zone D21' },
    { track: 'GIMMICK', lv: 2, chart: 5541, label: '8 6 S16' },
  ],
  XX: [
    { track: 'GIMMICK', lv: 3, chart: 5510, label: 'LOVE SCENARIO S17' },
    { track: 'GIMMICK', lv: 1, chart: 1502, label: 'Yeo rae a S13' },
  ],
}

describe('resolveLadders', () => {
  const present = new Set([206, 1017, 7427, 5541, 1502])
  const r = resolveLadders(ladders, present)

  it('lists PHOENIX 2 titles with stable ids', () => {
    expect(r.titles).toEqual([
      { id: 'TWIST_D_7', track: 'TWIST D', lv: 7, chart: 206 },
      { id: 'SLOW_9', track: 'SLOW', lv: 9, chart: 1017 },
      { id: 'GIMMICK_1', track: 'GIMMICK', lv: 1, chart: 7427 },
    ])
  })
  it('forces the ladder skill on every ladder chart, SLOW counting as gimmick', () => {
    expect([...r.forced.get(206)]).toEqual(['twist'])
    expect([...r.forced.get(1017)]).toEqual(['gimmick'])
    expect(r.forced.get(5541).has('gimmick')).toBe(true)
  })
  it('records where each gimmick tag came from, matched by chart id', () => {
    expect(r.gimmickFrom.get(1017)).toEqual(['PHOENIX 2 SLOW Lv.9'])
    expect(r.gimmickFrom.get(1502)).toEqual(['XX GIMMICK Lv.1'])
  })
  it('skips older-game charts that left the game, but reports missing PHOENIX 2 charts', () => {
    expect(r.forced.has(5510)).toBe(false)
    expect(r.missing).toEqual([])
    const gone = resolveLadders(ladders, new Set([206, 7427]))
    expect(gone.missing.map((e) => e.chart)).toEqual([1017])
  })
})

describe('ladders.json', () => {
  const file = JSON.parse(readFileSync(new URL('./ladders.json', import.meta.url), 'utf8'))
  it('has 90 PHOENIX 2, 60 PHOENIX and 10 XX entries', () => {
    expect([file.P2.length, file.P1.length, file.XX.length]).toEqual([90, 60, 10])
  })
  it('has 10 levels per PHOENIX 2 track', () => {
    const per = {}
    for (const e of file.P2) per[e.track] = (per[e.track] ?? 0) + 1
    expect(Object.values(per)).toEqual(Array(9).fill(10))
  })
})
