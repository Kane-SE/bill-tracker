import type { Night } from '@/apps/split/types'
import { computeBalances, computePairBreakdown } from '@/apps/split/lib/calc'

/**
 * "Copy for Excel": who owes me, their totals, and the Nomnoms behind each,
 * as tab-separated text that pastes straight into a spreadsheet.
 * Numbers match Home's balances and the pair sheet (docs/features/2026-11-split-excel-copy/spec.md).
 */

export interface OwedToMeRow {
  name: string
  date: string // YYYY-MM-DD, local calendar day
  nomnom: string
  amount: number // signed: negative when I owe them on that Nomnom
}

export interface OwedToMeSheet {
  people: { name: string; total: number }[] // biggest first
  rows: OwedToMeRow[] // grouped by person in `people` order, newest Nomnom first
  total: number
  nomnomCount: number
}

function localDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function buildOwedToMe(nights: Night[], me: string): OwedToMeSheet {
  const active = nights.filter((n) => n.status === 'active')
  const debts = computeBalances(active).filter((d) => d.to === me)
  const rows: OwedToMeRow[] = []
  const nightIds = new Set<string>()

  for (const debt of debts) {
    // One row per Nomnom: a night can hold a line and an orphan payment for the same pair.
    const byNight = new Map<string, OwedToMeRow>()
    for (const e of computePairBreakdown(active, debt.from, me).entries) {
      const row = byNight.get(e.nightId)
      if (row) row.amount += e.contribution
      else byNight.set(e.nightId, { name: debt.from, date: localDay(e.date), nomnom: e.title, amount: e.contribution })
    }
    for (const [id, row] of byNight) {
      if (row.amount === 0) continue
      rows.push(row)
      nightIds.add(id)
    }
  }

  return {
    people: debts.map((d) => ({ name: d.from, total: d.amount })),
    rows,
    total: debts.reduce((sum, d) => sum + d.amount, 0),
    nomnomCount: nightIds.size,
  }
}

/** A text cell that can't split columns or rows, and that Excel won't read as a formula. */
function cell(text: string): string {
  const flat = text.replace(/[\t\r\n]+/g, ' ')
  return /^[=+\-@]/.test(flat) ? ` ${flat}` : flat
}

export function owedToMeTsv(sheet: OwedToMeSheet): string {
  const line = (...cells: (string | number)[]) =>
    cells.map((c) => (typeof c === 'number' ? String(Math.round(c)) : cell(c))).join('\t')
  return [
    line('Who owes me', 'Total'),
    ...sheet.people.map((p) => line(p.name, p.total)),
    '',
    line('Who owes me', 'Date', 'Nomnom', 'Amount'),
    ...sheet.rows.map((r) => line(r.name, r.date, r.nomnom, r.amount)),
  ].join('\n')
}
