import { equalShares } from '@/apps/split/lib/calc'
import type { Item, Share } from '@/apps/split/types'

/**
 * Draft-line rules behind the bill-photo tagging screen
 * (docs/features/2026-11-bill-photo). Pure: every function returns new
 * objects and never touches the store. Lines stay drafts until Done turns the
 * ready ones into ordinary items.
 */

export interface DraftLine {
  key: string // local id for React
  label: string
  amount: number // whole VND
  people: string[] // in bill-people order
  shares?: Share[] // set by Adjust; cleared when amount or people change
}

export type LineStatus = 'empty' | 'incomplete' | 'ready'

export type Reconcile =
  | { kind: 'none' }
  | { kind: 'left'; amount: number }
  | { kind: 'over'; amount: number }
  | { kind: 'exact' }

/** A fresh line, optionally preset (quick lines: tax / tip). */
export function newLine(key: string, preset?: { label?: string; people?: string[] }): DraftLine {
  return { key, label: preset?.label ?? '', amount: 0, people: preset?.people ? [...preset.people] : [] }
}

/** empty: nothing typed or picked. ready: amount > 0 and someone picked. Otherwise incomplete. */
export function lineStatus(line: DraftLine): LineStatus {
  if (line.label.trim() === '' && line.amount === 0 && line.people.length === 0) return 'empty'
  if (line.amount > 0 && line.people.length > 0) return 'ready'
  return 'incomplete'
}

/** The line's adjusted shares, else an equal split that always adds up to the amount. */
export function lineShares(line: DraftLine): Share[] {
  if (line.shares) return line.shares
  const amounts = equalShares(line.amount, line.people)
  return line.people.map((name, i) => ({ name, amount: amounts[i] }))
}

/** Changing the amount goes back to an equal split; re-entering the same amount keeps an adjustment. */
export function setLineAmount(line: DraftLine, amount: number): DraftLine {
  if (amount === line.amount) return line
  const { shares: _shares, ...rest } = line
  return { ...rest, amount }
}

/** Ticks or unticks one person, keeping `people` in bill order. Clears an adjusted split. */
export function toggleLinePerson(line: DraftLine, name: string, order: string[]): DraftLine {
  const picked = line.people.includes(name) ? line.people.filter((p) => p !== name) : [...line.people, name]
  const { shares: _shares, ...rest } = line
  return { ...rest, people: order.filter((p) => picked.includes(p)) }
}

/** The "Everyone" chip: everyone already picked clears the line, otherwise picks everyone in bill order. */
export function toggleEveryone(line: DraftLine, order: string[]): DraftLine {
  const all = order.length > 0 && order.every((p) => line.people.includes(p))
  const { shares: _shares, ...rest } = line
  return { ...rest, people: all ? [] : [...order] }
}

/** "+ add name": trims, reuses an existing name that matches case-insensitively, '' gives null. */
export function addBillPerson(billPeople: string[], raw: string): { people: string[]; name: string | null } {
  const name = raw.trim()
  if (!name) return { people: billPeople, name: null }
  const existing = billPeople.find((p) => p.toLowerCase() === name.toLowerCase())
  if (existing) return { people: billPeople, name: existing }
  return { people: [...billPeople, name], name }
}

/** Sum of the ready lines plus what this photo already added. Incomplete lines don't count. */
export function assignedTotal(lines: DraftLine[], alreadyAdded: number): number {
  return lines.reduce((sum, l) => (lineStatus(l) === 'ready' ? sum + l.amount : sum), alreadyAdded)
}

/** Assigned vs the optional bill total; no total (or 0) means nothing to compare. */
export function reconcile(assigned: number, total: number | undefined): Reconcile {
  if (!total) return { kind: 'none' }
  if (assigned === total) return { kind: 'exact' }
  return assigned < total ? { kind: 'left', amount: total - assigned } : { kind: 'over', amount: assigned - total }
}

/** Ready lines as ordinary items (no id), in order. A blank label becomes 'Item'. */
export function draftToItems(lines: DraftLine[], payer: string, photoId: string): Omit<Item, 'id'>[] {
  return lines
    .filter((l) => lineStatus(l) === 'ready')
    .map((l) => ({
      label: l.label.trim() || 'Item',
      payer,
      amount: l.amount,
      shares: lineShares(l),
      photoId,
    }))
}

/**
 * Who pays by default: the saved payer, else the payer of an existing line,
 * else "me" - but only a current participant. '' when none qualifies.
 */
export function initialPayer(o: {
  saved?: string
  existingPayers: string[]
  me: string | null
  participants: string[]
}): string {
  const inNomnom = (n: string | null | undefined): n is string => !!n && o.participants.includes(n)
  if (inNomnom(o.saved)) return o.saved
  const existing = o.existingPayers.find(inNomnom)
  if (existing) return existing
  if (inNomnom(o.me)) return o.me
  return ''
}
