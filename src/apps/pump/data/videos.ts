import type { VideosFile } from '@/apps/pump/data/schema'
import type { ChartVideo } from '@/apps/pump/data/types'

/** Expand videos.json into chart id → video. */
export function decodeVideos(file: VideosFile): Map<number, ChartVideo> {
  const out = new Map<number, ChartVideo>()
  for (const [id, [video, mix, side]] of Object.entries(file.v)) {
    out.set(Number(id), { id: video, mix: file.mixes[mix], ...(side && { side: side === 'L' ? 'left' : 'right' }) })
  }
  return out
}

/**
 * Load the videos once and share the result. A failed load (e.g. offline
 * before the chunk was cached) is forgotten, so the next call tries again.
 */
export function createVideoLoader(importer: () => Promise<{ default: string }>): () => Promise<Map<number, ChartVideo>> {
  let pending: Promise<Map<number, ChartVideo>> | null = null
  return () => {
    pending ??= importer()
      .then((m) => decodeVideos(JSON.parse(m.default) as VideosFile))
      .catch((error: unknown) => {
        pending = null
        throw error
      })
    return pending
  }
}

/**
 * videos.json is a separate chunk (about 125 KB), fetched the first time a
 * chart sheet opens; it is validated by videos.test.ts, not at runtime.
 */
export const loadVideos = createVideoLoader(() => import('./videos.json?raw'))
