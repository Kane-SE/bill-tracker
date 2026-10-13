import { MODES, SERIES, SKILLS, SONG_TYPES, type Series, type SongType } from '@/apps/pump/data/types'
import type { Filters } from '@/apps/pump/lib/filters'

/** Query params that hold filters. Everything else (tab, f, c, a) is UI state. */
export const FILTER_KEYS = ['m', 'lv', 'sk', 'all', 'ty', 'v', 'tc', 'sl', 'np', 'q'] as const
/** Params that mean "a sheet is open". */
export const SHEET_KEYS = ['f', 'c', 'a'] as const

const TYPE_CODE: Record<SongType, string> = { ARCADE: 'arcade', SHORTCUT: 'shortcut', REMIX: 'remix', FULLSONG: 'fullsong' }
const SERIES_CODE: Record<Series, string> = {
  '1st~ZERO': '1st', 'NX~NXA': 'nx', 'FIESTA~FIESTA 2': 'fiesta', PRIME: 'prime',
  'PRIME 2': 'prime2', XX: 'xx', PHOENIX: 'phoenix', 'PHOENIX 2': 'phoenix2',
}

function list(p: URLSearchParams, key: string): Set<string> {
  return new Set((p.get(key) ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}

/** "18-20" or "19" → [from, to] (ordered); anything else → null. */
export function parseLevel(raw: string | null): [number, number] | null {
  const m = raw?.match(/^(\d{1,2})(?:-(\d{1,2}))?$/)
  if (!m) return null
  const a = Number(m[1])
  const b = m[2] === undefined ? a : Number(m[2])
  if (a < 1 || b < 1) return null
  return [Math.min(a, b), Math.max(a, b)]
}

/** Forgiving: unknown values are dropped; lists come back in canonical order. */
export function parseFilters(p: URLSearchParams): Filters {
  const steamLink = p.get('sl') === '1'
  const m = list(p, 'm')
  const sk = list(p, 'sk')
  const ty = list(p, 'ty')
  const v = list(p, 'v')
  return {
    modes: MODES.filter((x) => m.has(x.toLowerCase()) && (x !== 'HDB' || steamLink)),
    level: parseLevel(p.get('lv')),
    skills: SKILLS.filter((x) => sk.has(x)),
    skillsAll: p.get('all') === '1',
    types: SONG_TYPES.filter((x) => ty.has(TYPE_CODE[x])),
    series: SERIES.filter((x) => v.has(SERIES_CODE[x])),
    titleOnly: p.get('tc') === '1',
    steamLink,
    hidePremium: p.get('np') === '1',
    q: p.get('q') ?? '',
  }
}

/** Canonical query string (no leading "?"): fixed key and value order, defaults omitted. */
export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams()
  const modes = MODES.filter((x) => f.modes.includes(x) && (x !== 'HDB' || f.steamLink))
  if (modes.length) p.set('m', modes.join(','))
  if (f.level) p.set('lv', f.level[0] === f.level[1] ? String(f.level[0]) : `${f.level[0]}-${f.level[1]}`)
  const skills = SKILLS.filter((x) => f.skills.includes(x))
  if (skills.length) p.set('sk', skills.join(','))
  if (f.skillsAll) p.set('all', '1')
  const types = SONG_TYPES.filter((x) => f.types.includes(x))
  if (types.length) p.set('ty', types.map((x) => TYPE_CODE[x]).join(','))
  const series = SERIES.filter((x) => f.series.includes(x))
  if (series.length) p.set('v', series.map((x) => SERIES_CODE[x]).join(','))
  if (f.titleOnly) p.set('tc', '1')
  if (f.steamLink) p.set('sl', '1')
  if (f.hidePremium) p.set('np', '1')
  if (f.q.trim()) p.set('q', f.q)
  return p.toString().replace(/%2C/g, ',')
}

/** `current` with its filter params replaced by `f`; UI params (tab, sheets) untouched. */
export function withFilters(current: URLSearchParams, f: Filters): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of FILTER_KEYS) next.delete(k)
  for (const [k, v] of new URLSearchParams(serializeFilters(f))) next.set(k, v)
  return next
}

export function hasFilterParams(p: URLSearchParams): boolean {
  return FILTER_KEYS.some((k) => p.has(k))
}

/** `current` with the filters (but not the search text) taken from the stored `live` query. */
export function mergeLiveFilters(current: URLSearchParams, live: string): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of FILTER_KEYS) if (k !== 'q') next.delete(k)
  for (const [k, v] of new URLSearchParams(live)) if (k !== 'q') next.set(k, v)
  return next
}

/**
 * The URL after a sheet closes. Filter taps inside the Filters sheet replaced
 * the entry it pushed, so the entry Back lands on still holds the filters from
 * before; re-apply the live ones and drop every sheet param.
 */
export function paramsAfterClose(current: URLSearchParams, live: string): URLSearchParams {
  return withoutSheets(mergeLiveFilters(current, live))
}

/** `current` without any sheet param. Closing a chart or About sheet changes nothing else. */
export function withoutSheets(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of SHEET_KEYS) next.delete(k)
  return next
}
