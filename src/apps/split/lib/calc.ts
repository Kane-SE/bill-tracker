import type { Debt, Item, Night, Payment } from '@/apps/split/types'

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
