# Split — Friends Bill-Splitting PWA (Design Spec)

**Date:** 2026-08-07
**Status:** Approved requirements (gathered via clarifying Q&A)

## Purpose
A mobile-first Progressive Web App to track shared expenses when hanging out
with friends where **one or more people front the bills**, then compute
**who owes whom**. Data persists in the browser (localStorage). Debts
accumulate across "nights" until a night is marked **done**.

## Confirmed requirements (from user)
1. **Split method:** Equal split among selected people, **each share editable**,
   with **per-person locking**: editing a person locks their amount; everyone
   still on auto re-splits the remaining total equally, live, whenever the total
   or any locked amount changes. (Worked example: total 200k over A,B,C,D → 50
   each; lock B=80 → A,C,D=40; lock A=60 → C,D=30; lock C=40 → D=20.)
2. **Payer scope:** Payer can **differ per item** within a night.
3. **Currency:** Plain numbers, **VND** (e.g. `300.000 ₫`), no "K" shorthand.
4. **Backup:** **Export / Import JSON** file.
5. **People:** Type participant names **per night**, with an **editable list of
   common names** (managed in Settings) offered as autocomplete suggestions.
6. **Balance view:** **Netted, direct pairs** across all active nights
   (e.g. "B owes A 50.000 ₫"), cancelling opposite debts.
7. **Settling:** **Mark the whole night done** → moves to Archive (still
   viewable), leaves active balances.

## Stack
- Vite + React + TypeScript
- `vite-plugin-pwa` (Workbox) — offline, installable, manifest + service worker
- Tailwind CSS + shadcn/ui (Radix primitives)
- Zustand + `persist` middleware → `localStorage`
- `react-router-dom` — Home / Night / Archive / Settings
- `zod` — validate imported JSON
- Vitest — unit tests for the pure debt-calc module
- Money stored as **integer VND**; formatted via `Intl.NumberFormat('vi-VN')`

## Data model
```ts
KnownNames = string[]                       // editable, drives autocomplete
Night {
  id: string
  title?: string
  date: string                              // ISO
  status: 'active' | 'settled'
  settledAt?: string
  participants: string[]                    // names present that night
  items: Item[]
}
Item {
  id: string
  label: string                             // "Dinner", "Destination X"
  payer: string                             // per-item payer (a participant)
  amount: number                            // total paid by payer (VND)
  shares: { name: string; amount: number }[]// equal by default, each editable
}
```

## Core logic — `lib/calc.ts` (pure, unit-tested)
- Per item: every person in `shares` **except the payer** owes the payer their
  share amount.
- Aggregate all items across a given set of nights into pairwise debts, then
  **net opposite pairs** → a list of `{ from, to, amount }`.
- `computeBalances(nights)` used twice: all **active** nights (Home) and a
  single night (Night detail).
- `redistribute(rows, total)` — pure per-person-locking split used by the item
  form: locked people keep their amount; unlocked (`included`) people evenly
  share `total − Σlocked` (clamped at 0). Unit-tested against the worked example.
- When every included person is locked, shares may leave a **remainder**
  (≠ total): surfaced as a non-blocking warning.

## Screens (mobile-first)
1. **Home / Balances** — netted "who owes whom" for active nights; list of
   active night cards; `＋ New night`; links to Archive & Settings.
2. **Night detail** — participants (autocomplete + free type); items list;
   add/edit item sheet (label, payer, amount, tick participants → auto-equal
   shares, each editable, remainder shown); this night's balances;
   **Mark done**.
3. **Archive** — settled nights, read-only, restore / delete.
4. **Settings** — manage common-names list; Export / Import JSON.

## Maintainability & theming
- All colors are **CSS custom properties** in `src/index.css`
  (`:root` / `.dark`). Changing the palette = editing that one block
  (documented in README).
- Layered architecture: pure `lib/` (calc, format, storage) ← `store/`
  (Zustand) ← feature components. Each unit independently testable.

## Folder layout
```
bill-splitter/
  src/
    components/ui/     # shadcn primitives (button, input, dialog, select, ...)
    components/        # app components (NightCard, ItemDialog, BalanceList, NameInput, ...)
    lib/               # calc.ts, format.ts, storage.ts, utils.ts
    store/             # useAppStore.ts (zustand + persist)
    pages/             # Home, NightDetail, Archive, Settings
    types.ts           # domain types + zod schemas
    App.tsx, main.tsx, index.css
  public/              # PWA icons
  vite.config.ts       # + VitePWA
```

## Error handling
- Import: `zod` `safeParse`; invalid file → toast, no state change.
- Item shares not summing to amount → warning, still saved.
- Empty states for no nights / no balances.
