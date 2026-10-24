import { z } from 'zod'
import { MODES, SERIES, SONG_TYPES, TRACKS } from '@/apps/pump/data/types'

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
