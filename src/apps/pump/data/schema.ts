import { z } from 'zod'
import { MODES, SERIES, SONG_TYPES, TRACKS, VIDEO_MIXES } from '@/apps/pump/data/types'

/**
 * The compact charts.json written by scripts/piu-data/build.mjs. Short keys
 * keep it under the 600 KB budget; decodeCatalog() expands it.
 */
export const chartsFileSchema = z.object({
  meta: z.object({
    game: z.string(),
    patch: z.string(),
    builtAt: z.string(),
    sources: z.array(z.object({ name: z.string(), url: z.string(), ref: z.string() })),
    badgeNames: z.array(z.string()),
    stepArtists: z.array(z.string()),
    imgHosts: z.array(z.string()), // song art base URLs, indexed by song.i[0]
  }),
  songs: z.array(
    z.object({
      t: z.string(), // title
      k: z.string().optional(), // Korean title
      a: z.string(), // artist
      y: z.enum(SONG_TYPES), // song type
      ch: z.string().optional(), // channel
      se: z.enum(SERIES), // series (debut group)
      bpm: z.tuple([z.number(), z.number()]).optional(),
      i: z.tuple([z.number().int().nonnegative(), z.string()]).optional(), // song art: [host index, file]
    }),
  ),
  charts: z.array(
    z.object({
      id: z.number().int(),
      s: z.number().int().nonnegative(), // song index
      m: z.enum(MODES),
      lv: z.number().int().min(1),
      p: z.number().int().optional(), // PHOENIX level when it changed
      sk: z.number().int().min(0).max(63), // skill bitmask, SKILLS order
      cov: z.array(z.number().int().min(0).max(100)).length(5).optional(),
      b: z.array(z.number().int().nonnegative()).optional(), // badge indexes
      g: z.array(z.string()).optional(), // gimmick ladders
      f: z.number().int().min(0).max(3).optional(), // 1 premium, 2 steam link
      by: z.number().int().nonnegative().optional(), // step artist index
    }),
  ),
  titles: z.array(
    z.object({ id: z.string(), track: z.enum(TRACKS), lv: z.number().int().min(1).max(10), chart: z.number().int() }),
  ),
})

export type ChartsFile = z.infer<typeof chartsFileSchema>

const youtubeId = z.string().regex(/^[\w-]{11}$/)
const mixIndex = z.number().int().min(0).max(VIDEO_MIXES.length - 1)

/**
 * The videos.json written by scripts/piu-data/videos.mjs: chart id →
 * [YouTube id, index into `mixes`] plus 'L' or 'R' for a two-singles video.
 */
export const videosFileSchema = z.object({
  meta: z.object({ builtAt: z.string(), channel: z.string(), url: z.string(), listed: z.number().int().nonnegative() }),
  mixes: z.tuple([z.literal(VIDEO_MIXES[0]), z.literal(VIDEO_MIXES[1]), z.literal(VIDEO_MIXES[2]), z.literal(VIDEO_MIXES[3])]),
  v: z.record(
    z.string().regex(/^\d+$/),
    z.union([z.tuple([youtubeId, mixIndex]), z.tuple([youtubeId, mixIndex, z.enum(['L', 'R'])])]),
  ),
})

export type VideosFile = z.infer<typeof videosFileSchema>
