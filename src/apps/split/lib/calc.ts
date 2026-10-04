import type { Debt, Item, Night, Payment } from '@/apps/split/types'
import { formatDate } from '@/apps/split/lib/format'

/**
 * Pure debt calculation. No React, no storage — just data in, data out, so it
 * can be unit-tested in isolation.
 */

/** Key for an unordered pair of names, plus whether we flipped the order. */
function pairKey(a: string, b: string): { key: string; flipped: boolean } {
  return a <= b ? { key: `${a} ${b}`, flipped: false } : { key: `${b} ${a}`, flipped: true }
}

/**
 * Raw (un-netted) debts for a set of items: each person in an item's `shares`
 * owes that item's payer their share (the payer owes nothing to themselves).
 */
function accumulate(items: Item[], net: Map<string, number>) {
  for (const item of items) {
    for (const share of item.shares) {
      if (!share.name || share.name === item.payer) continue
      if (!(share.amount > 0)) continue
      // Track net(a,b) as "amount a owes b" using a signed value per pair.
      const { key, flipped } = pairKey(share.name, item.payer)
      // Positive means the lexically-smaller name owes the larger one.
      const delta = flipped ? -share.amount : share.amount
      net.set(key, (net.get(key) ?? 0) + delta)
    }
  }
}

/**
 * A payment `from -> to` is money flowing against the debt, so it reduces
 * "`from` owes `to`" in the same signed pair map the items feed.
 */
function accumulatePayments(payments: Payment[], net: Map<string, number>) {
  for (const p of payments) {
    if (!(p.amount > 0) || p.from === p.to) continue
    const { key, flipped } = pairKey(p.from, p.to)
    const delta = flipped ? p.amount : -p.amount
    net.set(key, (net.get(key) ?? 0) + delta)
  }
}

/**
 * Compute netted, directional debts across the given nights, minus any
 * recorded payments. Opposite debts within a pair cancel out.
 */
export function computeBalances(nights: Night[]): Debt[] {
  const net = new Map<string, number>()
  for (const night of nights) {
    accumulate(night.items, net)
    accumulatePayments(night.payments ?? [], net)
  }
  return toDebts(net)
}

/** Turn a signed pair map into sorted, rounded, directional debts. */
function toDebts(net: Map<string, number>): Debt[] {
  const debts: Debt[] = []
  for (const [key, value] of net) {
    if (Math.round(value) === 0) continue
    const [a, b] = key.split(' ')
    // value > 0: a owes b; value < 0: b owes a
    if (value > 0) debts.push({ from: a, to: b, amount: Math.round(value) })
    else debts.push({ from: b, to: a, amount: Math.round(-value) })
  }

  // Stable, friendly ordering: biggest debts first, then by name.
  debts.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from))
  return debts
}

/** One debt line inside a Nomnom, with how much of it has been paid back. */
export interface DebtLine {
  from: string
  to: string
  owed: number // netted item debt for this pair (payments ignored)
  paid: number // payment recorded for from -> to, 0 if none
  remaining: number // max(0, owed - paid)
}

/**
 * The Nomnom's debt lines (item debts only, netted per pair) annotated with
 * the payment recorded against each. A line is paid when `remaining === 0`.
 */
export function computeNightLines(night: Night): DebtLine[] {
  const net = new Map<string, number>()
  accumulate(night.items, net)
  const payments = night.payments ?? []
  return toDebts(net).map(({ from, to, amount }) => {
    const paid = payments.find((p) => p.from === from && p.to === to)?.amount ?? 0
    return { from, to, owed: amount, paid, remaining: Math.max(0, amount - paid) }
  })
}

/** Total money fronted (sum of item amounts) across nights. */
export function totalFronted(nights: Night[]): number {
  let sum = 0
  for (const night of nights) for (const item of night.items) sum += item.amount
  return sum
}

/** One Nomnom's share of the balance between a pair, seen from `from → to`. */
export interface PairEntry {
  nightId: string
  title: string
  date: string
  lineFrom: string // direction of the debt line (or of the orphan payment)
  lineTo: string
  owed: number // the line's owed amount, 0 for an orphan payment
  paid: number // payment recorded lineFrom -> lineTo
  contribution: number // signed, in the from -> to direction: ±(owed - paid)
}

export interface PairBreakdown {
  entries: PairEntry[] // contribution !== 0, newest Nomnom first
  settledCount: number // Nomnoms with a pair line whose contribution is 0
  net: number // equals the home row amount for from -> to
}

function isPair(a: string, b: string) {
  return (x: { from: string; to: string }) =>
    (x.from === a && x.to === b) || (x.from === b && x.to === a)
}

/**
 * Every directed a<->b pair in one night that has a debt line or a payment.
 * Contributions use owed - paid (not `remaining`) so over-payments and orphan
 * payments still count, exactly as they do in computeBalances.
 */
function pairEntriesFor(night: Night, from: string, to: string): PairEntry[] {
  const byDirection = new Map<string, { lineFrom: string; lineTo: string; owed: number; paid: number }>()
  for (const line of computeNightLines(night).filter(isPair(from, to))) {
    byDirection.set(`${line.from}>${line.to}`, { lineFrom: line.from, lineTo: line.to, owed: line.owed, paid: 0 })
  }
  for (const p of (night.payments ?? []).filter(isPair(from, to))) {
    if (!(p.amount > 0)) continue
    const key = `${p.from}>${p.to}`
    const existing = byDirection.get(key)
    if (existing) existing.paid += p.amount
    else byDirection.set(key, { lineFrom: p.from, lineTo: p.to, owed: 0, paid: p.amount })
  }
  const title = night.title || formatDate(night.date)
  return [...byDirection.values()].map((d) => ({
    nightId: night.id,
    title,
    date: night.date,
    ...d,
    contribution: (d.lineFrom === from ? 1 : -1) * (d.owed - d.paid),
  }))
}

/** Which Nomnoms make up the home row `from -> to`, and by how much. */
export function computePairBreakdown(nights: Night[], from: string, to: string): PairBreakdown {
  const entries: PairEntry[] = []
  let settledCount = 0
  const newestFirst = [...nights].sort((x, y) => y.date.localeCompare(x.date))
  for (const night of newestFirst) {
    const all = pairEntriesFor(night, from, to)
    if (all.length === 0) continue
    const contributing = all.filter((e) => e.contribution !== 0)
    if (contributing.length === 0) settledCount++
    entries.push(...contributing)
  }
  const net = entries.reduce((sum, e) => sum + e.contribution, 0)
  return { entries, settledCount, net }
}

export type PairChangeKind = 'tick' | 'adjust' | 'remove'

export interface PairChange {
  nightId: string
  title: string
  from: string // payment direction
  to: string
  kind: PairChangeKind // tick: paid < owed · adjust: paid > owed · remove: no line left
  before: number
  after: number // 0 = remove the payment
}

export interface PairResolvePlan {
  changes: PairChange[]
  toArchive: { nightId: string; title: string }[]
}

/** Apply a plan's payment changes to one night (pure). One payment per directed pair. */
export function applyPairChanges(night: Night, changes: PairChange[]): Night {
  const mine = changes.filter((c) => c.nightId === night.id)
  if (mine.length === 0) return night
  let payments = night.payments ?? []
  for (const c of mine) {
    payments = payments.filter((p) => !(p.from === c.from && p.to === c.to))
    if (c.after > 0) payments = [...payments, { from: c.from, to: c.to, amount: c.after }]
  }
  return { ...night, payments }
}

/**
 * What resolving a <-> b would do across `nights` (pass active ones). Every
 * pair payment is set to its line's owed amount, so the pair nets to exactly 0.
 * Changes nothing.
 */
export function planPairResolve(nights: Night[], a: string, b: string): PairResolvePlan {
  const changes: PairChange[] = []
  const toArchive: PairResolvePlan['toArchive'] = []
  for (const night of nights) {
    const nightChanges: PairChange[] = []
    for (const e of pairEntriesFor(night, a, b)) {
      if (e.paid === e.owed) continue
      const kind: PairChangeKind = e.owed === 0 ? 'remove' : e.paid < e.owed ? 'tick' : 'adjust'
      nightChanges.push({
        nightId: night.id,
        title: e.title,
        from: e.lineFrom,
        to: e.lineTo,
        kind,
        before: e.paid,
        after: e.owed,
      })
    }
    if (nightChanges.length === 0) continue
    changes.push(...nightChanges)
    const lines = computeNightLines(applyPairChanges(night, nightChanges))
    if (lines.length > 0 && lines.every((l) => l.remaining === 0)) {
      toArchive.push({ nightId: night.id, title: nightChanges[0].title })
    }
  }
  return { changes, toArchive }
}

/**
 * Split `amount` equally across `names`, distributing the rounding remainder
 * to the first people so the shares always sum exactly to `amount`.
 */
export function equalShares(amount: number, names: string[]): number[] {
  const n = names.length
  if (n === 0) return []
  const base = Math.floor(amount / n)
  let remainder = amount - base * n
  return names.map(() => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return base + extra
  })
}

/** How far an item's shares are from its total (0 == balanced). */
export function shareRemainder(item: Pick<Item, 'amount' | 'shares'>): number {
  const sum = item.shares.reduce((acc, s) => acc + (s.amount || 0), 0)
  return item.amount - sum
}

/** One person's row while editing an item's split. */
export interface SplitRow {
  name: string
  included: boolean // is this person part of the split?
  locked: boolean // has the user hand-edited this amount?
  amount: number
}

/**
 * Recompute the split for an item: people whose amount the user hand-edited
 * (`locked`) keep their value; everyone else (`included` and not locked) evenly
 * shares whatever is left of the total. Called live on every edit, so an
 * untouched person's amount is always re-derived when anything else changes.
 *
 * Example (total 200k, split among A,B,C,D):
 *   start        -> 50/50/50/50
 *   lock B = 80  -> A,C,D share 120 -> 40 each
 *   total = 200, lock A = 60 -> C,D share 60 -> 30 each
 *   lock C = 40  -> D gets 20
 */
export function redistribute(rows: SplitRow[], total: number): SplitRow[] {
  const lockedSum = rows.reduce(
    (acc, r) => (r.included && r.locked ? acc + (r.amount || 0) : acc),
    0,
  )
  const autoNames = rows.filter((r) => r.included && !r.locked).map((r) => r.name)
  const autoValues = equalShares(Math.max(0, total - lockedSum), autoNames)

  let i = 0
  return rows.map((r) => {
    if (!r.included) return { ...r, amount: 0 }
    if (r.locked) return r
    return { ...r, amount: autoValues[i++] ?? 0 }
  })
}

/** One person's open totals, for the person picker. */
export interface PersonSummary {
  name: string
  owes: number
  owed: number
}

/**
 * Everyone who took part in any of `allNights` (active or archived), plus anyone
 * in `debts`, alphabetical, with totals from the netted `debts`.
 */
export function summarizePeople(allNights: Night[], debts: Debt[]): PersonSummary[] {
  const totals = new Map<string, PersonSummary>()
  const get = (name: string) => {
    let s = totals.get(name)
    if (!s) totals.set(name, (s = { name, owes: 0, owed: 0 }))
    return s
  }
  for (const n of allNights) for (const p of n.participants) if (p) get(p)
  for (const d of debts) {
    get(d.from).owes += d.amount
    get(d.to).owed += d.amount
  }
  return [...totals.values()].sort((x, y) => x.name.localeCompare(y.name))
}
