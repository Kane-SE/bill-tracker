/** Fixed order. Bit i of a chart's `sk` mask in charts.json is SKILLS[i]. */
export const SKILLS = ['half', 'run', 'twist', 'bracket', 'drill', 'gimmick'] as const
export type SkillId = (typeof SKILLS)[number]

/** Skills with a coverage score (gimmick comes only from title lists). */
export const COMPUTED_SKILLS = ['half', 'run', 'twist', 'bracket', 'drill'] as const
export type ComputedSkill = (typeof COMPUTED_SKILLS)[number]

export const MODES = ['S', 'D', 'HDB'] as const
export type Mode = (typeof MODES)[number]

export const SONG_TYPES = ['ARCADE', 'SHORTCUT', 'REMIX', 'FULLSONG'] as const
export type SongType = (typeof SONG_TYPES)[number]

/** PHOENIX 2's Series Zone groups, oldest first. */
export const SERIES = ['1st~ZERO', 'NX~NXA', 'FIESTA~FIESTA 2', 'PRIME', 'PRIME 2', 'XX', 'PHOENIX', 'PHOENIX 2'] as const
export type Series = (typeof SERIES)[number]

/** PHOENIX 2 skill-title tracks, in the official title page's order. */
export const TRACKS = ['TWIST S', 'TWIST D', 'RUN S', 'RUN D', 'DRILL', 'GIMMICK', 'SLOW', 'HALF', 'BRACKET'] as const
export type Track = (typeof TRACKS)[number]

export interface Song {
  title: string
  titleKo?: string
  artist: string
  type: SongType
  channel?: string
  series: Series
  bpm?: [number, number]
  /** full URL of the song jacket art */
  image?: string
  /** fold(title + titleKo + artist), for search */
  search: string
}

export interface Chart {
  /** pumpout chart id — stable across data rebuilds */
  id: number
  song: Song
  mode: Mode
  level: number
  /** PHOENIX level, only when it differs */
  prevLevel?: number
  /** empty = no skill data */
  skills: SkillId[]
  /** 0–100 per computed skill; absent = no skill data */
  coverage?: Record<ComputedSkill, number>
  /** piucenter top-3 badges */
  badges: string[]
  /** e.g. "PHOENIX 2 SLOW Lv.2"; non-empty means tagged gimmick */
  gimmickFrom: string[]
  premium: boolean
  steamLink: boolean
  stepArtist?: string
  /** PHOENIX 2 title ids this chart unlocks */
  titleIds: string[]
}

export interface Title {
  id: string
  track: Track
  lv: number
  chart: Chart
}

export interface CatalogMeta {
  game: string
  patch: string
  builtAt: string
  sources: { name: string; url: string; ref: string }[]
}

export interface Catalog {
  meta: CatalogMeta
  charts: Chart[]
  byId: Map<number, Chart>
  titles: Title[]
  /** every level that exists in the data, ascending */
  levels: number[]
}
