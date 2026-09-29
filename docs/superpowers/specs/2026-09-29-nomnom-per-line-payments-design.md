# Nomnom Per-Line Payments — Design

**Date:** 2026-09-29 · **Status:** approved in brainstorming, awaiting spec review

## Problem

A Nomnom can only be settled as a whole (`status: 'active' → 'settled'` via
"Mark Nomnom as done"). When several people owe money, there is no way to
record that *some* of them have paid back, so progress has to be tracked
outside the app.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| 1 | The unit of completion is **one debt line** (`from → to`), not a whole person. |
| 2 | Ticking is **full-amount only** — no partial-payment entry. Tapping a ticked line unticks it. |
| 3 | A tick **records the amount paid**. If items are edited later so the line grows, the line reopens showing what's left (e.g. "20.000 ₫ left · 50.000 paid"). |
| 4 | When the **last** open line is ticked, **prompt** "Everyone's paid — move to archive?". No auto-archive. The manual "Mark Nomnom as done" button stays. |
| 5 | Storage approach **A**: a `payments` list on each Nomnom (not fake items, not a boolean flag). |

## Data model

`src/apps/split/types.ts`:

```ts
export const paymentSchema = z.object({
  from: z.string(),   // who paid back
  to: z.string(),     // who received it
  amount: z.number().nonnegative(),
})
export type Payment = z.infer<typeof paymentSchema>

// nightSchema gains:
payments: z.array(paymentSchema).optional()
```

- **Optional**, read everywhere as `night.payments ?? []`. Existing localStorage
  data and existing backup files (v1 and v2) have no `payments` field and stay
  valid — no persist-version bump, no backup-version bump, no migration.
- **At most one payment per directed pair** (`from`,`to`) per Nomnom. Ticking
  upserts; unticking removes it.
- Backup v2 carries payments automatically because `nightSchema` is reused by
  `backup.ts`.

## Math (`src/apps/split/lib/calc.ts`, pure)

A payment `from → to, X` is money moving the opposite way of a debt, so it is
fed into the same signed pair-net map as items, with the opposite sign
(it reduces "`from` owes `to`" by `X`).

- **`computeBalances(nights)`** — now also accumulates each night's payments.
  The home screen's "Current balances" therefore shows only what is still
  owed, netted across all active Nomnoms as today.
- **New `computeNightLines(night): DebtLine[]`**:

  ```ts
  interface DebtLine {
    from: string
    to: string
    owed: number      // netted item debt for this pair in this Nomnom (payments ignored)
    paid: number      // payment recorded for from→to, 0 if none
    remaining: number // max(0, owed − paid)
  }
  ```

  One line per pair that has `owed > 0` (same netting + ordering as today's
  `computeNightBalances`). A line is **paid** when `remaining === 0`.
- **Edge cases**
  - *Line shrinks after a tick* (paid 50k, now owes 30k): line shows as paid.
    The 20k overpayment is real money, so it surfaces in the home screen's
    netted balances as `to` owing `from` 20k. No extra UI inside the Nomnom.
  - *Line disappears or flips direction* (items deleted/edited): the orphan
    payment is not shown as a line but still counts in the netted balances —
    same reasoning. Unticking is not possible for it from the line list; this
    is acceptable given how rare it is.
  - Rounding matches existing code (`Math.round`, drop zero lines).

## Store (`useSplitStore.ts`)

```ts
markLinePaid(nightId: string, from: string, to: string, amount: number): void
unmarkLinePaid(nightId: string, from: string, to: string): void
```

- `markLinePaid` upserts `{ from, to, amount }` (amount = the line's current
  `owed`, so re-ticking a reopened line tops it up to full).
- `unmarkLinePaid` removes the payment for that pair.
- Both are no-ops for unknown Nomnom ids.

## UI

### `NightDetail` — "This Nomnom's balances" card

- Replace `BalanceList` here with a new `DebtLineList` component
  (`src/apps/split/components/DebtLineList.tsx`). `BalanceList` stays as-is for
  the home screen.
- Header shows progress: **"2 of 3 paid"** (hidden when there are no lines).
- Each row: round check button on the left, `from → to`, amount on the right.
  - **Open:** empty circle, amount in `text-destructive` (as today).
  - **Paid:** filled check in `success`, row tinted `success`, amount struck
    through and muted.
  - **Reopened** (`paid > 0 && remaining > 0`): empty circle, amount shows
    `remaining`, sub-line "50.000 paid" in muted text.
- The whole row is the tap target (≥ 44px tall); tap ticks/unticks with a
  `sonner` toast ("Bình → An marked paid" / "…unmarked").
- **Read-only** when the Nomnom is settled (archived): checks visible, not
  tappable.
- **All-paid prompt:** after a tick that leaves every line paid, open a
  `ConfirmDialog` — title "Everyone's paid", description "Move this Nomnom to
  the archive?", confirm "Archive" (success variant) → existing `markDone` +
  navigate to `/split`. Cancel just closes. Only triggered by a tick, never on
  page load.

### Unchanged

- "Mark Nomnom as done" / "Restore to active" / delete buttons.
- `NightCard`, Archive list, item editing.

## Testing (Vitest)

- `calc.test.ts`
  - payment fully cancels its line in `computeBalances`;
  - `computeNightLines` returns owed/paid/remaining; reopened line after an
    item edit shows the correct remainder;
  - overpayment surfaces as a reverse debt in `computeBalances`;
  - payments net correctly across multiple Nomnoms;
  - nights without a `payments` field behave exactly as before.
- `useSplitStore.test.ts` — `markLinePaid` upsert/top-up, `unmarkLinePaid`.
- `backup.test.ts` — v2 round-trip preserves payments; files without payments
  still parse.

## Out of scope

- Partial payments, payment dates/history, per-person "settle all" shortcut.
