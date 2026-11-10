import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { chartsFileSchema, videosFileSchema } from './schema'
import { createVideoLoader, decodeVideos } from './videos'

const fixture = videosFileSchema.parse({
  meta: { builtAt: '2026-11-11', channel: 'NEVSISTER', url: 'https://www.youtube.com/@NEVSISTER', listed: 3 },
  mixes: ['PHOENIX 2', 'PHOENIX', 'RISE', 'XX'],
  v: { 3: ['xS17xxxxxxx', 1, 'L'], 4: ['xS19xxxxxxx', 3, 'R'], 10: ['F9jchbo1OFI', 1] },
})

describe('decodeVideos', () => {
  it('decodes ids, mixes and sides', () => {
    const videos = decodeVideos(fixture)
    expect(videos.get(3)).toEqual({ id: 'xS17xxxxxxx', mix: 'PHOENIX', side: 'left' })
    expect(videos.get(4)).toEqual({ id: 'xS19xxxxxxx', mix: 'XX', side: 'right' })
    expect(videos.get(10)).toEqual({ id: 'F9jchbo1OFI', mix: 'PHOENIX' })
    expect(videos.size).toBe(3)
  })
})

describe('createVideoLoader', () => {
  it('loads once and reuses the result', async () => {
    const importer = vi.fn().mockResolvedValue({ default: JSON.stringify(fixture) })
    const load = createVideoLoader(importer)
    expect((await load()).size).toBe(3)
    expect(await load()).toBe(await load())
    expect(importer).toHaveBeenCalledTimes(1)
  })
  it('retries after a failed load', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ default: JSON.stringify(fixture) })
    const load = createVideoLoader(importer)
    await expect(load()).rejects.toThrow('offline')
    expect((await load()).size).toBe(3)
  })
})

describe('committed videos.json', () => {
  const file = videosFileSchema.parse(JSON.parse(readFileSync('src/apps/pump/data/videos.json', 'utf8')))
  const charts = chartsFileSchema.parse(JSON.parse(readFileSync('src/apps/pump/data/charts.json', 'utf8')))
  const videos = decodeVideos(file)
  const chartIds = new Set(charts.charts.map((c) => c.id))

  it('only names charts that are in charts.json', () => {
    expect([...videos.keys()].filter((id) => !chartIds.has(id))).toEqual([])
  })
  it('links Sarabande D21 to F9jchbo1OFI', () => {
    const c = charts.charts.find((x) => charts.songs[x.s].t === 'Sarabande' && charts.songs[x.s].y === 'ARCADE' && x.m === 'D' && x.lv === 21)!
    expect(videos.get(c.id)).toEqual({ id: 'F9jchbo1OFI', mix: 'PHOENIX' })
  })
  it('covers at least 95 % of singles and doubles', () => {
    const sd = charts.charts.filter((c) => c.m !== 'HDB')
    expect(sd.filter((c) => videos.has(c.id)).length / sd.length).toBeGreaterThanOrEqual(0.95)
  })
})
