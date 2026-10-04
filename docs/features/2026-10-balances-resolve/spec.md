# Balances: Details, Resolve, Long List + Polish — Design

**Date:** 2026-10-04 · **Status:** approved in brainstorming, awaiting spec review
**Explainer (real screens + mockups):** https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4, sections 4–5

## Problem

The home card "Current balances" shows netted rows ("Minh → Lan 70.000 ₫") summed
across **all** active Nomnoms (`computeBalances`). Debt lines and their payments live
**per Nomnom** (`computeNightLines`). Because of that gap:

1. A home row can't be tapped. Finding where 70.000 comes from means opening every
   Nomnom and subtracting by hand.
2. Settling a pair means opening each Nomnom and ticking its line, in both directions.
3. With many unpaid debts the card grows without limit (26 rows with 8 friends × 8
   Nomnoms) and pushes the Nomnom list off screen.

There's also some polish: screen changes have no animation, the scrollbar is the browser
default, and "Mark Nomnom as done" is too long.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| 1 | Tapping a home row opens a **bottom sheet** with the pair's per-Nomnom breakdown. Each entry links to its Nomnom. |
| 2 | **Resolve** works on **one pair** (row). It ticks every line between the two people, in **both directions**, in every active Nomnom. |
| 3 | Resolve is confirmed in a modal that **lists every change first**. Nomnoms that become fully paid are **archived automatically** and named in that modal. A toast offers **Undo**. |
| 4 | Long list: show the **top 5** rows plus "Show all (N)", and add a **name filter** (chips). |
| 5 | Screen transitions: **slide**. Going deeper slides in from the right, going back slides from the left. CSS keyframes only; no motion under `prefers-reduced-motion`. |
| 6 | Scrollbar: thin and rounded, colored from palette tokens. |
| 7 | "Mark Nomnom as done" becomes **"Mark done"**. |

## Math (`src/apps/split/lib/calc.ts`, pure)

Two new functions. Both reuse `computeNightLines`, so their numbers always match what a
Nomnom's own screen shows.

```ts
/** One Nomnom's line between a and b (either direction). */
export interface PairEntry {
  nightId: string
  title: string          // night.title || formatted date
  date: string
  line: DebtLine         // from/to tell the direction
}

/** Lines between a and b across the given (active) nights, newest first. */
export function computePairBreakdown(nights: Night[], a: string, b: string): PairEntry[]

export interface PairResolvePlan {
  /** Payments to write: one per pair line, amount = line.owed. */
  writes: { nightId: string; from: string; to: string; amount: number }[]
  /** Night ids whose every line will be paid once the writes are applied. */
  toArchive: string[]
}

/** What resolving a ↔ b would do. Changes nothing. */
export function planPairResolve(nights: Night[], a: string, b: string): PairResolvePlan
```

Rules for `planPairResolve`:

- Every line between `a` and `b` in either direction gets `payment = line.owed`. That
  includes lines that are already paid, which trims any over-payment left by later item
  edits. **Guarantee:** afterwards the pair nets to exactly 0 in `computeBalances`.
- A payment between `a` and `b` that no longer matches any line (its items were deleted)
  is planned for removal, so it can't leave a stray balance behind.
- `toArchive` only contains Nomnoms the resolve **touches**. A Nomnom qualifies if it
  has ≥ 1 line and all of its lines would have `remaining === 0` afterwards. Untouched
  Nomnoms are never archived.
- Money is whole VND (shares come from `equalShares` and `parseMoney`), so per-Nomnom
  rounding can't leave a 1 ₫ residue.

## Store (`useSplitStore.ts`)

```ts
resolvePair(a: string, b: string): Night[]          // returns the touched nights *before* the change
restoreNightsSnapshot(snapshot: Night[]): void       // puts those nights back exactly as they were
```

- `resolvePair` calls `planPairResolve` on the active nights and applies the result in
  **one** `set()`: it upserts or removes payments, and archives `toArchive` with the same
  `status: 'settled'` + `settledAt` as `markDone`. The modal preview and the action share
  one plan, so they can't disagree.
- `restoreNightsSnapshot` replaces each night by id, which restores earlier partial
  payments too. Ids that no longer exist are ignored.
- No schema change, no persist-version bump, no backup change.

## UI

### Home (`SplitHome` + `BalanceList`)

- Each row becomes a `<button>` with a subtitle "from N Nomnom(s)" (from the breakdown
  length) and a ›. `BalanceList` gains `onSelect(debt)`.
- **Long list:** when there are more than 5 rows, show
  - **name chips** ("All" plus everyone who appears in a row, alphabetical, scrolling
    sideways). Picking a name shows *all* of that person's rows plus a summary
    "owes X · is owed Y".
  - with "All" selected, the **top 5** rows (already sorted biggest first) plus
    "Show all (N)" / "Show less".
- Filter and expanded state are kept in component state, so they reset when you leave
  the screen. If a resolve removes the filtered person's last row, the filter goes back
  to "All".

### `PairSheet` (new, `apps/split/components/PairSheet.tsx`)

- Uses the existing `Dialog`, which already appears as a bottom sheet on phones.
- Header "Minh → Lan" and "Minh owes Lan 70.000 ₫ across 2 Nomnoms".
- One row per `PairEntry`: title · date, direction, and a signed amount (+ for the
  row's direction in the owe color, − for the opposite direction in the paid color).
  Lines that are already paid show as paid. Tapping a row closes the sheet and
  navigates to `/split/night/:id`.
- Net line, then a **Resolve Minh → Lan** button (success variant).

### Resolve confirmation

- `ConfirmDialog.description` widens from `string` to `ReactNode`. Existing callers keep
  passing strings.
- Content: one ✓ line per write (e.g. "Pizza Fri: Minh → Lan 100.000 ₫ paid"), then, if
  `toArchive` isn't empty, a note: "**BBQ Sun** will be fully paid and move to the
  archive."
- On confirm: call `resolvePair`, close the dialog and the sheet, and show
  `toast.success('Minh → Lan resolved · 1 Nomnom archived', { action: { label: 'Undo',
  onClick: () => restoreNightsSnapshot(snapshot) } })`.

### Screen transitions

- In `App.tsx`, the routed content is wrapped in a container keyed by `location.pathname`.
  A ref stores the previous path depth (number of segments). Deeper or equal depth gives
  `route-forward`, shallower gives `route-back`.
- `index.css`: two keyframes (`translateX(100%) → 0` and `translateX(-30%), opacity .6 → 1`),
  240 ms `cubic-bezier(.2,.8,.2,1)`, no fill-mode, so no transform stays after the
  animation. The container gets `overflow-x: clip` during the slide.
  `@media (prefers-reduced-motion: reduce)` turns the animation off.
- **Gotcha:** an element being transformed becomes the containing block for its
  `position: fixed` children. The bottom bars ("New Nomnom", Nomnom actions) would jump
  mid-slide. Fix: a small shared `BottomBar` component renders them through a portal to
  `document.body`, so they stay put like a native tab bar.
- Dialogs and sheets keep their existing slide-up animation.

### Scrollbar (`index.css`)

- `scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / .35) transparent`,
  plus `::-webkit-scrollbar` rules for older WebKit (8 px, rounded thumb in
  `--border`, `--muted-foreground` on hover).
- Follows every palette because it only reads tokens. iOS draws its own overlay
  scrollbar, which can't be styled; that's acceptable.

### Copy

- `NightDetail`: the button reads **"Mark done"**. The dialog ("Mark this Nomnom as
  done?") and its "Mark done" confirm button stay as they are.

## Testing (Vitest)

- `calc.test.ts`
  - `computePairBreakdown`: both directions, a pair in only some Nomnoms, newest first,
    already-paid lines included.
  - `planPairResolve`: writes `owed` for every pair line, trims over-payment, removes
    orphan pair payments, archives only touched Nomnoms that end fully paid, and after
    applying the writes `computeBalances` has no row for the pair.
- `useSplitStore.test.ts`
  - `resolvePair` writes payments and archives in one update and returns the
    before-snapshot.
  - `restoreNightsSnapshot` after `resolvePair` gives a deep-equal of the original nights.
- Manual: run the dev server with the explainer's example data, walk the story
  (tap row → sheet → resolve → Undo), check the long-list chips, check transitions
  forward and back, and check reduce-motion.
- **Explainer:** retake the screenshots. The mockups in sections 4–5 become REAL screens.

## Out of scope

- Desktop layout (its own brainstorm).
- Resolving everything one person owes (options B/C in brainstorming).
- Partial-amount resolve, and remembering the filter between visits.
- Pairs that net to 0 overall but still have open lines in individual Nomnoms (they
  don't appear on home, same as today).
