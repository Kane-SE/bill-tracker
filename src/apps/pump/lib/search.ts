import type { Chart } from '@/apps/pump/data/types'

/** Every token (from tokens()) appears in the chart's folded title, Korean title or artist. */
export function matchesSearch(chart: Chart, toks: readonly string[]): boolean {
  return toks.every((t) => chart.song.search.includes(t))
}
