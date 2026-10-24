import { describe, expect, it } from 'vitest'
import type { Chart } from '@/apps/pump/data/types'
import { chartFacts, chartLine2, countLabel, levelLabel, modesLabel, titleName } from './labels'

const chart = {
  song: { title: 'Gargoyle', artist: 'SHK', type: 'FULLSONG', channel: 'ORIGINAL', series: 'XX', bpm: [150, 150], search: '' },
  stepArtist: 'FEFEMZ',
} as unknown as Chart

describe('labels', () => {
  it('formats levels and modes', () => {
    expect(levelLabel([19, 19])).toBe('Lv 19')
    expect(levelLabel([18, 20])).toBe('Lv 18–20')
    expect(modesLabel(['S', 'HDB'])).toBe('S or HD')
  })
  it('writes line 2 with the song type only when it is not Arcade', () => {
    expect(chartLine2(chart)).toBe('SHK · Full Song · XX')
    expect(chartLine2({ ...chart, song: { ...chart.song, type: 'ARCADE' } })).toBe('SHK · XX')
  })
  it('writes the chart facts, with a BPM range when it varies', () => {
    // The step artist gets its own line in the sheet: a step maker called "BPM" read as a tempo here.
    expect(chartFacts(chart)).toBe('Full Song · ORIGINAL · XX · 150 BPM')
    expect(chartFacts({ ...chart, song: { ...chart.song, bpm: [90, 180] } })).toBe('Full Song · ORIGINAL · XX · 90–180 BPM')
  })
  it('names a title', () => {
    expect(titleName({ track: 'TWIST D', lv: 7 })).toBe('TWIST D Lv.7')
  })
  it('counts in singular and plural', () => {
    expect(countLabel(1, 'chart')).toBe('1 chart')
    expect(countLabel(0, 'chart')).toBe('0 charts')
    expect(countLabel(4448, 'chart')).toBe('4,448 charts')
  })
})
