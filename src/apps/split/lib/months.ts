import type { Night } from '@/apps/split/types'

/** One calendar month of Nomnoms, for the grouped list on Split's home. */
export interface MonthGroup {
  key: string // "2026-11"; "" when the date can't be read
  label: string // "November 2026"; "No date" for key ""
  nights: Night[] // newest first
}

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

function monthKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Group Nomnoms by the month of their date, newest month first, newest Nomnom first inside. */
export function groupByMonth(nights: Night[]): MonthGroup[] {
  const groups = new Map<string, Night[]>()
  const newestFirst = [...nights].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime() || 0)
  for (const n of newestFirst) {
    const key = monthKey(n.date)
    const list = groups.get(key)
    if (list) list.push(n)
    else groups.set(key, [n])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)))
    .map(([key, list]) => ({
      key,
      label: key === '' ? 'No date' : monthFmt.format(new Date(`${key}-01T00:00:00`)),
      nights: list,
    }))
}
