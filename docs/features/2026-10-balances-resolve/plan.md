# Balances: Details, Resolve, Person Filter + Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make home balance rows tappable (per-Nomnom breakdown sheet), settle a pair in one confirmed action with Undo, add a person filter shared by Home and Archive, and ship three polish items (slide transitions, themed scrollbar, "Mark done").

**Architecture:** All money logic is pure functions in `src/apps/split/lib/calc.ts` (unit-tested). The store gains two actions that apply a plan computed by those functions, so the confirm modal and the real action can't disagree. A tiny non-persisted zustand store holds the chosen person. UI is React + Tailwind + the existing shadcn/Radix `Dialog` (already a bottom sheet on phones).

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind 3 + tailwindcss-animate, Radix Dialog, zustand 5, sonner, react-router-dom 6 (`HashRouter`), Vitest.

**Spec:** `docs/features/2026-10-balances-resolve/spec.md`. Read it before starting. Real screens and mockups: https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4 (sections 4, 5, 5b).

## Global Constraints

- Work on branch `feature/balances-resolve` (already exists). Never commit to or push `main`; a pre-push hook rejects it.
- One commit per task. Every commit message ends with a blank line and then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run commands from `D:\study\bill-splitter`. Tests: `npx vitest run [file]`. Types: `npx tsc --noEmit`. Baseline: 49 tests passing.
- Money is integer VND; format only with `formatMoney` from `@/apps/split/lib/format`.
- Names are matched **exactly** (case-sensitive), like the existing debt math.
- UI copy, exactly: "Showing everyone", "Tap to see one person", "Show balances for", "Everyone", "all settled", "Show all (N)", "Show less", "from N Nomnom"/"from N Nomnoms", "+N already paid", "Resolve A → B", "Mark done", "Undo".
- No schema change, no persist-version bump, no backup change.
- Don't add libraries.

## File map

| File | Responsibility |
|---|---|
| `src/apps/split/lib/calc.ts` (modify) | + `computePairBreakdown`, `planPairResolve`, `applyPairChanges`, `summarizePeople` and their types |
| `src/apps/split/lib/calc.test.ts` (modify) | tests for the above |
| `src/apps/split/store/useSplitStore.ts` (modify) | + `resolvePair`, `restoreNightsSnapshot` |
| `src/apps/split/store/useSplitStore.test.ts` (modify) | tests for the above |
| `src/apps/split/store/usePersonFilter.ts` (create) | in-memory chosen person |
| `src/shared/components/ConfirmDialog.tsx` (modify) | `description: ReactNode` |
| `src/apps/split/components/BalanceList.tsx` (modify) | tappable rows with a subtitle |
| `src/apps/split/components/PairSheet.tsx` (create) | breakdown bottom sheet |
| `src/apps/split/components/ResolvePlanSummary.tsx` (create) | change list shown in the confirm modal |
| `src/apps/split/components/PersonFilter.tsx` (create) | picker button + sheet |
| `src/apps/split/pages/SplitHome.tsx` (modify) | wiring: sheet, resolve, Undo, filter, top 5 |
| `src/apps/split/pages/Archive.tsx` (modify) | filter |
| `src/shared/components/BottomBar.tsx` (create) | fixed bottom bar via portal |
| `src/apps/split/pages/NewNomnom.tsx` (modify) | use `BottomBar` |
| `src/App.tsx` (modify) | `AnimatedRoutes` slide wrapper |
| `src/index.css` (modify) | route keyframes, scrollbar |
| `src/apps/split/pages/NightDetail.tsx` (modify) | "Mark done" |

---

### Task 1: `computePairBreakdown`

**Files:**
- Modify: `src/apps/split/lib/calc.ts` (append after `computeNightLines`, add an import at the top)
- Test: `src/apps/split/lib/calc.test.ts`

**Interfaces:**
- Consumes: existing `computeNightLines(night): DebtLine[]`, `computeBalances(nights): Debt[]`, `formatDate(iso)`.
- Produces: `PairEntry`, `PairBreakdown`, `computePairBreakdown(nights, from, to): PairBreakdown`, and the internal helper `pairEntriesFor(night, from, to): PairEntry[]`, which Task 2 reuses.

- [ ] **Step 1: Write the failing tests.** Add `computePairBreakdown` to the import list from `'./calc'` in `calc.test.ts`, then append:

```ts
// ---- pair fixtures (the explainer's example) ------------------------------
const pizzaItem = item({
  id: 'p', label: 'Pizza', payer: 'Lan', amount: 300000,
  shares: [{ name: 'Minh', amount: 100000 }, { name: 'Lan', amount: 100000 }, { name: 'Huy', amount: 100000 }],
})
const bbqItem = item({
  id: 'b', label: 'Drinks', payer: 'Minh', amount: 60000,
  shares: [{ name: 'Minh', amount: 30000 }, { name: 'Lan', amount: 30000 }],
})
function pizza(payments?: Payment[]): Night {
  return { ...night('pizza', [pizzaItem], payments), title: 'Pizza Fri', date: '2026-10-02', participants: ['Minh', 'Lan', 'Huy'] }
}
function bbq(payments?: Payment[]): Night {
  return { ...night('bbq', [bbqItem], payments), title: 'BBQ Sun', date: '2026-10-04', participants: ['Minh', 'Lan'] }
}
/** Signed home balance for from → to (negative = the other way). */
function netFor(nights: Night[], from: string, to: string): number {
  const d = computeBalances(nights).find(
    (x) => (x.from === from && x.to === to) || (x.from === to && x.to === from),
  )
  if (!d) return 0
  return d.from === from ? d.amount : -d.amount
}

describe('computePairBreakdown', () => {
  it('lists both directions, newest first, and sums to the home row', () => {
    const nights = [pizza(), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.map((e) => [e.nightId, e.lineFrom, e.lineTo, e.contribution])).toEqual([
      ['bbq', 'Lan', 'Minh', -30000],
      ['pizza', 'Minh', 'Lan', 100000],
    ])
    expect(b.entries[0].title).toBe('BBQ Sun')
    expect(b.settledCount).toBe(0)
    expect(b.net).toBe(70000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('counts a partial payment as owed minus paid', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 40000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.find((e) => e.nightId === 'pizza')!.contribution).toBe(60000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('leaves out fully paid Nomnoms and counts them in settledCount', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 100000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.map((e) => e.nightId)).toEqual(['bbq'])
    expect(b.settledCount).toBe(1)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('shows an over-payment as a negative contribution', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 120000 }]), bbq()]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    expect(b.entries.find((e) => e.nightId === 'pizza')!.contribution).toBe(-20000)
    expect(b.net).toBe(-50000)
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('includes an orphan payment (its line no longer exists)', () => {
    const old: Night = { ...night('old', [], [{ from: 'Lan', to: 'Minh', amount: 50000 }]), date: '2026-09-01' }
    const nights = [pizza(), old]
    const b = computePairBreakdown(nights, 'Minh', 'Lan')
    const e = b.entries.find((x) => x.nightId === 'old')!
    expect([e.owed, e.paid, e.contribution]).toEqual([0, 50000, 50000])
    expect(b.net).toBe(netFor(nights, 'Minh', 'Lan'))
  })

  it('ignores Nomnoms where the pair has nothing', () => {
    const b = computePairBreakdown([pizza(), bbq()], 'Huy', 'Lan')
    expect(b.entries.map((e) => e.nightId)).toEqual(['pizza'])
    expect(b.net).toBe(100000)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: FAIL; `computePairBreakdown` is not exported.

- [ ] **Step 3: Implement.** At the top of `calc.ts`, add:

```ts
import { formatDate } from '@/apps/split/lib/format'
```

Append after `computeNightLines`:

```ts
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
```

- [ ] **Step 4: Run the tests and confirm they pass.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: PASS (all old and new tests).

- [ ] **Step 5: Commit.**

```bash
git add src/apps/split/lib/calc.ts src/apps/split/lib/calc.test.ts
git commit -m "feat(split): computePairBreakdown for a home balance row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `planPairResolve` + `applyPairChanges`

**Files:**
- Modify: `src/apps/split/lib/calc.ts` (append after `computePairBreakdown`)
- Test: `src/apps/split/lib/calc.test.ts`

**Interfaces:**
- Consumes: `pairEntriesFor` (Task 1), `computeNightLines`.
- Produces: `PairChangeKind`, `PairChange`, `PairResolvePlan`, `planPairResolve(nights, a, b): PairResolvePlan`, `applyPairChanges(night, changes): Night`. Tasks 4 and 7 use these.

- [ ] **Step 1: Write the failing tests.** Add `planPairResolve, applyPairChanges` to the import from `'./calc'`, then append:

```ts
describe('planPairResolve + applyPairChanges', () => {
  function applyAll(nights: Night[], plan: ReturnType<typeof planPairResolve>): Night[] {
    return nights.map((n) => applyPairChanges(n, plan.changes))
  }

  it('ticks both directions and archives only Nomnoms that end fully paid', () => {
    const nights = [pizza(), bbq()]
    const plan = planPairResolve(nights, 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'pizza', title: 'Pizza Fri', from: 'Minh', to: 'Lan', kind: 'tick', before: 0, after: 100000 },
      { nightId: 'bbq', title: 'BBQ Sun', from: 'Lan', to: 'Minh', kind: 'tick', before: 0, after: 30000 },
    ])
    expect(plan.toArchive).toEqual([{ nightId: 'bbq', title: 'BBQ Sun' }]) // pizza still has Huy -> Lan
    const after = applyAll(nights, plan)
    expect(netFor(after, 'Minh', 'Lan')).toBe(0)
    expect(computeBalances(after)).toEqual([{ from: 'Huy', to: 'Lan', amount: 100000 }])
  })

  it('tops up a partial payment', () => {
    const plan = planPairResolve([pizza([{ from: 'Minh', to: 'Lan', amount: 40000 }])], 'Minh', 'Lan')
    expect(plan.changes[0]).toMatchObject({ kind: 'tick', before: 40000, after: 100000 })
  })

  it('trims an over-payment', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 120000 }])]
    const plan = planPairResolve(nights, 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'pizza', title: 'Pizza Fri', from: 'Minh', to: 'Lan', kind: 'adjust', before: 120000, after: 100000 },
    ])
    expect(netFor(applyAll(nights, plan), 'Minh', 'Lan')).toBe(0)
  })

  it('removes an orphan payment', () => {
    const old: Night = { ...night('old', [], [{ from: 'Lan', to: 'Minh', amount: 50000 }]), title: 'Old' }
    const plan = planPairResolve([old], 'Minh', 'Lan')
    expect(plan.changes).toEqual([
      { nightId: 'old', title: 'Old', from: 'Lan', to: 'Minh', kind: 'remove', before: 50000, after: 0 },
    ])
    expect(plan.toArchive).toEqual([]) // no lines, nothing to archive
    expect(applyPairChanges(old, plan.changes).payments).toEqual([])
  })

  it('changes nothing when payments already match', () => {
    const nights = [pizza([{ from: 'Minh', to: 'Lan', amount: 100000 }])]
    expect(planPairResolve(nights, 'Minh', 'Lan')).toEqual({ changes: [], toArchive: [] })
  })

  it('never archives a Nomnom it did not touch', () => {
    const doneHuy = {
      ...pizza([
        { from: 'Minh', to: 'Lan', amount: 100000 },
        { from: 'Huy', to: 'Lan', amount: 100000 },
      ]),
      id: 'done',
    }
    const plan = planPairResolve([doneHuy, bbq()], 'Minh', 'Lan')
    expect(plan.toArchive.map((t) => t.nightId)).toEqual(['bbq'])
  })

  it('applyPairChanges ignores changes for other nights', () => {
    const p = pizza()
    expect(applyPairChanges(p, [{ nightId: 'bbq', title: 'BBQ Sun', from: 'Lan', to: 'Minh', kind: 'tick', before: 0, after: 1 }])).toBe(p)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: FAIL; `planPairResolve` is not exported.

- [ ] **Step 3: Implement.** Append to `calc.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests and confirm they pass.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/apps/split/lib/calc.ts src/apps/split/lib/calc.test.ts
git commit -m "feat(split): planPairResolve and applyPairChanges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `summarizePeople`

**Files:**
- Modify: `src/apps/split/lib/calc.ts` (append)
- Test: `src/apps/split/lib/calc.test.ts`

**Interfaces:**
- Consumes: `Debt` from `types.ts`.
- Produces: `PersonSummary { name: string; owes: number; owed: number }`, `summarizePeople(allNights: Night[], debts: Debt[]): PersonSummary[]`. Tasks 8 and 9 use these.

- [ ] **Step 1: Write the failing test.** Add `summarizePeople` to the import, then append:

```ts
describe('summarizePeople', () => {
  it('lists everyone from any Nomnom alphabetically with their totals', () => {
    const archived: Night = { ...night('arch', []), status: 'settled', participants: ['An', 'Minh'] }
    const debts = computeBalances([pizza(), bbq()])
    expect(summarizePeople([pizza(), bbq(), archived], debts)).toEqual([
      { name: 'An', owes: 0, owed: 0 },
      { name: 'Huy', owes: 100000, owed: 0 },
      { name: 'Lan', owes: 0, owed: 170000 },
      { name: 'Minh', owes: 70000, owed: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: FAIL; `summarizePeople` is not exported.

- [ ] **Step 3: Implement.** Append to `calc.ts`:

```ts
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
```

- [ ] **Step 4: Run it and confirm it passes.**
Run: `npx vitest run src/apps/split/lib/calc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/apps/split/lib/calc.ts src/apps/split/lib/calc.test.ts
git commit -m "feat(split): summarizePeople for the person picker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Store actions + person filter store

**Files:**
- Modify: `src/apps/split/store/useSplitStore.ts`
- Create: `src/apps/split/store/usePersonFilter.ts`
- Test: `src/apps/split/store/useSplitStore.test.ts`

**Interfaces:**
- Consumes: `planPairResolve`, `applyPairChanges` (Task 2).
- Produces: `useSplitStore` actions `resolvePair(a: string, b: string): Night[]` (returns the touched nights *before* the change) and `restoreNightsSnapshot(snapshot: Night[]): void`. Also `usePersonFilter` with `{ person: string | null; setPerson(name: string | null): void }`.

- [ ] **Step 1: Write the failing tests.** In `useSplitStore.test.ts`, add these imports:

```ts
import { computeBalances } from '@/apps/split/lib/calc'
import type { Night } from '@/apps/split/types'
```

and append:

```ts
function fixtureNights(): Night[] {
  return [
    {
      id: 'pizza', title: 'Pizza Fri', date: '2026-10-02', status: 'active',
      participants: ['Minh', 'Lan', 'Huy'], payments: [],
      items: [{ id: 'p', label: 'Pizza', payer: 'Lan', amount: 300000,
        shares: [{ name: 'Minh', amount: 100000 }, { name: 'Lan', amount: 100000 }, { name: 'Huy', amount: 100000 }] }],
    },
    {
      id: 'bbq', title: 'BBQ Sun', date: '2026-10-04', status: 'active',
      participants: ['Minh', 'Lan'], payments: [],
      items: [{ id: 'b', label: 'Drinks', payer: 'Minh', amount: 60000,
        shares: [{ name: 'Minh', amount: 30000 }, { name: 'Lan', amount: 30000 }] }],
    },
  ]
}

describe('resolvePair', () => {
  it('pays both directions, archives fully paid Nomnoms and returns the before-snapshot', () => {
    const original = fixtureNights()
    useSplitStore.setState({ nights: original })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    expect(snapshot).toEqual(original)

    const nights = useSplitStore.getState().nights
    const pizza = nights.find((n) => n.id === 'pizza')!
    const bbq = nights.find((n) => n.id === 'bbq')!
    expect(pizza.status).toBe('active')
    expect(pizza.payments).toEqual([{ from: 'Minh', to: 'Lan', amount: 100000 }])
    expect(bbq.status).toBe('settled')
    expect(bbq.settledAt).toBeTruthy()
    expect(computeBalances(nights.filter((n) => n.status === 'active'))).toEqual([
      { from: 'Huy', to: 'Lan', amount: 100000 },
    ])
  })

  it('restoreNightsSnapshot puts the nights back exactly', () => {
    const original = fixtureNights()
    useSplitStore.setState({ nights: original })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    useSplitStore.getState().restoreNightsSnapshot(snapshot)
    expect(useSplitStore.getState().nights).toEqual(original)
  })

  it('restoreNightsSnapshot ignores Nomnoms that were deleted meanwhile', () => {
    useSplitStore.setState({ nights: fixtureNights() })
    const snapshot = useSplitStore.getState().resolvePair('Minh', 'Lan')
    useSplitStore.getState().deleteNight('bbq')
    useSplitStore.getState().restoreNightsSnapshot(snapshot)
    expect(useSplitStore.getState().nights.map((n) => n.id)).toEqual(['pizza'])
  })

  it('returns an empty snapshot and changes nothing when there is nothing to resolve', () => {
    useSplitStore.setState({ nights: fixtureNights() })
    const before = useSplitStore.getState().nights
    expect(useSplitStore.getState().resolvePair('An', 'Lan')).toEqual([])
    expect(useSplitStore.getState().nights).toBe(before)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail.**
Run: `npx vitest run src/apps/split/store/useSplitStore.test.ts`
Expected: FAIL; `resolvePair is not a function`.

- [ ] **Step 3: Implement the store actions.** In `useSplitStore.ts`:

Add an import:
```ts
import { applyPairChanges, planPairResolve } from '@/apps/split/lib/calc'
```

In `interface AppState`, after `unmarkLinePaid`:
```ts
  /** Settle every line between a and b in active Nomnoms; returns the touched nights as they were. */
  resolvePair(a: string, b: string): Night[]
  /** Put nights back from a resolvePair snapshot (Undo). */
  restoreNightsSnapshot(snapshot: Night[]): void
```

In the store body, after `unmarkLinePaid(...) {...},`:
```ts
      resolvePair(a, b) {
        const active = get().nights.filter((n) => n.status === 'active')
        const plan = planPairResolve(active, a, b)
        const touched = new Set(plan.changes.map((c) => c.nightId))
        if (touched.size === 0) return []
        const archive = new Set(plan.toArchive.map((t) => t.nightId))
        const snapshot = get().nights.filter((n) => touched.has(n.id))
        const settledAt = new Date().toISOString()
        set((s) => ({
          nights: s.nights.map((n) => {
            if (!touched.has(n.id)) return n
            const next = applyPairChanges(n, plan.changes)
            return archive.has(n.id) ? { ...next, status: 'settled' as const, settledAt } : next
          }),
        }))
        return snapshot
      },

      restoreNightsSnapshot(snapshot) {
        const byId = new Map(snapshot.map((n) => [n.id, n]))
        set((s) => ({ nights: s.nights.map((n) => byId.get(n.id) ?? n) }))
      },
```

- [ ] **Step 4: Create `src/apps/split/store/usePersonFilter.ts`.**

```ts
import { create } from 'zustand'

/**
 * The person chosen in the Home/Archive person picker. Deliberately NOT
 * persisted: it survives navigation within the app and resets on restart.
 */
interface PersonFilterState {
  person: string | null
  setPerson(name: string | null): void
}

export const usePersonFilter = create<PersonFilterState>()((set) => ({
  person: null,
  setPerson: (person) => set({ person }),
}))
```

- [ ] **Step 5: Run all tests and the type check.**
Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS; tsc prints nothing.

- [ ] **Step 6: Commit.**

```bash
git add src/apps/split/store/
git commit -m "feat(split): resolvePair with snapshot Undo, in-memory person filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tappable rows + `PairSheet`

**Files:**
- Modify: `src/shared/components/ConfirmDialog.tsx`, `src/apps/split/components/BalanceList.tsx`, `src/apps/split/pages/SplitHome.tsx`
- Create: `src/apps/split/components/PairSheet.tsx`

**Interfaces:**
- Consumes: `computePairBreakdown` (Task 1).
- Produces:
  - `BalanceList` props `{ debts: Debt[]; className?: string; onSelect?: (d: Debt) => void; subtitle?: (d: Debt) => string }`
  - `PairSheet` props `{ debt: Debt | null; nights: Night[]; onOpenChange(open: boolean): void; onResolve(d: Debt): void }`
  - `ConfirmDialog.description?: React.ReactNode`

No unit tests: these are presentational. Verify with tsc and the running app.

- [ ] **Step 1: Widen `ConfirmDialog.description`.** In `ConfirmDialog.tsx`, change the prop type to `description?: React.ReactNode` and replace the description line with:

```tsx
          {description != null &&
            (typeof description === 'string' ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              // Rich content can't sit inside the default <p>.
              <DialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">{description}</div>
              </DialogDescription>
            ))}
```

- [ ] **Step 2: Make `BalanceList` rows tappable.** Replace `BalanceList.tsx` with:

```tsx
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { Debt } from '@/apps/split/types'
import { formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'

interface BalanceListProps {
  debts: Debt[]
  className?: string
  /** When set, rows become buttons that open the pair's details. */
  onSelect?: (debt: Debt) => void
  subtitle?: (debt: Debt) => string
}

/** Renders netted "X owes Y amount" rows. */
export function BalanceList({ debts, className, onSelect, subtitle }: BalanceListProps) {
  if (debts.length === 0) {
    return <p className="text-sm text-muted-foreground">All settled — nobody owes anything.</p>
  }
  return (
    <ul className={cn('space-y-2', className)}>
      {debts.map((d) => {
        const body = (
          <>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span className="truncate">{d.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.to}</span>
              </div>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle(d)}</p>}
            </div>
            <span className="flex shrink-0 items-center gap-1">
              <span className="font-semibold tabular-nums text-destructive">{formatMoney(d.amount)}</span>
              {onSelect && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          </>
        )
        const rowClass = 'flex w-full items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2.5 text-left'
        return (
          <li key={`${d.from}->${d.to}`}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(d)} className={cn(rowClass, 'min-h-11 transition-colors hover:bg-secondary active:scale-[0.99]')}>
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 3: Create `PairSheet.tsx`.**

```tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { computePairBreakdown } from '@/apps/split/lib/calc'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'
import type { Debt, Night } from '@/apps/split/types'

interface PairSheetProps {
  debt: Debt | null // null = closed
  nights: Night[] // active Nomnoms
  onOpenChange: (open: boolean) => void
  onResolve: (debt: Debt) => void
}

/** Bottom sheet: which Nomnoms make up one home balance row. */
export function PairSheet({ debt, nights, onOpenChange, onResolve }: PairSheetProps) {
  const navigate = useNavigate()
  const breakdown = useMemo(
    () => (debt ? computePairBreakdown(nights, debt.from, debt.to) : null),
    [debt, nights],
  )
  const count = breakdown ? new Set(breakdown.entries.map((e) => e.nightId)).size : 0

  return (
    <Dialog open={debt != null} onOpenChange={onOpenChange}>
      <DialogContent>
        {debt && breakdown && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {debt.from} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {debt.to}
              </DialogTitle>
              <DialogDescription>
                {debt.from} owes {debt.to}{' '}
                <span className="font-semibold text-destructive">{formatMoney(debt.amount)}</span> across{' '}
                {count} {count === 1 ? 'Nomnom' : 'Nomnoms'}
              </DialogDescription>
            </DialogHeader>

            <ul className="space-y-2">
              {breakdown.entries.map((e) => (
                <li key={`${e.nightId}:${e.lineFrom}>${e.lineTo}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      navigate(`/split/night/${e.nightId}`)
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md bg-secondary/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {e.title} <span className="text-xs font-normal text-muted-foreground">· {formatDate(e.date)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {e.lineFrom} <ArrowRight className="h-3 w-3" /> {e.lineTo}
                        {e.lineFrom !== debt.from && ' · other way'}
                      </span>
                    </span>
                    <span className={cn('shrink-0 font-semibold tabular-nums', e.contribution > 0 ? 'text-destructive' : 'text-success')}>
                      {e.contribution > 0 ? '+' : '−'}
                      {formatMoney(Math.abs(e.contribution))}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>

            {breakdown.settledCount > 0 && (
              <p className="text-xs text-muted-foreground">+{breakdown.settledCount} already paid</p>
            )}

            <div className="flex justify-between border-t border-dashed border-border pt-3 font-semibold">
              <span>Net</span>
              <span className="tabular-nums text-destructive">{formatMoney(debt.amount)}</span>
            </div>

            <Button variant="success" size="lg" className="w-full" onClick={() => onResolve(debt)}>
              <CheckCircle2 className="h-5 w-5" />
              Resolve {debt.from} → {debt.to}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Wire it into `SplitHome`.** In `SplitHome.tsx`:

Change the React import to `import { useMemo, useState } from 'react'`. Add:
```tsx
import { PairSheet } from '@/apps/split/components/PairSheet'
import { computeBalances, computePairBreakdown } from '@/apps/split/lib/calc'
import type { Debt } from '@/apps/split/types'
```
(Replace the existing `computeBalances` import line.)

Inside the component, after `balances`:
```tsx
  const [selected, setSelected] = useState<Debt | null>(null)
  const sourceCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of balances) {
      const ids = new Set(computePairBreakdown(activeNights, d.from, d.to).entries.map((e) => e.nightId))
      m.set(`${d.from}->${d.to}`, ids.size)
    }
    return m
  }, [balances, activeNights])
  const subtitle = (d: Debt) => {
    const n = sourceCount.get(`${d.from}->${d.to}`) ?? 0
    return `from ${n} ${n === 1 ? 'Nomnom' : 'Nomnoms'}`
  }
```

Replace `<BalanceList debts={balances} />` with:
```tsx
            <BalanceList debts={balances} onSelect={setSelected} subtitle={subtitle} />
```

Before the fixed bottom bar `<div className="fixed ...">`, add:
```tsx
      <PairSheet
        debt={selected}
        nights={activeNights}
        onOpenChange={(open) => !open && setSelected(null)}
        onResolve={() => {}}
      />
```
(`onResolve` gets wired in Task 6.)

- [ ] **Step 5: Type-check and run the tests.**
Run: `npx tsc --noEmit && npx vitest run`
Expected: no tsc output; all tests PASS.

- [ ] **Step 6: Check it in the app.** Start the `dev` preview (port 5173). Load the example data from Appendix A. On `#/split`:
  - The rows read "Huy → Lan · from 1 Nomnom" and "Minh → Lan · from 2 Nomnoms", each with a ›.
  - Tapping Minh → Lan opens the sheet: BBQ Sun "Lan → Minh · other way" −30.000 ₫, Pizza Fri +100.000 ₫, Net 70.000 ₫.
  - Tapping Pizza Fri closes the sheet and opens `#/split/night/pizza`.

- [ ] **Step 7: Commit.**

```bash
git add src/shared/components/ConfirmDialog.tsx src/apps/split/components/BalanceList.tsx src/apps/split/components/PairSheet.tsx src/apps/split/pages/SplitHome.tsx
git commit -m "feat(split): tap a balance row to see its per-Nomnom breakdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Resolve confirm + Undo toast

**Files:**
- Create: `src/apps/split/components/ResolvePlanSummary.tsx`
- Modify: `src/apps/split/pages/SplitHome.tsx`

**Interfaces:**
- Consumes: `planPairResolve`, `PairResolvePlan`, `PairChange` (Task 2); `resolvePair`, `restoreNightsSnapshot` (Task 4); `ConfirmDialog` with a ReactNode description (Task 5).
- Produces: `ResolvePlanSummary({ plan }: { plan: PairResolvePlan })`.

- [ ] **Step 1: Create `ResolvePlanSummary.tsx`.**

```tsx
import { Archive, Check } from 'lucide-react'
import type { PairChange, PairResolvePlan } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'

function describe(c: PairChange): string {
  switch (c.kind) {
    case 'tick':
      return `${c.title}: ${c.from} → ${c.to} ${formatMoney(c.after)} paid`
    case 'adjust':
      return `${c.title}: ${c.from}'s ${formatMoney(c.before)} payment adjusted to ${formatMoney(c.after)}`
    case 'remove':
      return `${c.title}: old ${formatMoney(c.before)} payment ${c.from} → ${c.to} removed`
  }
}

/** Everything a resolve will change, shown before the user confirms. */
export function ResolvePlanSummary({ plan }: { plan: PairResolvePlan }) {
  return (
    <>
      <p>This marks every line between them as paid.</p>
      <ul className="space-y-2 rounded-md bg-secondary/60 p-3 text-foreground">
        {plan.changes.map((c) => (
          <li key={`${c.nightId}:${c.from}>${c.to}`} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{describe(c)}</span>
          </li>
        ))}
      </ul>
      {plan.toArchive.length > 0 && (
        <p className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-foreground">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>
            <b>{plan.toArchive.map((t) => t.title).join(', ')}</b> will be fully paid and{' '}
            {plan.toArchive.length === 1 ? 'moves' : 'move'} to the archive.
          </span>
        </p>
      )}
    </>
  )
}
```

- [ ] **Step 2: Wire the confirm and the toast in `SplitHome.tsx`.** Change the React import to `import { useEffect, useMemo, useRef, useState } from 'react'`. Add:

```tsx
import { toast } from 'sonner'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ResolvePlanSummary } from '@/apps/split/components/ResolvePlanSummary'
```
and add `planPairResolve` to the calc import.

Inside the component, after `selected`:
```tsx
  const resolvePair = useSplitStore((s) => s.resolvePair)
  const restoreNightsSnapshot = useSplitStore((s) => s.restoreNightsSnapshot)
  const [confirming, setConfirming] = useState<Debt | null>(null)
  const plan = useMemo(
    () => (confirming ? planPairResolve(activeNights, confirming.from, confirming.to) : null),
    [confirming, activeNights],
  )

  // Undo lives only while you stay on Home: leaving could let you edit a touched
  // Nomnom, and restoring the snapshot would then wipe that edit.
  const undoToast = useRef<string | number | null>(null)
  useEffect(() => () => {
    if (undoToast.current != null) toast.dismiss(undoToast.current)
  }, [])

  function confirmResolve() {
    if (!confirming || !plan) return
    const { from, to } = confirming
    const snapshot = resolvePair(from, to)
    setSelected(null)
    const n = plan.toArchive.length
    const msg = `${from} → ${to} resolved${n ? ` · ${n} Nomnom${n === 1 ? '' : 's'} archived` : ''}`
    undoToast.current = toast.success(msg, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          restoreNightsSnapshot(snapshot)
          toast.success('Resolve undone')
        },
      },
    })
  }
```

Change the `PairSheet` `onResolve` prop to `onResolve={setConfirming}` and add, next to it:
```tsx
      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `Resolve ${confirming.from} → ${confirming.to}?` : ''}
        description={plan ? <ResolvePlanSummary plan={plan} /> : undefined}
        confirmLabel="Resolve"
        variant="success"
        onConfirm={confirmResolve}
      />
```

- [ ] **Step 3: Type-check and run the tests.**
Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all PASS.

- [ ] **Step 4: Check it in the app** (same example data as Task 5):
  - Minh → Lan → Resolve: the modal lists "Pizza Fri: Minh → Lan 100.000 ₫ paid" and "BBQ Sun: Lan → Minh 30.000 ₫ paid", plus "**BBQ Sun** will be fully paid and moves to the archive."
  - Confirm: the toast reads "Minh → Lan resolved · 1 Nomnom archived [Undo]"; home shows only Huy → Lan; the header says "2 archived".
  - Undo: both rows and BBQ Sun come back.
  - Resolve again, then immediately open Archive: the toast disappears and Undo is gone.

- [ ] **Step 5: Commit.**

```bash
git add src/apps/split/components/ResolvePlanSummary.tsx src/apps/split/pages/SplitHome.tsx
git commit -m "feat(split): resolve a pair from Home with a change list and Undo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `PersonFilter` + Home filtering + top 5

**Files:**
- Create: `src/apps/split/components/PersonFilter.tsx`
- Modify: `src/apps/split/pages/SplitHome.tsx`

**Interfaces:**
- Consumes: `summarizePeople`, `PersonSummary` (Task 3); `usePersonFilter` (Task 4).
- Produces: `PersonFilter({ people: PersonSummary[]; summary: (person: string) => React.ReactNode })` and the exported helper `useActivePerson(people: PersonSummary[]): string | null`. Task 8 reuses both.

- [ ] **Step 1: Create `PersonFilter.tsx`.**

```tsx
import { useEffect, useState } from 'react'
import { ChevronDown, Users, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { PersonSummary } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'
import { usePersonFilter } from '@/apps/split/store/usePersonFilter'
import { cn } from '@/shared/lib/utils'

const MIN_PEOPLE = 3

/**
 * The chosen person, or null when filtering doesn't apply (fewer than 3
 * people, or the chosen name no longer appears). Clears a stale choice.
 */
export function useActivePerson(people: PersonSummary[]): string | null {
  const person = usePersonFilter((s) => s.person)
  const setPerson = usePersonFilter((s) => s.setPerson)
  const valid = person != null && people.length >= MIN_PEOPLE && people.some((p) => p.name === person)
  useEffect(() => {
    if (person != null && !valid) setPerson(null)
  }, [person, valid, setPerson])
  return valid ? person : null
}

function Initial({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={cn(
        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function totals(p: PersonSummary): string {
  if (p.owes === 0 && p.owed === 0) return 'all settled'
  return `owes ${formatMoney(p.owes)} · owed ${formatMoney(p.owed)}`
}

interface PersonFilterProps {
  people: PersonSummary[]
  /** What to say about the chosen person on this screen. */
  summary: (person: string) => React.ReactNode
}

/** "Showing everyone ▾" button + picker sheet. Shared by Home and Archive. */
export function PersonFilter({ people, summary }: PersonFilterProps) {
  const setPerson = usePersonFilter((s) => s.setPerson)
  const person = useActivePerson(people)
  const [open, setOpen] = useState(false)
  if (people.length < MIN_PEOPLE) return null

  function pick(name: string | null) {
    setPerson(name)
    setOpen(false)
  }

  return (
    <div className="mb-4">
      {person ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/50 bg-accent/50 px-3 py-2.5">
          <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Initial name={person} active />
            <span className="min-w-0 text-sm leading-snug">
              <b className="block">{person}</b>
              <span className="text-muted-foreground">{summary(person)}</span>
            </span>
          </button>
          <button type="button" onClick={() => pick(null)} aria-label="Show everyone" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left"
        >
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm leading-snug">
            Showing <b>everyone</b>
            <span className="block text-xs text-muted-foreground">Tap to see one person</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show balances for</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1">
            <li>
              <button type="button" onClick={() => pick(null)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', !person && 'bg-accent/50')}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Users className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold">Everyone</span>
              </button>
            </li>
            {people.map((p) => (
              <li key={p.name}>
                <button type="button" onClick={() => pick(p.name)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', person === p.name && 'bg-accent/50')}>
                  <Initial name={p.name} active={person === p.name} />
                  <span className="flex-1 text-sm font-semibold">{p.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{totals(p)}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Filter Home.** In `SplitHome.tsx`, add imports:

```tsx
import { PersonFilter, useActivePerson } from '@/apps/split/components/PersonFilter'
import { formatMoney } from '@/apps/split/lib/format'
```
and add `summarizePeople` to the calc import.

After `balances`:
```tsx
  const people = useMemo(() => summarizePeople(nights, balances), [nights, balances])
  const person = useActivePerson(people)
  const [showAll, setShowAll] = useState(false)
  const rows = person ? balances.filter((d) => d.from === person || d.to === person) : balances
  const visibleRows = person || showAll ? rows : rows.slice(0, 5)
  const shownNights = person ? activeNights.filter((n) => n.participants.includes(person)) : activeNights
  const homeSummary = (name: string) => {
    const p = people.find((x) => x.name === name)!
    if (p.owes === 0 && p.owed === 0) return 'all settled'
    return (
      <>
        owes <b className="text-destructive">{formatMoney(p.owes)}</b> · is owed{' '}
        <b className="text-success">{formatMoney(p.owed)}</b>
      </>
    )
  }
```

Directly before the `<Card className="mb-5 overflow-hidden">` (Current balances), add:
```tsx
      <PersonFilter people={people} summary={homeSummary} />
```

Replace the `BalanceList` line with:
```tsx
            <>
              <BalanceList debts={visibleRows} onSelect={setSelected} subtitle={subtitle} />
              {!person && rows.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-2.5 h-10 w-full rounded-md border border-dashed border-border text-sm font-semibold"
                >
                  {showAll ? 'Show less' : `Show all (${rows.length})`}
                </button>
              )}
            </>
```

Change the "Active Nomnoms" heading text to:
```tsx
          Active Nomnoms{person ? ` · with ${person}` : ''}
```

Replace the whole Nomnom list block (`{activeNights.length === 0 ? (<EmptyState … />) : (<div className="space-y-3">…</div>)}`) with:
```tsx
      {activeNights.length === 0 ? (
        <EmptyState
          icon={Moon}
          title="No active Nomnoms"
          description="Create a Nomnom, add who came and what was paid, and balances appear here."
        />
      ) : shownNights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active Nomnoms with {person}.</p>
      ) : (
        <div className="space-y-3">
          {shownNights.map((night) => (
            <NightCard key={night.id} night={night} />
          ))}
        </div>
      )}
```

- [ ] **Step 3: Type-check and run the tests.**
Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all PASS.

- [ ] **Step 4: Check it in the app** with the long-list data from Appendix A:
  - The home screen shows "Showing everyone" and 5 rows plus "Show all (26)"; "Show all" expands to 26 rows and "Show less" collapses again.
  - The picker lists An…Trang alphabetically; Lan's line reads "owes 352.000 ₫ · owed 440.000 ₫".
  - Picking Lan shows 7 rows (no "Show all") and the header "Active Nomnoms · with Lan" with 5 cards.
  - Open Bún chả, press back: Lan is still selected.
  - × goes back to everyone.
  - With the 3-person example data, the picker still shows; with two people only, it's hidden.

- [ ] **Step 5: Commit.**

```bash
git add src/apps/split/components/PersonFilter.tsx src/apps/split/pages/SplitHome.tsx
git commit -m "feat(split): person picker filters Home balances and Nomnoms, top 5 rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Archive filter

**Files:**
- Modify: `src/apps/split/pages/Archive.tsx`

**Interfaces:**
- Consumes: `PersonFilter`, `useActivePerson` (Task 7); `summarizePeople`, `computeBalances`.

- [ ] **Step 1: Filter Archive.** Replace `Archive.tsx` with:

```tsx
import { useMemo } from 'react'
import { Archive as ArchiveIcon } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { NightCard } from '@/apps/split/components/NightCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { PersonFilter, useActivePerson } from '@/apps/split/components/PersonFilter'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { computeBalances, summarizePeople } from '@/apps/split/lib/calc'

export function Archive() {
  const nights = useSplitStore((s) => s.nights)
  const settled = useMemo(
    () =>
      nights
        .filter((n) => n.status === 'settled')
        .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? '')),
    [nights],
  )
  // Same people and totals as Home, so the picker reads identically on both screens.
  const people = useMemo(
    () => summarizePeople(nights, computeBalances(nights.filter((n) => n.status === 'active'))),
    [nights],
  )
  const person = useActivePerson(people)
  const shown = person ? settled.filter((n) => n.participants.includes(person)) : settled
  const archiveSummary = (name: string) => {
    const n = settled.filter((x) => x.participants.includes(name)).length
    return `${n} archived ${n === 1 ? 'Nomnom' : 'Nomnoms'}`
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title="Archive" subtitle="Settled Nomnoms" backTo="/split" />

      {settled.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing archived yet"
          description="Nomnoms you mark as done will appear here. You can still open them to review or restore."
        />
      ) : (
        <>
          <PersonFilter people={people} summary={archiveSummary} />
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived Nomnoms with {person}.</p>
          ) : (
            <div className="space-y-3">
              {shown.map((night) => (
                <NightCard key={night.id} night={night} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check and run the tests.**
Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all PASS.

- [ ] **Step 3: Check it in the app** with the example data after one resolve (BBQ Sun archived), plus Coffee Wed:
  - Pick Minh on Home, then open Archive: the strip reads "Minh · 2 archived Nomnoms" and lists BBQ Sun and Coffee Wed.
  - Pick Lan: "1 archived Nomnom" (BBQ Sun).
  - × clears the filter on both screens.

- [ ] **Step 4: Commit.**

```bash
git add src/apps/split/pages/Archive.tsx
git commit -m "feat(split): Archive follows the shared person filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Slide transitions (+ `BottomBar`)

**Files:**
- Create: `src/shared/components/BottomBar.tsx`
- Modify: `src/apps/split/pages/SplitHome.tsx`, `src/apps/split/pages/NewNomnom.tsx`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Produces: `BottomBar({ children }: { children: React.ReactNode })`.

- [ ] **Step 1: Create `BottomBar.tsx`.**

```tsx
import { createPortal } from 'react-dom'

/**
 * Fixed bottom action bar. Rendered into <body> so it stays put while the page
 * slides: a transformed ancestor would otherwise become its containing block.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 2: Use it.** In both `SplitHome.tsx` and `NewNomnom.tsx`, import `BottomBar` from `@/shared/components/BottomBar` and replace the
`<div className="fixed inset-x-0 bottom-0 ..."><div className="mx-auto max-w-lg"> … </div></div>` wrapper with `<BottomBar> … </BottomBar>`, keeping the inner `<Button>` unchanged.

- [ ] **Step 3: Add the animated routes to `App.tsx`.** Replace the file with:

```tsx
import { useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Launcher } from '@/launcher/Launcher'
import { Settings } from '@/settings/Settings'
import { splitRoutes } from '@/apps/split/routes'
import { Toaster } from '@/shared/ui/sonner'

type Direction = 'forward' | 'back' | null

/**
 * Slides each new screen in: deeper paths from the right, shallower from the
 * left. The direction is fixed per pathname, so re-renders don't replay it.
 */
function AnimatedRoutes() {
  const location = useLocation()
  const depth = location.pathname.split('/').filter(Boolean).length
  const nav = useRef<{ path: string; depth: number; dir: Direction }>({
    path: location.pathname,
    depth,
    dir: null,
  })
  if (nav.current.path !== location.pathname) {
    nav.current = { path: location.pathname, depth, dir: depth < nav.current.depth ? 'back' : 'forward' }
  }
  const dir = nav.current.dir

  return (
    <div key={location.pathname} className={dir ? `route route-${dir}` : 'route'}>
      <Routes location={location}>
        <Route path="/" element={<Launcher />} />
        <Route path="/settings" element={<Settings />} />
        {splitRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-full py-2">
        <AnimatedRoutes />
      </div>
      <Toaster />
    </HashRouter>
  )
}
```

- [ ] **Step 4: Add the keyframes.** Append to `src/index.css` (after the last `@layer base { … }` block):

```css
/* ---- Screen transitions (see AnimatedRoutes in App.tsx) ------------------ */
.route {
  overflow-x: clip; /* hide the off-screen half of a slide; unlike hidden, keeps sticky headers */
}
.route-forward {
  animation: route-in-right 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.route-back {
  animation: route-in-left 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes route-in-right {
  from { transform: translateX(100%); }
  to { transform: none; }
}
@keyframes route-in-left {
  from { transform: translateX(-30%); opacity: 0.6; }
  to { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .route-forward,
  .route-back {
    animation: none;
  }
}
```

- [ ] **Step 5: Type-check and run the tests.**
Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; all PASS.

- [ ] **Step 6: Check it in the app:**
  - Launcher → Split → a Nomnom slides in from the right; Back slides from the left.
  - The "New Nomnom" and "Create" bars never move during a slide.
  - The sticky page header stays sticky.
  - No horizontal scrollbar flashes.
  - Typing in a Nomnom's name field doesn't replay the animation.
  - With the emulated `prefers-reduced-motion: reduce` there's no slide.
  - Dialogs still slide up.

- [ ] **Step 7: Commit.**

```bash
git add src/shared/components/BottomBar.tsx src/apps/split/pages/SplitHome.tsx src/apps/split/pages/NewNomnom.tsx src/App.tsx src/index.css
git commit -m "feat: slide between screens, BottomBar keeps fixed bars in place

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Themed scrollbar

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the scrollbar rules.** In the second `@layer base { … }` block, replace

```css
  * {
    @apply border-border;
  }
```
with
```css
  * {
    @apply border-border;
    /* Thin scrollbar in the palette's own colors (Firefox, Chrome 121+). */
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.35) transparent;
  }
  /* Older WebKit/Blink. iOS overlay scrollbars can't be styled. */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 9999px;
    background: hsl(var(--border)) padding-box;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground));
  }
```

- [ ] **Step 2: Check it in the app.** On the long-list data, at desktop width, look at the page scrollbar in Default light, Default dark, Coffee and a Custom palette. It should be thin and match each palette, and the scrolling picker sheet should use it too.

- [ ] **Step 3: Commit.**

```bash
git add src/index.css
git commit -m "feat(theme): thin scrollbar colored from the active palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: "Mark done"

**Files:**
- Modify: `src/apps/split/pages/NightDetail.tsx`

- [ ] **Step 1:** In `NightDetail.tsx`, change the button text `Mark Nomnom as done` to `Mark done`. Leave the dialog ("Mark this Nomnom as done?") as it is.

- [ ] **Step 2:** Run: `npx tsc --noEmit && npx vitest run`. Expected: clean; all PASS.

- [ ] **Step 3: Commit.**

```bash
git add src/apps/split/pages/NightDetail.tsx
git commit -m "fix(split): shorten the done button to \"Mark done\"

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Final check, explainer refresh, PR

**Files:**
- Modify: `D:\study\now\bill-splitter.md` (personal-hub repo)
- External: explainer artifact https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4

- [ ] **Step 1: Full suite + build.**
Run: `npx vitest run && npm run build`
Expected: all tests PASS (49 + new); the build succeeds.

- [ ] **Step 2: Walk the whole story once** with the example data and the long-list data. Check every bullet from Tasks 5–10 again in one pass, and check the browser console for errors.

- [ ] **Step 3: Refresh the explainer.** Follow Appendix B:
  - Retake the screens in sections 1, 4, 5 and 5b from the real app. The MOCKUP badges become REAL.
  - Update the decision cards to "shipped on feature/balances-resolve".
  - Read the artifact first, then republish to the same URL.
  - Clean up `.playwright-mcp/`.

- [ ] **Step 4: Update the NOW note.** In `now/bill-splitter.md`, set "In flight" to the branch and the PR, and "Next action" to "review/merge the balances-resolve PR". Commit it in personal-hub.

- [ ] **Step 5: Ask the user before pushing and opening the PR.** Pushing and creating a PR are outward-facing. Once they say yes:
  - `git push -u origin feature/balances-resolve`
  - `gh pr create` with a body that summarizes the features, links the spec, plan and explainer, and ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Appendix A: Test data for manual checks

Paste one snippet into the browser console on `http://localhost:5173` (dev server: `npm run dev`, or `preview_start` "dev"). Each snippet writes the store and **reloads**. A hash change alone doesn't rehydrate the store, and the running app would overwrite the data.

**Example data:** the explainer's three friends. Pizza Fri (Lan paid 300.000 for Minh/Lan/Huy), BBQ Sun (Minh paid 60.000 for Minh/Lan), Coffee Wed (archived). Home shows Huy → Lan 100.000 and Minh → Lan 70.000.

```js
(() => {
  const d = (s) => new Date(s).toISOString()
  const nights = [
    { id: 'pizza', title: 'Pizza Fri', date: d('2026-10-02T19:00:00'), status: 'active', participants: ['Minh','Lan','Huy'],
      items: [{ id: 'i1', label: 'Pizza', payer: 'Lan', amount: 300000, shares: [{name:'Minh',amount:100000},{name:'Lan',amount:100000},{name:'Huy',amount:100000}] }], payments: [] },
    { id: 'bbq', title: 'BBQ Sun', date: d('2026-10-04T12:00:00'), status: 'active', participants: ['Minh','Lan'],
      items: [{ id: 'i2', label: 'Drinks', payer: 'Minh', amount: 60000, shares: [{name:'Minh',amount:30000},{name:'Lan',amount:30000}] }], payments: [] },
    { id: 'coffee', title: 'Coffee Wed', date: d('2026-09-24T09:00:00'), status: 'settled', settledAt: d('2026-09-26T09:00:00'), participants: ['Minh','Huy'],
      items: [{ id: 'i3', label: 'Cà phê', payer: 'Huy', amount: 80000, shares: [{name:'Minh',amount:40000},{name:'Huy',amount:40000}] }], payments: [] },
  ]
  localStorage.setItem('bill-splitter-store', JSON.stringify({ state: { knownNames: ['Huy','Lan','Minh'], nights, promotedNames: [] }, version: 1 }))
  location.hash = '#/split'; location.reload()
})()
```

**Long-list data:** 8 friends × 8 Nomnoms, giving 26 home rows. Lan: 7 rows, owes 352.000 ₫, is owed 440.000 ₫, took part in Lẩu Thứ 6, Bún chả, Đà Lạt trip, Hotpot and Sinh nhật Chi.

```js
(() => {
  const people = ['An','Bảo','Chi','Dũng','Huy','Lan','Minh','Trang']
  const titles = ['Lẩu Thứ 6','Karaoke','Bún chả','Đà Lạt trip','Movie night','Hotpot','Sinh nhật Chi','Cà phê sáng']
  const nights = titles.map((title, i) => {
    const ps = people.filter((_, j) => (j + i) % 3 !== 0)
    const mk = (id, label, who, amount) => {
      const each = Math.round(amount / ps.length)
      return { id, label, payer: who, amount: each * ps.length, shares: ps.map((name) => ({ name, amount: each })) }
    }
    return { id: 'n' + i, title, date: new Date(2026, 8, 3 + i * 4, 19).toISOString(), status: 'active', participants: ps,
      items: [mk('a' + i, 'Đồ ăn', ps[i % ps.length], 120000 * (i + 2)), mk('b' + i, 'Nước', ps[(i + 2) % ps.length], 40000 * (i + 1))], payments: [] }
  })
  localStorage.setItem('bill-splitter-store', JSON.stringify({ state: { knownNames: people, nights, promotedNames: [] }, version: 1 }))
  location.hash = '#/split'; location.reload()
})()
```

## Appendix B: Explainer refresh (Task 12)

The explainer is a published page: https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4.

1. Read it first with the Artifact tool (`action: "read"`). Edit the saved file the read gives back, then republish to the **same `url`**. Images that don't change can be carried over with `files: { "shots/x.png": { artifact: <url>, path: "shots/x.png" } }`.
2. Screenshots: use the Playwright MCP browser at 390×844, loaded with the Appendix A data.
   - Navigate again before each screenshot; otherwise the capture can come out blank.
   - Playwright can only save inside the project, so save to `.playwright-mcp/shots/`, move the files to the session scratchpad, then delete `.playwright-mcp/`.
3. Keep the page's style: phone-framed screenshots and diagrams, little text. REAL badges mark today's app, MOCKUP badges mark proposals. After this PR, sections 4, 5 and 5b should be REAL.
