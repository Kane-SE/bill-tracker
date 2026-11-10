import { describe, expect, it } from 'vitest'
import { videoCaption, videoUrl } from './video'

describe('videoUrl', () => {
  it('links to the YouTube watch page', () => {
    expect(videoUrl({ id: 'F9jchbo1OFI', mix: 'PHOENIX' })).toBe('https://www.youtube.com/watch?v=F9jchbo1OFI')
  })
})

describe('videoCaption', () => {
  it('names the chart, channel and mix', () => {
    expect(videoCaption({ mode: 'D', level: 21 }, { id: 'x', mix: 'PHOENIX' })).toBe('Watch D21 on YouTube · NEVSISTER · PHOENIX')
  })
  it('says which side of a two-chart video', () => {
    expect(videoCaption({ mode: 'S', level: 17 }, { id: 'x', mix: 'XX', side: 'left' })).toBe('Watch S17 on YouTube · NEVSISTER · XX · left side')
  })
  it('uses the short half-double code', () => {
    expect(videoCaption({ mode: 'HDB', level: 18 }, { id: 'x', mix: 'RISE' })).toBe('Watch HD18 on YouTube · NEVSISTER · RISE')
  })
})
