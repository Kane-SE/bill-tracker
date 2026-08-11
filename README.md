# Split — Friends Bill-Splitting PWA

A mobile-first Progressive Web App to track **who owes whom** after hanging out
with friends, when one (or more) people front the bills. Runs fully offline and
stores everything in your browser — no account, no server.

## Features

- **Nights** — each hangout is a "night". Add who came and what was paid.
- **Per-item payer** — a different person can pay for each item.
- **Equal split, editable** — costs split equally by default; tweak any share.
- **Netted balances** — a clear "B owes A 50.000 ₫" summary that adds up across
  all active nights and cancels out opposite debts.
- **Mark a night done** — settled nights move to an Archive (still viewable /
  restorable).
- **Common names** — keep a list of frequent friends for quick autocomplete.
- **Backup** — export/import all data as a JSON file to move between devices.
- **Installable PWA** — add to home screen; works offline; light & dark themes.

## Tech stack

| Concern | Choice |
|---|---|
| Build / dev | Vite + React + TypeScript |
| PWA | `vite-plugin-pwa` (Workbox) |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| State + storage | Zustand + `persist` → `localStorage` |
| Routing | `react-router-dom` (HashRouter) |
| Validation | `zod` (import backups) |
| Tests | Vitest (pure debt-calc logic) |

## Getting started

```bash
npm install
npm run dev        # start dev server (PWA enabled in dev)
npm run build      # type-check + production build
npm run preview    # preview the production build
npm test           # run unit tests
```

Icons are pre-generated in `public/`. To regenerate them:

```bash
node scripts/generate-icons.mjs
```

## Changing the colors / theme

**All colors live in one place:** `src/index.css`. A theme is one full set of
HSL tokens (`H S% L%`), selected by the `data-theme` attribute on `<html>`:

```css
[data-theme='dark']   { --primary: 250 95% 72%; /* … */ }
[data-theme='coffee'] { --primary: 25 26% 56%;  /* … */ }
```

Change a value in a block and the whole app updates — nothing else hard-codes a
color. Built-in themes: **Default (Violet)** and **Coffee**, each in light/dark.
Users pick palette + mode in **Settings → Appearance** (defaults to Default/Dark).

### Adding your own palette

1. In `src/index.css`, copy a `[data-theme='…']` block and give it a new name.
2. Map your colors. Neutral/brand tokens (`background`, `card`, `primary`,
   `secondary`, `muted`, `accent`, `border`, `input`, `ring`) go by **lightness
   + contrast** — lightest to surfaces, darkest to `primary`, middles to borders.
   `destructive` (red) and `success` (green) go by **meaning** and should stay
   recognizable. Make sure each `*-foreground` contrasts with its background.
3. Register it in `PALETTES` in `src/lib/theme.ts` — it appears in the picker.

The **Coffee** palette (`AD8B73 CEAB93 E3CAA5 FFFBE9`) is a worked example: those
four warm tones fill the neutral/brand roles, and an espresso text color, a warm
red, and a muted green were **added** because the source palette has no dark
text, red, or green.

## Project structure

```
src/
  components/ui/   shadcn primitives (button, input, dialog, select, …)
  components/      app components (NightCard, ItemDialog, BalanceList, …)
  lib/             calc.ts (pure debt math), format.ts, storage.ts, theme.ts
  store/           useAppStore.ts (Zustand + persist)
  pages/           Home, NightDetail, Archive, Settings
  types.ts         domain types + zod schemas
  index.css        THEME TOKENS live here
```

### How balances are computed

`src/lib/calc.ts` is pure and unit-tested (`calc.test.ts`):

1. For each item, everyone in the split **except the payer** owes the payer
   their share.
2. Debts are aggregated across all active nights.
3. Opposite debts within a pair are **netted** (A→B and B→A cancel).

## Data & privacy

Everything is stored locally under the `bill-splitter-store` key in
`localStorage`. Clearing browser data erases it — use **Settings → Export** to
keep a backup.
