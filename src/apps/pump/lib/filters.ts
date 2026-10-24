import { MODES, SERIES, SKILLS, SONG_TYPES, type Chart, type Mode, type Series, type SkillId, type SongType } from '@/apps/pump/data/types'
import { tokens } from '@/apps/pump/lib/normalize'
import { matchesSearch } from '@/apps/pump/lib/search'
import { levelLabel, modesLabel, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'

/** Live filter state. An empty list means "no restriction" for that facet. */
export interface Filters {
  modes: Mode[]
  level: [number, number] | null
  skills: SkillId[]
  /** skills combine with AND instead of OR */
  skillsAll: boolean
  types: SongType[]
  series: Series[]
  titleOnly: boolean
  /** show Steam Link content (HD mode, RISE songs); off hides it */
  steamLink: boolean
  hidePremium: boolean
  q: string
}

export const defaultFilters: Filters = {
  modes: [],
  level: null,
  skills: [],
  skillsAll: false,
  types: [],
  series: [],
  titleOnly: false,
  steamLink: false,
  hidePremium: false,
  q: '',
}

type Facet = 'modes' | 'level' | 'skills' | 'types' | 'series' | 'titleOnly' | 'hidePremium' | 'q'

/** Does the chart pass every active facet (except `skip`, used for option counts)? */
export function passes(c: Chart, f: Filters, toks: readonly string[], skip?: Facet): boolean {
  if (!f.steamLink && c.steamLink) return false
  if (skip !== 'modes' && f.modes.length > 0 && !f.modes.includes(c.mode)) return false
  if (skip !== 'level' && f.level && (c.level < f.level[0] || c.level > f.level[1])) return false
  if (skip !== 'skills' && f.skills.length > 0) {
    const has = (s: SkillId) => c.skills.includes(s)
    if (f.skillsAll ? !f.skills.every(has) : !f.skills.some(has)) return false
  }
  if (skip !== 'types' && f.types.length > 0 && !f.types.includes(c.song.type)) return false
  if (skip !== 'series' && f.series.length > 0 && !f.series.includes(c.song.series)) return false
  if (skip !== 'titleOnly' && f.titleOnly && c.titleIds.length === 0) return false
  if (skip !== 'hidePremium' && f.hidePremium && c.premium) return false
  if (skip !== 'q' && toks.length > 0 && !matchesSearch(c, toks)) return false
  return true
}

/** The charts that pass, in their input order. */
export function applyFilters(charts: readonly Chart[], f: Filters): Chart[] {
  const toks = tokens(f.q)
  return charts.filter((c) => passes(c, f, toks))
}

export interface FacetCounts {
  modes: Record<Mode, number>
  skills: Record<SkillId, number>
  types: Record<SongType, number>
  series: Record<Series, number>
}

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
}

/** For each option: how many charts it would show, with all the other facets applied. */
export function facetCounts(charts: readonly Chart[], f: Filters): FacetCounts {
  const toks = tokens(f.q)
  const out: FacetCounts = { modes: zeros(MODES), skills: zeros(SKILLS), types: zeros(SONG_TYPES), series: zeros(SERIES) }
  for (const c of charts) {
    if (passes(c, f, toks, 'modes')) out.modes[c.mode]++
    if (passes(c, f, toks, 'skills')) for (const s of c.skills) out.skills[s]++
    if (passes(c, f, toks, 'types')) out.types[c.song.type]++
    if (passes(c, f, toks, 'series')) out.series[c.song.series]++
  }
  return out
}

export interface Removal {
  label: string
  next: Filters
  count: number
}

/** Zero-results helper: each active filter value, the filters without it, and what that would show. */
export function removalSuggestions(charts: readonly Chart[], f: Filters, max = 3): Removal[] {
  const options: { label: string; next: Filters }[] = []
  if (f.modes.length) options.push({ label: modesLabel(f.modes), next: { ...f, modes: [] } })
  if (f.level) options.push({ label: levelLabel(f.level), next: { ...f, level: null } })
  for (const s of f.skills) options.push({ label: s, next: { ...f, skills: f.skills.filter((x) => x !== s) } })
  if (f.types.length) options.push({ label: f.types.map((t) => SONG_TYPE_LABEL[t]).join(' or '), next: { ...f, types: [] } })
  if (f.series.length) options.push({ label: f.series.join(' or '), next: { ...f, series: [] } })
  if (f.titleOnly) options.push({ label: 'title charts only', next: { ...f, titleOnly: false } })
  if (f.hidePremium) options.push({ label: 'hide Premium', next: { ...f, hidePremium: false } })
  if (f.q.trim()) options.push({ label: `"${f.q.trim()}"`, next: { ...f, q: '' } })
  return options
    .map((o) => ({ ...o, count: applyFilters(charts, o.next).length }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
}

export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

/** Turning Steam Link off also drops the HD mode, so the list never empties out silently. */
export function withSteamLink(f: Filters, on: boolean): Filters {
  return { ...f, steamLink: on, modes: on ? f.modes : f.modes.filter((m) => m !== 'HDB') }
}
