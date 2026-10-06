# Balances: Details, Resolve, Person Filter + Polish — Design

**Date:** 2026-10-04 · **Status:** approved (brainstorm + grilling), ready for planning
**Branch:** `feature/balances-resolve` → one PR, one commit per item
**Explainer (real screens + mockups):** https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4, sections 4, 5, 5b

## Problem

The home card "Current balances" shows netted rows ("Minh → Lan 70.000 ₫") summed
across **all** active Nomnoms (`computeBalances`). Debt lines and their payments live
**per Nomnom** (`computeNightLines`). Because of that gap:

1. A home row can't be tapped. Finding where 70.000 comes from means opening every
   Nomnom and subtracting by hand.
2. Settling a pair means opening each Nomnom and ticking its line, in both directions.
3. With many unpaid debts the card grows without limit (26 rows with 8 friends × 8
   Nomnoms) and pushes the Nomnom list off screen. Archive grows without limit too.

There's also some polish: screen changes have no animation, the scrollbar is the browser
default, and "Mark Nomnom as done" is too long.

## Decisions

| # | Decision |
|---|---|
| 1 | Tapping a home row opens a **bottom sheet** with the pair's per-Nomnom breakdown. It lists only Nomnoms that **contribute** to the number, plus a "+N already paid" note. Each entry links to its Nomnom. The row subtitle "from N Nomnom(s)" counts the contributing ones. |
| 2 | **Resolve** works on **one pair**. It settles every line between the two people, in **both directions**, in every active Nomnom. |
| 3 | Resolve is confirmed in a modal that lists **every change**: lines ticked, payments **adjusted** (over-payments trimmed) or **removed** (no matching line), and Nomnoms that will be **archived automatically**. |
| 4 | After Resolve, a toast offers **Undo** for **8 s**. It's dismissed as soon as you leave the home screen. |
| 5 | Ticking the last line *inside* a Nomnom still **asks** before archiving (unchanged). Only Resolve archives automatically. |
| 6 | **Person filter** = a **picker**: a one-line "Showing everyone ▾" button opens a sheet listing **everyone who took part in any Nomnom** (active or archived), **alphabetically**, each with "owes X · is owed Y" or "all settled". |
| 7 | On **Home** the filter narrows the balance rows (all of the person's rows) **and** the Nomnom list (Nomnoms the person **took part in**). With "everyone" selected, balances show the **top 5** + "Show all (N)" / "Show less". |
| 8 | On **Archive** the same filter applies (same picker, same chosen person). Summary: "Lan · 3 archived Nomnoms". |
| 9 | The filter is **shared** between Home and Archive and **lasts while the app is open** (in memory, not persisted). It goes back to "everyone" if the chosen person no longer appears in any Nomnom. |
| 10 | The picker shows when **3 or more different people** appear across all Nomnoms. |
| 11 | Names are matched **exactly** (case-sensitive), the same way the debt math does. |
| 12 | Screen transitions: **slide**. Deeper slides in from the right, shallower from the left. CSS keyframes; none under `prefers-reduced-motion`. |
| 13 | Scrollbar: thin and rounded, colored from palette tokens. |
| 14 | "Mark Nomnom as done" becomes **"Mark done"**. |

## Math (`src/apps/split/lib/calc.ts`, pure)

### Pair breakdown

```ts
/** One Nomnom's share of the balance between a pair, seen from `from → to`. */
export interface PairEntry {
  nightId: string
  title: string            // night.title || formatDate(night.date)
  date: string
  lineFrom: string         // direction of the debt line (or of the orphan payment)
  lineTo: string
  owed: number             // the line's owed amount, 0 for an orphan payment
  paid: number             // payment recorded lineFrom → lineTo
  contribution: number     // signed, in the from → to direction: ±(owed − paid)
}

export interface PairBreakdown {
  entries: PairEntry[]     // contribution !== 0, newest Nomnom first
  settledCount: number     // Nomnoms with a pair line whose contribution is 0
  net: number              // sum of contributions, equals the home row amount
}

export function computePairBreakdown(nights: Night[], from: string, to: string): PairBreakdown
```

- For each night, consider its pair line (from `computeNightLines`, either direction)
  and every payment between the two people. One entry per directed pair present.
- `contribution = (owed − paid)` when `lineFrom === from`, else `−(owed − paid)`.
  An over-payment gives a negative contribution in its own direction; an orphan payment
  (no line) has `owed = 0`.
- **Guarantee:** `net` equals the amount `computeBalances` shows for `from → to`.
  That's why entries show owed − paid and not `remaining`, which hides over-payment.

### Resolve plan

```ts
export type PairChangeKind = 'tick' | 'adjust' | 'remove'

export interface PairChange {
  nightId: string
  title: string
  from: string; to: string // payment direction
  kind: PairChangeKind     // tick: paid < owed → owed · adjust: paid > owed → owed · remove: orphan → 0
  before: number           // payment amount before
  after: number            // payment amount after (0 = remove)
}

export interface PairResolvePlan {
  changes: PairChange[]
  toArchive: { nightId: string; title: string }[]
}

/** What resolving a ↔ b would do. Changes nothing. */
export function planPairResolve(nights: Night[], a: string, b: string): PairResolvePlan

/** Apply a plan's payment changes to one night (pure). Used by the store and by tests. */
export function applyPairChanges(night: Night, changes: PairChange[]): Night
```

- Lines where `paid === owed` produce no change.
- `toArchive` = Nomnoms with ≥ 1 change that have ≥ 1 line and all lines at
  `remaining === 0` once the changes are applied. Untouched Nomnoms are never archived.
- **Guarantee:** after applying the plan, `computeBalances` has no row for the pair.
- Money is whole VND (shares from `equalShares` and `parseMoney`), so no rounding residue.

### Person summaries (for the picker)

```ts
export interface PersonSummary { name: string; owes: number; owed: number }

/** Everyone who took part in any of `allNights`, alphabetical, with totals from `debts`. */
export function summarizePeople(allNights: Night[], debts: Debt[]): PersonSummary[]
```

`owes = 0 && owed = 0` is shown as "all settled".

## Store (`useSplitStore.ts`)

```ts
resolvePair(a: string, b: string): Night[]          // touched nights *before* the change
restoreNightsSnapshot(snapshot: Night[]): void       // put them back exactly
```

- `resolvePair` calls `planPairResolve` on the active nights. In **one** `set()` it applies
  `applyPairChanges` to each touched night and archives `toArchive` with the same
  `status: 'settled'` + `settledAt` as `markDone`. The modal preview and the action share
  one plan, so they can't disagree.
- `restoreNightsSnapshot` replaces each night by id, restoring earlier payments exactly.
  Ids that no longer exist are ignored.
- No schema, persist-version or backup change.

### Person filter state (`apps/split/store/usePersonFilter.ts`, new)

A tiny zustand store **without** `persist`: `{ person: string | null, setPerson(name | null) }`.
It's in memory, so it survives navigation and resets on app restart.

## UI

### `PersonFilter` (new, `apps/split/components/PersonFilter.tsx`)

- Props: `people: PersonSummary[]`, `summary: ReactNode` (what to show when a person is
  chosen). It reads and writes `usePersonFilter`.
- Renders nothing when `people.length < 3`. If the chosen person isn't in `people`, it
  calls `setPerson(null)`.
- Collapsed: "Showing **everyone** ▾ / Tap to see one person". Chosen: avatar initial, name,
  `summary`, and × (clears).
- Sheet (existing `Dialog`): "Show balances for", an "Everyone" row, then one row per
  person (initial, name, "owes X · owed Y" or "all settled"). Tapping a row picks it and
  closes the sheet.

### Home (`SplitHome` + `BalanceList`)

- `PersonFilter` sits above the "Current balances" card. Home summary: "owes X · is owed Y"
  from the filtered rows.
- Balance rows are `<button>`s with a "from N Nomnom(s)" subtitle and a ›.
  `BalanceList` gains `onSelect(debt)` and a `subtitle(debt)` render prop.
- Everyone: top 5 + "Show all (N)" / "Show less" (component state). With a person
  chosen, all of their rows are shown.
- The Nomnom list is filtered by `participants.includes(person)`. The header becomes
  "Active Nomnoms · with Lan".
- Fixed "New Nomnom" bar goes through `BottomBar` (see Transitions).

### `PairSheet` (new, `apps/split/components/PairSheet.tsx`)

- Header "Minh → Lan" and "Minh owes Lan 70.000 ₫ across 2 Nomnoms".
- One row per entry: title · date, `lineFrom → lineTo`, and the signed contribution
  (+ in the owe color, − in the paid color). Tapping a row closes the sheet and
  navigates to `/split/night/:id`.
- "+N already paid" note when `settledCount > 0`, then the net line, then a
  **Resolve Minh → Lan** button (success).

### Resolve confirmation

- `ConfirmDialog.description` widens from `string` to `ReactNode`. Existing callers keep
  passing strings.
- One line per change: "✓ Pizza Fri: Minh → Lan 100.000 ₫ paid" (tick), "Pizza Fri:
  Minh's 120.000 ₫ payment adjusted to 100.000 ₫" (adjust), "Pizza Fri: old 50.000 ₫
  payment Lan → Minh removed" (remove). Then, when `toArchive` isn't empty:
  "**BBQ Sun** will be fully paid and move to the archive."
- On confirm: `const snapshot = resolvePair(a, b)`, close the dialog and the sheet, then
  `toast.success('Minh → Lan resolved · 1 Nomnom archived', { duration: 8000,
  action: { label: 'Undo', onClick: () => restoreNightsSnapshot(snapshot) } })`.
  Keep the toast id. `SplitHome`'s unmount effect calls `toast.dismiss(id)`.

### Archive (`pages/Archive.tsx`)

- `PersonFilter` with the same people list (all Nomnoms) and the summary
  "N archived Nomnom(s)". The list is filtered by participant.

### Screen transitions

- `App.tsx`: the routed content is wrapped in a container keyed by `location.pathname`.
  A ref keeps the previous path depth (number of segments). Deeper or equal gives
  `route-forward`, shallower gives `route-back`. No class on the first render.
- `index.css`: keyframes `route-in-right` (`translateX(100%) → 0`) and `route-in-left`
  (`translateX(-30%)` + `opacity .6 → 1`), 240 ms `cubic-bezier(.2,.8,.2,1)`, no
  fill-mode. `overflow-x: clip` on the wrapper. `@media (prefers-reduced-motion: reduce)`
  turns the animation off.
- **Gotcha:** a transformed element becomes the containing block for its
  `position: fixed` children. The fixed bottom bars on **SplitHome** and **NewNomnom**
  move into a shared `BottomBar` (`shared/components/BottomBar.tsx`) that renders through
  a portal to `document.body`. Dialogs and toasts already render outside the routes.

### Scrollbar (`index.css`)

- `scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / .35) transparent`,
  plus `::-webkit-scrollbar` rules (8 px, rounded thumb in `--border`, hover in
  `--muted-foreground`). iOS overlay scrollbars can't be styled.

### Copy

- `NightDetail`: the button reads **"Mark done"**. The dialog stays as it is.

## Testing (Vitest)

- `calc.test.ts`
  - `computePairBreakdown`: both directions, a pair in only some Nomnoms, a partial
    payment, an over-payment, an orphan payment, `settledCount`, newest first, and
    **`net` equals the `computeBalances` row** in each case.
  - `planPairResolve` + `applyPairChanges`: tick, adjust and remove kinds, no change for
    exact payments, archives only touched Nomnoms that end fully paid, and **no
    `computeBalances` row for the pair afterwards**.
  - `summarizePeople`: alphabetical, includes people only in archived Nomnoms,
    owes/owed totals.
- `useSplitStore.test.ts`: `resolvePair` writes and archives in one update and returns the
  before-snapshot. `restoreNightsSnapshot` gives a deep-equal of the original nights.
- Manual run with the explainer's example data: tap row → sheet → resolve → Undo; leaving
  home dismisses Undo; filter across Home → Nomnom → back → Archive; transitions forward
  and back; reduce-motion; scrollbar in each palette.
- **Explainer:** retake the screenshots before the PR. The MOCKUP screens in sections 4,
  5 and 5b become REAL.

## Out of scope

- Desktop layout (its own brainstorm).
- Resolving everything one person owes; partial-amount resolve.
- Case-insensitive name matching (it would mean changing the debt math).
- Pairs that net to 0 overall but still have open lines in individual Nomnoms (they
  don't appear on home, same as today).
