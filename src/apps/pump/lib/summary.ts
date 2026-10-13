import type { Filters } from '@/apps/pump/lib/filters'
import { levelLabel, modesLabel, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'

/** One line describing the filters, e.g. "S or D · Lv 18–20 · twist or bracket". Also a preset's default name. */
export function summarize(f: Filters): string {
  const parts: string[] = []
  if (f.modes.length) parts.push(modesLabel(f.modes))
  if (f.level) parts.push(levelLabel(f.level))
  if (f.skills.length) parts.push(f.skills.join(f.skillsAll ? ' and ' : ' or '))
  if (f.types.length) parts.push(f.types.map((t) => SONG_TYPE_LABEL[t]).join(' or '))
  if (f.series.length) parts.push(f.series.join(' or '))
  if (f.titleOnly) parts.push('title charts')
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`)
  return parts.length ? parts.join(' · ') : 'All charts'
}

/** Number shown on the Filters button: active facets (search excluded). */
export function activeFacetCount(f: Filters): number {
  return [
    f.modes.length > 0,
    f.level !== null,
    f.skills.length > 0,
    f.types.length > 0,
    f.series.length > 0,
    f.titleOnly,
    f.steamLink,
    f.hidePremium,
  ].filter(Boolean).length
}
