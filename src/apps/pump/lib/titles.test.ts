import { describe, expect, it } from 'vitest'
import type { Title } from '@/apps/pump/data/types'
import { makeChart } from './__fixtures__/charts'
import { earnedCount, trackViews } from './titles'

const t = (track: Title['track'], lv: number): Title => ({ id: `${track.replace(/ /g, '_')}_${lv}`, track, lv, chart: makeChart() })
const titles = [t('HALF', 2), t('HALF', 1), t('TWIST S', 1)]

describe('trackViews', () => {
  it('lists all 9 tracks in official order, levels ascending, with progress and the next title', () => {
    const views = trackViews(titles, new Set(['HALF_1']))
    expect(views.map((v) => v.track)).toEqual(['TWIST S', 'TWIST D', 'RUN S', 'RUN D', 'DRILL', 'GIMMICK', 'SLOW', 'HALF', 'BRACKET'])
    const half = views.find((v) => v.track === 'HALF')!
    expect(half.titles.map((x) => x.lv)).toEqual([1, 2])
    expect(half.earned).toBe(1)
    expect(half.next?.id).toBe('HALF_2')
  })
  it('has no next title once a track is complete', () => {
    expect(trackViews(titles, new Set(['TWIST_S_1'])).find((v) => v.track === 'TWIST S')!.next).toBeNull()
  })
})

describe('earnedCount', () => {
  it('ignores stored ids that are no longer in the data', () => {
    expect(earnedCount(titles, new Set(['HALF_1', 'OLD_TITLE_9']))).toBe(1)
  })
})
