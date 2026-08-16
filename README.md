# Split — Friends Bill-Splitting PWA

A mobile-first Progressive Web App to track **who owes whom** after hanging out
with friends, when one (or more) people front the bills. Runs fully offline and
stores everything in your browser — no account, no server.

Split lives inside a small **app launcher**: the PWA's home screen (`/`) is a
grid of mini-apps, and Split is the first one. See
[Launcher + registry](#launcher--registry-adding-a-new-app) below for how more
apps get added.

## Features

- **Nomnoms** — each hangout is a "Nomnom" in the UI (the code/type is still
  `Night`, unchanged from before the rename — see
  [Design record](docs/superpowers/specs/2026-08-11-nomnom-launcher-design.md)).
  Creating one is **deferred**: `/split/new` shows a name field + people editor
  and only enables **Create** once you've typed a name or added a person;
  leaving the page without pressing Create discards the draft. An empty name
  defaults to today's date.
- **Per-item payer** — a different person can pay for each item.
- **Equal split, editable** — costs split equally by default; tweak any share.
- **Autocomplete combobox** — adding people/payers uses a styled, keyboard-
  navigable combobox (`shared/components/Combobox.tsx`) instead of a native
  `<datalist>`, with an inline "Add “name”" option for new names.
- **Common names, remembered automatically** — a name that shows up in 3+
  distinct Nomnoms auto-joins the Common names list (case-insensitive,
  one-time, persisted); you can still add/remove names by hand and a removed
  name is never silently re-added.
- **Netted balances** — a clear "B owes A 50.000 ₫" summary that adds up across
  all active Nomnoms and cancels out opposite debts.
- **Mark a Nomnom done** — settled Nomnoms move to an Archive (still viewable /
  restorable).
- **Backup** — export/import all app data *and* your appearance settings as one
  JSON file (backup v2, see below) to move between devices.
- **Installable PWA** — add to home screen; works offline; light & dark themes,
  plus a fully custom color palette (see
  [Custom palette](#custom-palette-settings--appearance--custom) below).

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
3. Register it in `PALETTES` in `src/shared/lib/theme.ts` — it appears in the
   picker.

The **Coffee** palette (`AD8B73 CEAB93 E3CAA5 FFFBE9`) is a worked example: those
four warm tones fill the neutral/brand roles, and an espresso text color, a warm
red, and a muted green were **added** because the source palette has no dark
text, red, or green.

### Custom palette (Settings → Appearance → Custom → Customize colors)

Besides the two built-in themes, users can build their own palette without
touching CSS. Pick **Custom** in the palette picker, then **Customize colors**
opens a guided modal (`src/settings/CustomPaletteDialog.tsx`) asking for just
**6 plain-language colors** — Background, Text, Buttons & highlights, Accents,
Owed/Delete, Settled/Paid. `src/shared/lib/palette.ts` (`deriveTokens`) expands
those 6 into the full **19-token** set the rest of the app already uses (card,
secondary, muted, borders, all the `*-foreground` pairs, …), picking readable
black/white text per color and deriving surface/border shades by lightness.
Custom is a single fixed set — there's no separate light/dark toggle for it,
so the mode switch is hidden while Custom is active. An **Advanced** section
in the same modal lets you export the 6 base colors as a small JSON file or
import one someone else made.

## Launcher + registry (adding a new app)

The app's home screen (`/`) is a **launcher**: an icon grid rendered from a
plain array in `src/launcher/registry.ts`.

```ts
// src/launcher/registry.ts
export const apps: AppEntry[] = [
  { id: 'split', name: 'Split', description: '…', icon: Receipt, to: '/split' },
]
```

To ship a new mini-app:

1. Build it under its own `src/apps/<name>/` folder (own store, pages,
   components — mirror `src/apps/split/`).
2. Add a `<Route>` subtree for it (see `src/apps/split/routes.tsx` for the
   pattern) and mount it in `src/App.tsx`.
3. Add one `AppEntry` to the `apps` array in `src/launcher/registry.ts` — name,
   short description, a `lucide-react` icon, and the app's base route. It
   shows up in the launcher grid automatically; no other wiring needed.

Global concerns (theme/appearance, backup) live in `src/settings/` and apply
across every app, not per-app.

## Project structure

```
src/
  App.tsx                 router: launcher (/) + /split/* + /settings
  main.tsx
  index.css                THEME TOKENS live here
  launcher/
    registry.ts            AppEntry[] — add an app here
    Launcher.tsx            icon grid, reads the registry
  settings/
    Settings.tsx            global Appearance + Backup
    CustomPaletteDialog.tsx  guided 6-color modal + advanced JSON import/export
    backup.ts                buildBackup / parseBackup / applyBackup (v2, v1 migrates in)
  shared/
    ui/                     shadcn primitives (button, input, dialog, select, …)
    components/             PageHeader, HeaderIconLink, EmptyState, ConfirmDialog,
                             MoneyInput, Combobox
    lib/                    utils.ts, theme.ts, palette.ts (color derivation), file.ts
  apps/split/
    types.ts                Night, Item, schemas
    routes.tsx               <Route> subtree mounted under /split
    store/useSplitStore.ts   nights, knownNames, promotedNames (Zustand + persist)
    lib/                     calc.ts (pure debt math), format.ts, names.ts
    components/              BalanceList, NightCard, ItemRow, ItemDialog, ParticipantEditor
    pages/                   SplitHome, NewNomnom, NightDetail, Archive, SplitNames
```

### How balances are computed

`src/apps/split/lib/calc.ts` is pure and unit-tested (`calc.test.ts`):

1. For each item, everyone in the split **except the payer** owes the payer
   their share.
2. Debts are aggregated across all active Nomnoms.
3. Opposite debts within a pair are **netted** (A→B and B→A cancel).

## Data & privacy

Everything is stored locally under the `bill-splitter-store` key in
`localStorage` (unchanged since before the launcher refactor, so existing data
survives). Clearing browser data erases it — use **Settings → Backup → Export**
to keep a copy.

### Backup v2

Export produces a single JSON file shaped like:

```json
{
  "version": 2,
  "apps": { "split": { "nights": [...], "knownNames": [...], "promotedNames": [...] } },
  "appearance": { "palette": "default", "mode": "dark", "custom": { "...": "..." } }
}
```

It's **app-aware** (each app's data sits under its own key in `apps`, so more
apps can add their own slice later) and includes your **appearance** choice
(palette, light/dark mode, and the custom colors if you built one), so
restoring a backup also restores how the app looks. Old **v1** backup files
(pre-launcher, just `{ version: 1, knownNames, nights }`) still import — they
get migrated into the v2 shape on the fly (`src/settings/backup.ts`).
