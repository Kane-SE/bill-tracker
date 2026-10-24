import raw from './charts.json?raw'
import type { ChartsFile } from '@/apps/pump/data/schema'
import { COMPUTED_SKILLS, SKILLS, type Catalog, type Chart, type ComputedSkill, type Song, type Title } from '@/apps/pump/data/types'
import { fold } from '@/apps/pump/lib/normalize'

/** Expand the compact charts.json into typed objects (done once per app start). */
export function decodeCatalog(file: ChartsFile): Catalog {
  const songs: Song[] = file.songs.map((s) => ({
    title: s.t,
    titleKo: s.k,
    artist: s.a,
    type: s.y,
    channel: s.ch,
    series: s.se,
    bpm: s.bpm,
    search: fold([s.t, s.k ?? '', s.a].join(' ')),
  }))
  const titleIds = new Map<number, string[]>()
  for (const t of file.titles) titleIds.set(t.chart, [...(titleIds.get(t.chart) ?? []), t.id])

  const charts: Chart[] = file.charts.map((c) => ({
    id: c.id,
    song: songs[c.s],
    mode: c.m,
    level: c.lv,
    prevLevel: c.p,
    skills: SKILLS.filter((_, i) => (c.sk & (1 << i)) !== 0),
    coverage: c.cov
      ? (Object.fromEntries(COMPUTED_SKILLS.map((s, i) => [s, c.cov![i]])) as Record<ComputedSkill, number>)
      : undefined,
    badges: (c.b ?? []).map((i) => file.meta.badgeNames[i]),
    gimmickFrom: c.g ?? [],
    premium: ((c.f ?? 0) & 1) !== 0,
    steamLink: ((c.f ?? 0) & 2) !== 0,
    stepArtist: c.by === undefined ? undefined : file.meta.stepArtists[c.by],
    titleIds: titleIds.get(c.id) ?? [],
  }))
  const byId = new Map(charts.map((c) => [c.id, c]))
  const titles: Title[] = file.titles.map((t) => ({ id: t.id, track: t.track, lv: t.lv, chart: byId.get(t.chart)! }))
  const levels = [...new Set(charts.map((c) => c.level))].sort((a, b) => a - b)
  const { game, patch, builtAt, sources } = file.meta
  return { meta: { game, patch, builtAt, sources }, charts, byId, titles, levels }
}

let cached: Catalog | null = null

/**
 * The bundled catalog. charts.json is imported as text (`?raw`) so TypeScript
 * never infers a type from 5,000 rows; it is validated by catalog.test.ts.
 */
export function getCatalog(): Catalog {
  if (!cached) cached = decodeCatalog(JSON.parse(raw) as ChartsFile)
  return cached
}
