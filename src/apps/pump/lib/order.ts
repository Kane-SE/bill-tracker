import type { Chart, Mode, SkillId } from '@/apps/pump/data/types'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
const MODE_ORDER: Record<Mode, number> = { S: 0, D: 1, HDB: 2 }

/** List order: level, then title, then S before D before HD. Sort once; filtering keeps the order. */
export function sortCharts(charts: readonly Chart[]): Chart[] {
  return [...charts].sort(
    (a, b) =>
      a.level - b.level ||
      collator.compare(a.song.title, b.song.title) ||
      MODE_ORDER[a.mode] - MODE_ORDER[b.mode] ||
      a.id - b.id,
  )
}

export type ListRow =
  | { kind: 'header'; key: string; level: number; count: number }
  | { kind: 'chart'; key: string; chart: Chart }

/** Sorted charts → rows with a "Lv 19 · 51" header before each level. */
export function toRows(sorted: readonly Chart[]): ListRow[] {
  const rows: ListRow[] = []
  let header: Extract<ListRow, { kind: 'header' }> | null = null
  for (const c of sorted) {
    if (!header || header.level !== c.level) {
      header = { kind: 'header', key: `lv-${c.level}`, level: c.level, count: 0 }
      rows.push(header)
    }
    header.count++
    rows.push({ kind: 'chart', key: `c-${c.id}`, chart: c })
  }
  return rows
}

/** A grid-view row: a level header, or up to two charts side by side. */
export type GridRow = Extract<ListRow, { kind: 'header' }> | { kind: 'pair'; key: string; charts: Chart[] }

/** List rows → grid rows: charts two per row; a pair never crosses a header. Pair key = first chart's row key. */
export function toGridRows(rows: readonly ListRow[]): GridRow[] {
  const out: GridRow[] = []
  for (const r of rows) {
    const last = out[out.length - 1]
    if (r.kind === 'header') out.push(r)
    else if (last?.kind === 'pair' && last.charts.length < 2) last.charts.push(r.chart)
    else out.push({ kind: 'pair', key: r.key, charts: [r.chart] })
  }
  return out
}

/** Index of the row (list or grid shape) holding the chart, or -1. */
export function rowIndexOf(rows: readonly (ListRow | GridRow)[], chartId: number): number {
  return rows.findIndex((r) =>
    r.kind === 'chart' ? r.chart.id === chartId : r.kind === 'pair' && r.charts.some((c) => c.id === chartId),
  )
}

/** Up to `max` skill tags for a row: selected skills first, then gimmick, then by coverage. */
export function rowSkills(chart: Chart, selected: readonly SkillId[], max = 2): SkillId[] {
  const strength = (s: SkillId) => (s === 'gimmick' ? 101 : (chart.coverage?.[s] ?? 0))
  return [...chart.skills]
    .sort((a, b) => Number(selected.includes(b)) - Number(selected.includes(a)) || strength(b) - strength(a))
    .slice(0, max)
}

/** Every chart of `chart`'s song: Singles, then Doubles, then Half-Doubles, each by level. */
export function songCharts(charts: readonly Chart[], chart: Chart, steamLink: boolean): Chart[] {
  return charts
    .filter((c) => c.song === chart.song && (steamLink || !c.steamLink))
    .sort((a, b) => MODE_ORDER[a.mode] - MODE_ORDER[b.mode] || a.level - b.level || a.id - b.id)
}
