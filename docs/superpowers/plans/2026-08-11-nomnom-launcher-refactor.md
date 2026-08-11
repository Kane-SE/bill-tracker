# Nomnom Launcher + Split Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-purpose "Split" app into a multi-app PWA (launcher home + registry) and add six Split improvements: session rename to "Nomnom", deferred creation with a Create page, a styled autocomplete combobox, frequency-based name remembering, a guided custom-color palette, and app-aware backup.

**Architecture:** Restructure `src/` into `shared/` (cross-app UI + libs), `apps/split/` (all Split code + its own store), `launcher/` (icon grid + app registry), and `settings/` (global appearance + backup). Routing moves to a launcher at `/` with Split mounted under `/split/*` and global settings at `/settings`. Pure logic (debt calc, name frequency, palette derivation, backup migration) stays in framework-free, unit-tested modules.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind + shadcn/Radix, Zustand (persist), zod, vite-plugin-pwa, Vitest. Path alias `@` → `src` (in `vite.config.ts` and `vitest.config.ts`).

## Global Constraints

- **Package manager:** npm. Run all commands from `D:\study\bill-splitter`.
- **No new runtime dependencies** unless a task explicitly adds one. The combobox and custom-palette UI must be built on existing deps (no new Radix packages).
- **Money is integer VND**; all formatting goes through `format.ts`. Do not introduce floats.
- **localStorage key stays `bill-splitter-store`** for the Split store so existing user data survives the refactor.
- **Theme storage key stays `bill-splitter-theme`.**
- **Colors only via CSS tokens** in `src/index.css` / `data-theme`; never hard-code a color in a component. Exception: the custom-palette engine sets inline CSS variables at runtime.
- **User-facing session word is "Nomnom"**; the internal type stays `Night`. App tile/product name stays **"Split"**.
- **Tests run in Vitest node env** (no jsdom). Unit-test pure logic only; verify UI in the browser preview.
- **Every task ends green:** `npm run build` (tsc + vite) passes and `npm test` passes before commit.
- **Commit after every task.** Conventional commit messages.
- Co-author every commit with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Design summary (from grilling session, 2026-08-11)

| # | Decision |
|---|---|
| 1 | "night" → **"Nomnom"** in UI copy only; `Night` type unchanged. |
| 2 | **Deferred creation**: `/split/new` form + Create button; back = discard. Enabled once a name is typed or ≥1 person added; empty name defaults to today's date. |
| 3 | Native `<datalist>` → reusable **`Combobox`** (anchored, styled, keyboard nav, "Add '<typed>'"). |
| 4 | A name auto-joins Common names once it appears in **3+ distinct Nomnoms** (case-insensitive); one-time, persisted, deletable, never silently re-added. Manual add stays. |
| 5 | **Launcher** at `/`: 2-col icon grid (3-col wide), registry-driven; Split icon `Receipt`. Routes `/split`, `/split/new`, `/split/night/:id`, `/split/archive`, `/split/names`, global `/settings`. |
| 6 | Structure: `apps/split/` + `shared/` + `launcher/` + `settings/`; per-app store `useSplitStore`; global theme. |
| 7 | Palettes: Default, Coffee, **Custom** (guided modal, 6 plain-language colors → 19 derived; single fixed set, mode toggle hidden when Custom active; advanced JSON import/export). |
| 8 | **Backup** global + app-aware + includes appearance: `{ version:2, apps:{ split:{ nights, knownNames, promotedNames } }, appearance:{ palette, mode, custom? } }`; v1 files still import. |

---

## Target file structure

```
src/
  App.tsx                        # router: launcher + /split/* + /settings
  main.tsx                       # imports @/shared/lib/theme
  index.css                      # + [data-theme='custom'] placeholder block
  launcher/
    registry.ts                  # AppEntry[] (id, name, description, icon, to)
    Launcher.tsx                 # icon grid
  settings/
    Settings.tsx                 # global: Appearance + Backup
    CustomPaletteDialog.tsx      # guided 6-color modal + advanced JSON
    backup.ts                    # buildBackup / parseBackup / applyBackup (v1→v2)
  shared/
    ui/                          # moved shadcn primitives (button, input, ...)
    components/
      PageHeader.tsx  HeaderIconLink.tsx  EmptyState.tsx
      ConfirmDialog.tsx  MoneyInput.tsx  Combobox.tsx
    lib/
      utils.ts  theme.ts  palette.ts  file.ts
  apps/split/
    types.ts                     # Night, Item, schemas
    routes.tsx                   # <Route> subtree for /split/*
    store/useSplitStore.ts       # nights, knownNames, promotedNames (+ actions)
    lib/  calc.ts  calc.test.ts  format.ts  names.ts  names.test.ts
    components/  BalanceList  NightCard  ItemRow  ItemDialog  ParticipantEditor
    pages/  SplitHome  NightDetail  Archive  NewNomnom  SplitNames
```

---

### Task 1: Restructure folders (no behavior change)

Mechanical move + import rewrite. Routes and UI stay identical; this only relocates files and renames the store hook.

**Files:**
- Move `src/components/ui/*` → `src/shared/ui/`
- Move `src/components/{PageHeader,HeaderIconLink,EmptyState,ConfirmDialog,MoneyInput}.tsx` → `src/shared/components/`
- Move `src/components/{BalanceList,NightCard,ItemRow,ItemDialog,ParticipantEditor}.tsx` → `src/apps/split/components/`
- Move `src/lib/{utils,theme}.ts` → `src/shared/lib/`
- Move `src/lib/storage.ts` → `src/shared/lib/storage.ts` (temporary home; refactored in Task 10)
- Move `src/lib/{calc,calc.test,format}.ts` → `src/apps/split/lib/`
- Move `src/types.ts` → `src/apps/split/types.ts`
- Move+rename `src/store/useAppStore.ts` → `src/apps/split/store/useSplitStore.ts`
- Move `src/pages/{Home,NightDetail,Archive}.tsx` → `src/apps/split/pages/` (Home stays named `Home` for now)
- Move `src/pages/Settings.tsx` → `src/settings/Settings.tsx`
- Modify `src/App.tsx`, `src/main.tsx` (import paths only)

**Interfaces:**
- Produces: `useSplitStore` (renamed from `useAppStore`), `useNight` (unchanged) from `@/apps/split/store/useSplitStore`. All other exports keep their names, only import specifiers change.

- [ ] **Step 1: Create the new directories and move files** (PowerShell)

```powershell
cd D:\study\bill-splitter\src
New-Item -ItemType Directory -Force shared\ui, shared\components, shared\lib, apps\split\components, apps\split\pages, apps\split\store, apps\split\lib, launcher, settings | Out-Null
Move-Item components\ui\* shared\ui\
Move-Item components\PageHeader.tsx, components\HeaderIconLink.tsx, components\EmptyState.tsx, components\ConfirmDialog.tsx, components\MoneyInput.tsx shared\components\
Move-Item components\BalanceList.tsx, components\NightCard.tsx, components\ItemRow.tsx, components\ItemDialog.tsx, components\ParticipantEditor.tsx apps\split\components\
Move-Item lib\utils.ts, lib\theme.ts shared\lib\
Move-Item lib\storage.ts shared\lib\
Move-Item lib\calc.ts, lib\calc.test.ts, lib\format.ts apps\split\lib\
Move-Item types.ts apps\split\types.ts
Move-Item store\useAppStore.ts apps\split\store\useSplitStore.ts
Move-Item pages\Home.tsx, pages\NightDetail.tsx, pages\Archive.tsx apps\split\pages\
Move-Item pages\Settings.tsx settings\Settings.tsx
Remove-Item components, lib, store, pages -Recurse -Force
```

- [ ] **Step 2: Rename the store hook symbol**

In `src/apps/split/store/useSplitStore.ts`, rename the exported constant `useAppStore` → `useSplitStore` (the `create<AppState>()(...)` assignment on line ~43 and any self-references). Keep `useNight` and interface `AppState` names as-is.

- [ ] **Step 3: Rewrite import specifiers across `src`**

Apply these exact replacements in every `.ts`/`.tsx` file under `src`:

| Old specifier | New specifier |
|---|---|
| `@/components/ui/` | `@/shared/ui/` |
| `@/components/PageHeader` | `@/shared/components/PageHeader` |
| `@/components/HeaderIconLink` | `@/shared/components/HeaderIconLink` |
| `@/components/EmptyState` | `@/shared/components/EmptyState` |
| `@/components/ConfirmDialog` | `@/shared/components/ConfirmDialog` |
| `@/components/MoneyInput` | `@/shared/components/MoneyInput` |
| `@/components/BalanceList` | `@/apps/split/components/BalanceList` |
| `@/components/NightCard` | `@/apps/split/components/NightCard` |
| `@/components/ItemRow` | `@/apps/split/components/ItemRow` |
| `@/components/ItemDialog` | `@/apps/split/components/ItemDialog` |
| `@/components/ParticipantEditor` | `@/apps/split/components/ParticipantEditor` |
| `@/lib/utils` | `@/shared/lib/utils` |
| `@/lib/theme` | `@/shared/lib/theme` |
| `@/lib/storage` | `@/shared/lib/storage` |
| `@/lib/calc` | `@/apps/split/lib/calc` |
| `@/lib/format` | `@/apps/split/lib/format` |
| `@/types` | `@/apps/split/types` |
| `@/store/useAppStore` | `@/apps/split/store/useSplitStore` |
| `useAppStore` (identifier) | `useSplitStore` |

Note: `calc.test.ts` keeps `import ... from './calc'` (relative) and updates `@/types` → `@/apps/split/types`. `shared/ui/*` files import `@/shared/lib/utils` (was `@/lib/utils`).

- [ ] **Step 4: Verify the build and tests pass**

Run: `npm run build` — Expected: PASS (no TS errors).
Run: `npm test` — Expected: PASS, 14 tests.

- [ ] **Step 5: Verify the app still loads unchanged**

Run: `npm run dev`, open the preview, screenshot the Home screen. Expected: identical to before (balances card, "New night", nights list).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: restructure into shared/ apps/split/ launcher/ settings/"
```

---

### Task 2: Rename "night" → "Nomnom" in UI copy

Copy-only change. No type/route/logic changes.

**Files:**
- Modify: `src/apps/split/pages/Home.tsx`, `src/apps/split/pages/NightDetail.tsx`, `src/apps/split/pages/Archive.tsx`, `src/apps/split/components/NightCard.tsx`, `src/apps/split/components/EmptyState` usages.

**Interfaces:** none changed.

- [ ] **Step 1: Replace user-visible strings**

Change only quoted UI text and labels (not identifiers/routes/types):

| Old text | New text |
|---|---|
| `New night` | `New Nomnom` |
| `No active nights` | `No active Nomnoms` |
| `Active nights` | `Active Nomnoms` |
| `Night name (optional)` | `Nomnom name (optional)` |
| `This night's balances` | `This Nomnom's balances` |
| `Mark night as done` | `Mark Nomnom as done` |
| `Mark this night as done?` | `Mark this Nomnom as done?` |
| `Delete night` / `Delete this night?` | `Delete Nomnom` / `Delete this Nomnom?` |
| `Night not found` / `This night doesn't exist` | `Nomnom not found` / `This Nomnom doesn't exist` |
| `Night settled` / `Night deleted` (toasts) | `Nomnom settled` / `Nomnom deleted` |
| `Create a night, add who came…` (empty state) | `Create a Nomnom, add who came…` |

Leave `computeNightBalances`, `useNight`, `night.*`, `type Night`, and all routes untouched.

- [ ] **Step 2: Verify no stray "night" copy remains**

Run: `git grep -n "night" -- src/apps/split/pages src/apps/split/components` and confirm every remaining hit is an identifier/type/route, not visible copy.

- [ ] **Step 3: Verify build + screenshot**

Run: `npm run build` — Expected: PASS.
Reload preview, screenshot Home + a Nomnom detail. Expected: copy reads "Nomnom".

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(split): rename session to Nomnom in UI copy"
```

---

### Task 3: Launcher + routing

Add the registry-driven launcher at `/`, mount Split under `/split/*`, keep global settings at `/settings`, and fix in-app navigation targets.

**Files:**
- Create: `src/launcher/registry.ts`, `src/launcher/Launcher.tsx`, `src/apps/split/routes.tsx`
- Modify: `src/App.tsx` (router), `src/apps/split/pages/Home.tsx` (rename component to `SplitHome`, retarget nav), `src/apps/split/pages/NightDetail.tsx` (backTo/navigate → `/split`), `src/apps/split/pages/Archive.tsx` (backTo → `/split`), `src/apps/split/components/NightCard.tsx` (link → `/split/night/:id`), `src/settings/Settings.tsx` (backTo → `/`)
- Rename: `src/apps/split/pages/Home.tsx` → `SplitHome.tsx` (component `Home` → `SplitHome`)

**Interfaces:**
- Produces: `AppEntry` type + `apps: AppEntry[]` from `@/launcher/registry`; `SplitRoutes` component from `@/apps/split/routes`.

```ts
// src/launcher/registry.ts
export interface AppEntry {
  id: string
  name: string
  description: string
  icon: import('lucide-react').LucideIcon
  to: string
}
```

- [ ] **Step 1: Create the registry**

```ts
// src/launcher/registry.ts
import { Receipt, type LucideIcon } from 'lucide-react'

export interface AppEntry {
  id: string
  name: string
  description: string
  icon: LucideIcon
  to: string
}

/** Every mini-app in the PWA. Add an entry (and its routes) to ship a new app. */
export const apps: AppEntry[] = [
  {
    id: 'split',
    name: 'Split',
    description: 'Who owes whom after a hangout',
    icon: Receipt,
    to: '/split',
  },
]
```

- [ ] **Step 2: Create the Launcher grid**

```tsx
// src/launcher/Launcher.tsx
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { HeaderIconLink } from '@/shared/components/HeaderIconLink'
import { apps } from '@/launcher/registry'

export function Launcher() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader
        title="Apps"
        subtitle="Little tools for everyday life"
        actions={
          <HeaderIconLink to="/settings" label="Settings">
            <Settings className="h-5 w-5" />
          </HeaderIconLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            to={app.to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:bg-secondary/50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <app.icon className="h-7 w-7" />
            </span>
            <span className="text-sm font-semibold">{app.name}</span>
            <span className="text-xs text-muted-foreground">{app.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rename Home → SplitHome and retarget its nav**

In `src/apps/split/pages/SplitHome.tsx` (renamed file): rename `export function Home` → `export function SplitHome`; change `createNight`'s `navigate(\`/night/${id}\`)` to be handled in Task 7 — for now change it to `navigate(\`/split/night/${id}\`)`. Change the Archive/Settings header links: Archive → `/split/archive`, Settings → `/settings`.

- [ ] **Step 4: Create the Split route subtree**

```tsx
// src/apps/split/routes.tsx
import { Route } from 'react-router-dom'
import { SplitHome } from '@/apps/split/pages/SplitHome'
import { NightDetail } from '@/apps/split/pages/NightDetail'
import { Archive } from '@/apps/split/pages/Archive'

/** Route elements for the Split app, mounted under /split in App.tsx. */
export const splitRoutes = (
  <>
    <Route path="/split" element={<SplitHome />} />
    <Route path="/split/night/:id" element={<NightDetail />} />
    <Route path="/split/archive" element={<Archive />} />
  </>
)
```

- [ ] **Step 5: Rewrite App.tsx**

```tsx
// src/App.tsx
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Launcher } from '@/launcher/Launcher'
import { Settings } from '@/settings/Settings'
import { splitRoutes } from '@/apps/split/routes'
import { Toaster } from '@/shared/ui/sonner'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-full py-2">
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/settings" element={<Settings />} />
          {splitRoutes}
        </Routes>
      </div>
      <Toaster />
    </HashRouter>
  )
}
```

- [ ] **Step 6: Fix remaining in-app nav targets**

- `NightDetail.tsx`: `PageHeader backTo="/"` → `backTo="/split"`; both `navigate('/')` calls → `navigate('/split')`; the not-found `backTo="/"` → `backTo="/split"`.
- `Archive.tsx`: `PageHeader backTo="/"` → `backTo="/split"`.
- `NightCard.tsx`: the link/`to` for a night → `/split/night/${night.id}`.
- `settings/Settings.tsx`: `PageHeader backTo="/"` stays `/` (back to launcher).

- [ ] **Step 7: Verify build + navigation**

Run: `npm run build` — Expected: PASS.
Reload preview at `/`. Expected: launcher grid with one **Split** tile. Click it → Split home at `/#/split`. Open a Nomnom, press back → returns to `/#/split`. Gear on launcher → `/#/settings`. Screenshot the launcher.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add app launcher and mount Split under /split"
```

---

### Task 4: Reusable Combobox component

A styled, anchored autocomplete to replace the native `<datalist>`. Pure filter logic is unit-tested; the component is verified in the browser.

**Files:**
- Create: `src/shared/components/Combobox.tsx`
- Create: `src/shared/components/combobox-filter.ts`
- Test: `src/shared/components/combobox-filter.test.ts`

**Interfaces:**
- Produces:

```ts
// combobox-filter.ts
export function filterSuggestions(suggestions: string[], query: string): string[]
```
```ts
// Combobox.tsx
export interface ComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onSelect: (value: string) => void   // fired on Enter or clicking a row
  suggestions: string[]               // already-excluded items handled by caller
  placeholder?: string
  allowNew?: boolean                  // show "Add '<query>'" when no exact match
  'aria-label'?: string
}
export function Combobox(props: ComboboxProps): JSX.Element
```

- [ ] **Step 1: Write the failing filter test**

```ts
// src/shared/components/combobox-filter.test.ts
import { describe, expect, it } from 'vitest'
import { filterSuggestions } from './combobox-filter'

describe('filterSuggestions', () => {
  it('returns all suggestions for an empty query', () => {
    expect(filterSuggestions(['Anna', 'Bob'], '')).toEqual(['Anna', 'Bob'])
  })
  it('matches case-insensitive substrings', () => {
    expect(filterSuggestions(['Anna', 'Bob', 'Bao'], 'b')).toEqual(['Bob', 'Bao'])
  })
  it('trims the query', () => {
    expect(filterSuggestions(['Anna'], '  an ')).toEqual(['Anna'])
  })
  it('returns [] when nothing matches', () => {
    expect(filterSuggestions(['Anna'], 'zzz')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- combobox-filter` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement the filter**

```ts
// src/shared/components/combobox-filter.ts
/** Case-insensitive substring filter, preserving the original order. */
export function filterSuggestions(suggestions: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return suggestions
  return suggestions.filter((s) => s.toLowerCase().includes(q))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- combobox-filter` — Expected: PASS.

- [ ] **Step 5: Implement the Combobox component**

```tsx
// src/shared/components/Combobox.tsx
import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { filterSuggestions } from './combobox-filter'

export interface ComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onSelect: (value: string) => void
  suggestions: string[]
  placeholder?: string
  allowNew?: boolean
  'aria-label'?: string
}

export function Combobox({
  value,
  onValueChange,
  onSelect,
  suggestions,
  placeholder,
  allowNew = true,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const matches = filterSuggestions(suggestions, value)
  const trimmed = value.trim()
  const hasExact = suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase())
  const showNew = allowNew && trimmed.length > 0 && !hasExact
  const rows: { label: string; value: string; isNew?: boolean }[] = [
    ...matches.map((m) => ({ label: m, value: m })),
    ...(showNew ? [{ label: `Add “${trimmed}”`, value: trimmed, isNew: true }] : []),
  ]

  // Close on outside click.
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(v: string) {
    onSelect(v)
    setOpen(false)
    setActive(0)
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={rest['aria-label']}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onValueChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, Math.max(rows.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const row = rows[active]
            if (row) choose(row.value)
            else if (trimmed) choose(trimmed)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && rows.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {rows.map((row, i) => (
            <li key={`${row.value}-${row.isNew ? 'new' : 'sug'}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(row.value)}
                className={cn(
                  'flex w-full items-center rounded-sm px-2.5 py-2 text-left text-sm',
                  i === active ? 'bg-secondary text-secondary-foreground' : 'text-foreground',
                  row.isNew && 'text-primary',
                )}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Note: `bg-popover`/`text-popover-foreground` — if those tokens are not defined, use `bg-card`. Check `tailwind.config` `colors`; the shadcn `select.tsx` already uses `bg-popover`, so the token exists. If not, substitute `bg-card`.

- [ ] **Step 6: Verify build + tests**

Run: `npm run build` — Expected: PASS.
Run: `npm test` — Expected: PASS (18 tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(shared): add reusable Combobox with tested filter"
```

---

### Task 5: ParticipantEditor uses the Combobox

Replace the native `<datalist>` with the new `Combobox`, fixing the positioning + styling complaints.

**Files:**
- Modify: `src/apps/split/components/ParticipantEditor.tsx`

**Interfaces:**
- Consumes: `Combobox` from `@/shared/components/Combobox`.

- [ ] **Step 1: Rewrite ParticipantEditor's input row**

Replace the `Input` + `<datalist>` block (and its `listId`) with the `Combobox`. Full new component body:

```tsx
// src/apps/split/components/ParticipantEditor.tsx
import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Combobox } from '@/shared/components/Combobox'
import { cn } from '@/shared/lib/utils'

interface ParticipantEditorProps {
  participants: string[]
  knownNames: string[]
  onChange: (names: string[]) => void
}

export function ParticipantEditor({ participants, knownNames, onChange }: ParticipantEditorProps) {
  const [draft, setDraft] = React.useState('')

  const suggestions = knownNames.filter(
    (n) => !participants.some((p) => p.toLowerCase() === n.toLowerCase()),
  )

  function add(raw: string) {
    const name = raw.trim()
    if (!name) return
    if (!participants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      onChange([...participants, name])
    }
    setDraft('')
  }

  function remove(name: string) {
    onChange(participants.filter((p) => p !== name))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Combobox
          value={draft}
          onValueChange={setDraft}
          onSelect={add}
          suggestions={suggestions}
          placeholder="Add a name…"
          aria-label="Add a name"
        />
        <Button type="button" size="icon" variant="secondary" onClick={() => add(draft)} aria-label="Add name">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {participants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {participants.map((name) => (
            <Badge key={name} variant="secondary" className={cn('gap-1 py-1 pl-3 pr-1.5 text-sm font-medium')}>
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="rounded-full p-0.5 hover:bg-background/60"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No one added yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build` — Expected: PASS.

- [ ] **Step 3: Verify in browser**

Open a Nomnom, focus "Add a name". Expected: a styled dropdown appears **directly below** the input listing common names; typing filters; a brand-new name shows an "Add ‘…’" row; Enter and click both add a chip. Screenshot the open dropdown.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(split): replace datalist with styled Combobox in ParticipantEditor"
```

---

### Task 6: Remember frequent names (3+ Nomnoms)

Pure frequency logic + one-time persisted promotion into `knownNames`, tracked so removals never re-add.

**Files:**
- Create: `src/apps/split/lib/names.ts`
- Test: `src/apps/split/lib/names.test.ts`
- Modify: `src/apps/split/store/useSplitStore.ts` (add `promotedNames`, `promoteFrequentNames`, call it from `setParticipants` and `addNight`; persist `promotedNames`)

**Interfaces:**
- Produces:

```ts
// names.ts
import type { Night } from '@/apps/split/types'
/** Names appearing as a participant in MORE THAN `threshold` distinct nights
 *  (case-insensitive), in first-seen display casing. */
export function frequentNames(nights: Night[], threshold?: number): string[]
```
- Store gains: `promotedNames: string[]`, `promoteFrequentNames(): void`.

- [ ] **Step 1: Write the failing frequency test**

```ts
// src/apps/split/lib/names.test.ts
import { describe, expect, it } from 'vitest'
import { frequentNames } from './names'
import type { Night } from '@/apps/split/types'

function night(participants: string[]): Night {
  return { id: Math.random().toString(), date: '', status: 'active', participants, items: [] }
}

describe('frequentNames', () => {
  it('returns names in more than 2 distinct nights by default', () => {
    const nights = [night(['Anna', 'Bob']), night(['Anna', 'Cara']), night(['Anna', 'Bob'])]
    expect(frequentNames(nights)).toEqual(['Anna']) // Anna in 3, Bob in 2
  })
  it('is case-insensitive but keeps first-seen casing', () => {
    const nights = [night(['anna']), night(['Anna']), night(['ANNA'])]
    expect(frequentNames(nights)).toEqual(['anna'])
  })
  it('counts distinct nights, not repeats within one night', () => {
    const nights = [night(['Anna', 'Anna', 'Anna'])]
    expect(frequentNames(nights)).toEqual([])
  })
  it('respects a custom threshold', () => {
    const nights = [night(['Bob']), night(['Bob'])]
    expect(frequentNames(nights, 1)).toEqual(['Bob']) // >1 distinct night
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- names` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement frequentNames**

```ts
// src/apps/split/lib/names.ts
import type { Night } from '@/apps/split/types'

export function frequentNames(nights: Night[], threshold = 2): string[] {
  const display = new Map<string, string>() // lowercase -> first-seen casing
  const counts = new Map<string, number>()
  for (const night of nights) {
    const seen = new Set<string>()
    for (const p of night.participants) {
      const key = p.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      if (!display.has(key)) display.set(key, p.trim())
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const out: string[] = []
  for (const [key, count] of counts) {
    if (count > threshold) out.push(display.get(key)!)
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- names` — Expected: PASS.

- [ ] **Step 5: Wire promotion into the store**

In `useSplitStore.ts`:
1. Add `promotedNames: string[]` to `AppState` and initialize `promotedNames: []`.
2. Add the action:

```ts
promoteFrequentNames() {
  set((s) => {
    const frequent = frequentNames(s.nights) // threshold 2 -> 3+ nights
    const knownLower = new Set(s.knownNames.map((n) => n.toLowerCase()))
    const promotedLower = new Set(s.promotedNames.map((n) => n.toLowerCase()))
    const toAdd = frequent.filter(
      (n) => !knownLower.has(n.toLowerCase()) && !promotedLower.has(n.toLowerCase()),
    )
    if (toAdd.length === 0) return s
    return {
      knownNames: [...s.knownNames, ...toAdd].sort((a, b) => a.localeCompare(b)),
      promotedNames: [...s.promotedNames, ...toAdd],
    }
  })
},
```

3. Import `frequentNames` at the top: `import { frequentNames } from '@/apps/split/lib/names'`.
4. Call `get().promoteFrequentNames()` at the end of `setParticipants` and `addNight` (after the `set(...)`).
5. Add `promoteFrequentNames(): void` to the `AppState` interface.
6. Extend `partialize` to persist `promotedNames`: `partialize: (s) => ({ knownNames: s.knownNames, nights: s.nights, promotedNames: s.promotedNames })`.

- [ ] **Step 6: Write the store promotion test**

```ts
// append to src/apps/split/lib/names.test.ts is NOT enough — store test:
// src/apps/split/store/useSplitStore.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useSplitStore } from './useSplitStore'

beforeEach(() => {
  useSplitStore.setState({ nights: [], knownNames: [], promotedNames: [] })
})

describe('promoteFrequentNames', () => {
  it('promotes a name after it appears in 3 nights and keeps it removable', () => {
    const s = useSplitStore.getState()
    const ids = [s.addNight(), s.addNight(), s.addNight()]
    ids.forEach((id) => useSplitStore.getState().setParticipants(id, ['Anna']))
    expect(useSplitStore.getState().knownNames).toContain('Anna')

    useSplitStore.getState().removeKnownName('Anna')
    useSplitStore.getState().promoteFrequentNames()
    expect(useSplitStore.getState().knownNames).not.toContain('Anna') // not re-added
  })
})
```

- [ ] **Step 7: Run tests**

Run: `npm test` — Expected: PASS (all green, new store + names tests included).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(split): auto-remember names used in 3+ Nomnoms"
```

---

### Task 7: Deferred creation — New Nomnom page

Stop creating on button tap. Add a `/split/new` form that only commits on **Create**; back discards.

**Files:**
- Create: `src/apps/split/pages/NewNomnom.tsx`
- Modify: `src/apps/split/routes.tsx` (add route), `src/apps/split/pages/SplitHome.tsx` (button navigates to `/split/new`, no store write), `src/apps/split/store/useSplitStore.ts` (confirm `addNight({ title, participants })` is used)

**Interfaces:**
- Consumes: `useSplitStore().addNight`, `ParticipantEditor`.

- [ ] **Step 1: SplitHome button navigates instead of creating**

In `SplitHome.tsx`, delete `createNight` (and the `addNight` selector). Change the bottom button `onClick` to `() => navigate('/split/new')`. Keep the label "New Nomnom".

- [ ] **Step 2: Create the NewNomnom page**

```tsx
// src/apps/split/pages/NewNomnom.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { ParticipantEditor } from '@/apps/split/components/ParticipantEditor'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { toast } from 'sonner'

export function NewNomnom() {
  const navigate = useNavigate()
  const addNight = useSplitStore((s) => s.addNight)
  const knownNames = useSplitStore((s) => s.knownNames)

  const [title, setTitle] = useState('')
  const [participants, setParticipants] = useState<string[]>([])

  const canCreate = title.trim().length > 0 || participants.length > 0

  function create() {
    if (!canCreate) return
    const id = addNight({ title: title.trim() || undefined, participants })
    toast.success('Nomnom created')
    navigate(`/split/night/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <PageHeader title="New Nomnom" backTo="/split" />

      <div className="mb-5 space-y-1.5">
        <Label htmlFor="new-title">Nomnom name (optional)</Label>
        <Input
          id="new-title"
          value={title}
          placeholder="e.g. Sat night out — or leave blank for today's date"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">People</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantEditor participants={participants} knownNames={knownNames} onChange={setParticipants} />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="w-full" onClick={create} disabled={!canCreate}>
            <Check className="h-5 w-5" />
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add the route**

In `src/apps/split/routes.tsx`, import `NewNomnom` and add `<Route path="/split/new" element={<NewNomnom />} />` before the `:id` route.

- [ ] **Step 4: Verify build**

Run: `npm run build` — Expected: PASS.

- [ ] **Step 5: Verify the flow in the browser**

From Split home tap "New Nomnom" → lands on `/split/new`, Create disabled. Press browser back → return to `/split`, **no** Nomnom created (list unchanged). Re-open, add a person → Create enables → tap → lands on the new Nomnom detail; the Nomnom now exists with that person. Screenshot the empty form (Create disabled).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(split): create Nomnoms via a dedicated form, discard on back"
```

---

### Task 8: Custom palette engine (logic)

Derive the full 19-token set from 6 base colors; extend the theme module to apply/persist a `custom` palette via inline CSS variables.

**Files:**
- Create: `src/shared/lib/palette.ts`
- Test: `src/shared/lib/palette.test.ts`
- Modify: `src/shared/lib/theme.ts` (add `'custom'` palette, `CustomColors`, inline-var apply/clear, persistence)

**Interfaces:**
- Produces:

```ts
// palette.ts
export interface CustomColors {
  background: string; foreground: string; primary: string
  accent: string; destructive: string; success: string
}
export const TOKEN_NAMES: string[] // the 19 CSS var names (without `--`)
export function hexToHslToken(hex: string): string       // "#ad8b73" -> "25 26% 56%"
export function deriveTokens(c: CustomColors): Record<string, string> // 19 entries
```
- theme.ts: `Palette` union gains `'custom'`; `ThemeChoice` gains `custom?: CustomColors`; `applyTheme` handles custom.

- [ ] **Step 1: Write the failing palette tests**

```ts
// src/shared/lib/palette.test.ts
import { describe, expect, it } from 'vitest'
import { deriveTokens, hexToHslToken, TOKEN_NAMES, type CustomColors } from './palette'

const sample: CustomColors = {
  background: '#fffbe9', foreground: '#2b2013', primary: '#ad8b73',
  accent: '#e3caa5', destructive: '#c0392b', success: '#3f8f5b',
}

describe('hexToHslToken', () => {
  it('converts hex to an "H S% L%" token', () => {
    expect(hexToHslToken('#ffffff')).toBe('0 0% 100%')
    expect(hexToHslToken('#000000')).toBe('0 0% 0%')
  })
  it('accepts hex without a leading #', () => {
    expect(hexToHslToken('ffffff')).toBe('0 0% 100%')
  })
})

describe('deriveTokens', () => {
  it('produces a value for every one of the 19 tokens', () => {
    const tokens = deriveTokens(sample)
    for (const name of TOKEN_NAMES) expect(tokens[name]).toMatch(/^\d+ \d+% \d+%$/)
    expect(Object.keys(tokens).sort()).toEqual([...TOKEN_NAMES].sort())
  })
  it('maps the six base colors straight through', () => {
    const tokens = deriveTokens(sample)
    expect(tokens.background).toBe(hexToHslToken(sample.background))
    expect(tokens.primary).toBe(hexToHslToken(sample.primary))
    expect(tokens.destructive).toBe(hexToHslToken(sample.destructive))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- palette` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement palette.ts**

```ts
// src/shared/lib/palette.ts
export interface CustomColors {
  background: string
  foreground: string
  primary: string
  accent: string
  destructive: string
  success: string
}

export const TOKEN_NAMES = [
  'background', 'foreground', 'card', 'card-foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive', 'destructive-foreground', 'success', 'success-foreground', 'border', 'input', 'ring',
]

interface Hsl { h: number; s: number; l: number }

function hexToHsl(hex: string): Hsl {
  const clean = hex.replace('#', '').trim()
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  let s = 0
  let h = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function token({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`
}

export function hexToHslToken(hex: string): string {
  return token(hexToHsl(hex))
}

function clampL(hsl: Hsl, delta: number): Hsl {
  return { ...hsl, l: Math.min(100, Math.max(0, hsl.l + delta)) }
}

/** Pick black or white text (as a token) for readability on a background color. */
function readableOn(bg: Hsl): string {
  return bg.l >= 60 ? '0 0% 12%' : '0 0% 100%'
}

export function deriveTokens(c: CustomColors): Record<string, string> {
  const bg = hexToHsl(c.background)
  const fg = hexToHsl(c.foreground)
  const primary = hexToHsl(c.primary)
  const accent = hexToHsl(c.accent)
  const destructive = hexToHsl(c.destructive)
  const success = hexToHsl(c.success)
  const isLight = bg.l >= 50

  const surfaceStep = isLight ? -6 : 8
  const secondary = clampL({ ...bg, s: Math.min(bg.s + 4, 100) }, surfaceStep)
  const border = clampL(bg, isLight ? -12 : 14)
  const muted = secondary
  const mutedFg = clampL(fg, isLight ? 30 : -28)

  return {
    background: token(bg),
    foreground: token(fg),
    card: token(clampL(bg, isLight ? 2 : 4)),
    'card-foreground': token(fg),
    primary: token(primary),
    'primary-foreground': readableOn(primary),
    secondary: token(secondary),
    'secondary-foreground': token(fg),
    muted: token(muted),
    'muted-foreground': token(mutedFg),
    accent: token(accent),
    'accent-foreground': readableOn(accent),
    destructive: token(destructive),
    'destructive-foreground': readableOn(destructive),
    success: token(success),
    'success-foreground': readableOn(success),
    border: token(border),
    input: token(border),
    ring: token(primary),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- palette` — Expected: PASS.

- [ ] **Step 5: Extend theme.ts for the custom palette**

Modify `src/shared/lib/theme.ts`:
1. Import: `import { deriveTokens, TOKEN_NAMES, type CustomColors } from '@/shared/lib/palette'`.
2. `export type Palette = 'default' | 'coffee' | 'custom'`.
3. Add to `PALETTES`: `{ value: 'custom', label: 'Custom' }`.
4. `ThemeChoice` gains `custom?: CustomColors`.
5. `getStoredTheme`: parse and pass through `custom` when `palette === 'custom'`.
6. Rewrite `applyTheme`:

```ts
const DEFAULT_CUSTOM: CustomColors = {
  background: '#0f1117', foreground: '#f2f3f7', primary: '#6d5efc',
  accent: '#241f3a', destructive: '#e5484d', success: '#30a46c',
}

export function applyTheme(choice: ThemeChoice): void {
  const el = document.documentElement
  // Always clear any previously-applied inline custom vars first.
  for (const name of TOKEN_NAMES) el.style.removeProperty(`--${name}`)

  if (choice.palette === 'custom') {
    const tokens = deriveTokens(choice.custom ?? DEFAULT_CUSTOM)
    for (const [name, value] of Object.entries(tokens)) el.style.setProperty(`--${name}`, value)
    el.dataset.theme = 'custom'
    el.classList.remove('dark') // custom is a single fixed set; mode is ignored
  } else {
    el.dataset.theme = dataThemeFor(choice)
    el.classList.toggle('dark', choice.mode === 'dark')
  }
  localStorage.setItem(THEME_KEY, JSON.stringify(choice))
}
```

7. Export `DEFAULT_CUSTOM` for the UI in Task 9.

- [ ] **Step 6: Add the custom placeholder block to index.css**

In `src/index.css`, inside the `@layer base` token area, add a minimal block so `[data-theme='custom']` is a valid selector even before inline vars load (inherits from `:root`):

```css
  /* ---- Custom palette · values injected at runtime (see shared/lib/theme.ts) - */
  [data-theme='custom'] {
    --radius: 0.85rem;
  }
```

- [ ] **Step 7: Verify build + tests**

Run: `npm run build` — Expected: PASS.
Run: `npm test` — Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(theme): derive a 19-token custom palette from 6 colors"
```

---

### Task 9: Custom palette UI + Settings reorg

Guided modal with six labeled color pickers + live preview, advanced JSON import/export, wired into the global Settings Appearance card. Also move Common names out of global Settings into Split.

**Files:**
- Create: `src/settings/CustomPaletteDialog.tsx`
- Create: `src/apps/split/pages/SplitNames.tsx` (Common names, moved from Settings)
- Modify: `src/settings/Settings.tsx` (remove Common names card; add Customize button + hide mode toggle when custom), `src/apps/split/routes.tsx` (+ `/split/names`), `src/apps/split/pages/SplitHome.tsx` (header link to `/split/names`)

**Interfaces:**
- Consumes: `applyTheme`, `getStoredTheme`, `DEFAULT_CUSTOM`, `CustomColors`.

- [ ] **Step 1: Create the CustomPaletteDialog**

```tsx
// src/settings/CustomPaletteDialog.tsx
import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import type { CustomColors } from '@/shared/lib/palette'

const FIELDS: { key: keyof CustomColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'The main screen color behind everything' },
  { key: 'foreground', label: 'Text', hint: 'The main text color' },
  { key: 'primary', label: 'Buttons & highlights', hint: 'Primary buttons and active accents' },
  { key: 'accent', label: 'Accents', hint: 'Selected rows and soft highlights' },
  { key: 'destructive', label: 'Owed / Delete', hint: 'Money owed, delete, warnings (usually red)' },
  { key: 'success', label: 'Settled / Paid', hint: 'Settled and positive actions (usually green)' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: CustomColors
  onSave: (colors: CustomColors) => void
}

export function CustomPaletteDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [colors, setColors] = useState<CustomColors>(initial)

  function set(key: keyof CustomColors, value: string) {
    setColors((c) => ({ ...c, [key]: value }))
  }

  function exportPalette() {
    const blob = new Blob([JSON.stringify({ name: 'Custom', colors }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'palette.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importPalette(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const c = parsed?.colors ?? parsed
      const next: CustomColors = {
        background: c.background, foreground: c.foreground, primary: c.primary,
        accent: c.accent, destructive: c.destructive, success: c.success,
      }
      if (Object.values(next).every((v) => /^#?[0-9a-fA-F]{6}$/.test(String(v)))) {
        setColors(next)
      }
    } catch { /* ignore malformed palette files */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize colors</DialogTitle>
          <DialogDescription>Pick a color for each part of the app.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="block">{f.label}</Label>
                <p className="truncate text-xs text-muted-foreground">{f.hint}</p>
              </div>
              <input
                type="color"
                value={colors[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                aria-label={f.label}
                className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              />
            </div>
          ))}
        </div>

        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Advanced: import / export palette file</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exportPalette}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
              <Upload className="h-4 w-4" /> Import
              <input
                type="file" accept="application/json,.json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importPalette(f); e.target.value = '' }}
              />
            </label>
          </div>
        </details>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(colors); onOpenChange(false) }}>Apply colors</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire the dialog into Settings + conditionally hide the mode toggle**

In `src/settings/Settings.tsx`:
1. Import `CustomPaletteDialog`, `DEFAULT_CUSTOM`, `type CustomColors`.
2. Add state: `const [customOpen, setCustomOpen] = useState(false)`.
3. When `theme.palette === 'custom'`, hide the Mode toggle block (custom is mode-agnostic) and show a **Customize colors** button:

```tsx
{theme.palette === 'custom' ? (
  <Button variant="outline" className="w-full" onClick={() => setCustomOpen(true)}>
    Customize colors
  </Button>
) : (
  /* existing Mode toggle block */
)}
```
4. Render the dialog:

```tsx
<CustomPaletteDialog
  open={customOpen}
  onOpenChange={setCustomOpen}
  initial={theme.custom ?? DEFAULT_CUSTOM}
  onSave={(custom) => updateTheme({ ...theme, palette: 'custom', custom })}
/>
```
5. Ensure selecting the `custom` palette from the `Select` sets a default when none exists: in `selectPalette`, if `palette === 'custom'` and `!theme.custom`, call `updateTheme({ ...theme, palette, custom: DEFAULT_CUSTOM })`.

- [ ] **Step 3: Move Common names into Split**

1. Create `src/apps/split/pages/SplitNames.tsx` containing the current "Common names" card from `Settings.tsx` (the `knownNames` add/remove UI), wrapped in a page with `PageHeader title="Common names" backTo="/split"`. Use `useSplitStore` for `knownNames`, `addKnownName`, `removeKnownName`. Reuse the `Combobox`? No — this is a plain add field; keep the existing Input+Plus pattern.
2. Remove the entire "Common names" `<Card>` (and its `draft`/`addName`/`knownNames` selectors) from `settings/Settings.tsx`.
3. Add route `<Route path="/split/names" element={<SplitNames />} />` in `routes.tsx`.
4. In `SplitHome.tsx`, add a header `HeaderIconLink` to `/split/names` with a `UsersRound` icon (label "Common names").

- [ ] **Step 4: Verify build**

Run: `npm run build` — Expected: PASS.

- [ ] **Step 5: Verify in browser**

Settings → Palette → **Custom**: Mode toggle disappears, "Customize colors" appears. Open it → six labeled pickers + preview; changing a color and "Apply colors" reskins the app live. Switch palette back to Default → mode toggle returns and the custom inline vars are cleared. Split home → Common names link opens `/split/names`; add/remove works. Screenshot the Custom modal.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(theme): guided custom palette modal; move Common names into Split"
```

---

### Task 10: App-aware backup v2

Backup becomes `{ version:2, apps:{ split }, appearance }`, includes theme, and still imports v1 files. Move backup logic out of `shared/lib/storage.ts` into `settings/backup.ts` (shell concern) and keep only generic file helpers in shared.

**Files:**
- Create: `src/settings/backup.ts`
- Test: `src/settings/backup.test.ts`
- Create: `src/shared/lib/file.ts` (generic `readFileAsText`, `downloadJson`)
- Modify: `src/apps/split/types.ts` (export `customColorsSchema`? no — keep in palette; add `backupSchemaV1`/`V2` here or in backup.ts), `src/settings/Settings.tsx` (use new backup fns), delete `src/shared/lib/storage.ts` (fold `STORAGE_KEY` into the store)
- Modify: `src/apps/split/store/useSplitStore.ts` (define `STORAGE_KEY = 'bill-splitter-store'` locally; export it; drop `exportData`/`importData` in favor of direct getters/setters used by backup)

**Interfaces:**
- Produces:

```ts
// settings/backup.ts
export interface BackupV2 { /* see schema below */ }
export function buildBackup(): BackupV2
export function applyBackup(b: BackupV2): void
export function parseBackup(text: string): { ok: true; data: BackupV2 } | { ok: false; error: string }
```

- [ ] **Step 1: Move generic file helpers to shared/lib/file.ts**

```ts
// src/shared/lib/file.ts
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsText(file)
  })
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Give the store a local STORAGE_KEY and simple getters/setters**

In `useSplitStore.ts`: replace `import { STORAGE_KEY } from '@/lib/storage'` with a local `export const STORAGE_KEY = 'bill-splitter-store'`. Remove `exportData`/`importData` from the store (backup handles serialization). Keep everything else.

- [ ] **Step 3: Write the failing backup tests**

```ts
// src/settings/backup.test.ts
import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'

const v2 = {
  version: 2,
  apps: { split: { knownNames: ['Anna'], nights: [], promotedNames: [] } },
  appearance: { palette: 'coffee', mode: 'light' },
}
const v1 = { version: 1, knownNames: ['Bob'], nights: [] }

describe('parseBackup', () => {
  it('accepts a v2 file', () => {
    const r = parseBackup(JSON.stringify(v2))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.apps.split.knownNames).toEqual(['Anna'])
  })
  it('migrates a v1 file into the v2 shape', () => {
    const r = parseBackup(JSON.stringify(v1))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.version).toBe(2)
      expect(r.data.apps.split.knownNames).toEqual(['Bob'])
      expect(r.data.apps.split.promotedNames).toEqual([])
    }
  })
  it('rejects non-JSON', () => {
    expect(parseBackup('not json').ok).toBe(false)
  })
  it('rejects a foreign object', () => {
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- backup` — Expected: FAIL (module not found).

- [ ] **Step 5: Implement settings/backup.ts**

```ts
// src/settings/backup.ts
import { z } from 'zod'
import { nightSchema } from '@/apps/split/types'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { getStoredTheme, applyTheme } from '@/shared/lib/theme'

const customColorsSchema = z.object({
  background: z.string(), foreground: z.string(), primary: z.string(),
  accent: z.string(), destructive: z.string(), success: z.string(),
})

const splitDataSchema = z.object({
  knownNames: z.array(z.string()),
  nights: z.array(nightSchema),
  promotedNames: z.array(z.string()).default([]),
})

const appearanceSchema = z.object({
  palette: z.enum(['default', 'coffee', 'custom']),
  mode: z.enum(['light', 'dark']),
  custom: customColorsSchema.optional(),
})

const backupV2Schema = z.object({
  version: z.literal(2),
  apps: z.object({ split: splitDataSchema }),
  appearance: appearanceSchema.optional(),
})
export type BackupV2 = z.infer<typeof backupV2Schema>

const backupV1Schema = z.object({
  version: z.literal(1),
  knownNames: z.array(z.string()),
  nights: z.array(nightSchema),
})

export function buildBackup(): BackupV2 {
  const { knownNames, nights, promotedNames } = useSplitStore.getState()
  const { palette, mode, custom } = getStoredTheme()
  return {
    version: 2,
    apps: { split: { knownNames, nights, promotedNames } },
    appearance: { palette, mode, custom },
  }
}

export function applyBackup(b: BackupV2): void {
  useSplitStore.setState({
    knownNames: b.apps.split.knownNames,
    nights: b.apps.split.nights,
    promotedNames: b.apps.split.promotedNames,
  })
  if (b.appearance) applyTheme(b.appearance)
}

export type ParseResult = { ok: true; data: BackupV2 } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  const v2 = backupV2Schema.safeParse(json)
  if (v2.success) return { ok: true, data: v2.data }

  const v1 = backupV1Schema.safeParse(json)
  if (v1.success) {
    return {
      ok: true,
      data: {
        version: 2,
        apps: { split: { knownNames: v1.data.knownNames, nights: v1.data.nights, promotedNames: [] } },
      },
    }
  }
  return { ok: false, error: 'This file is not a valid Split backup.' }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- backup` — Expected: PASS.

- [ ] **Step 7: Rewire Settings backup buttons + delete old storage.ts**

In `settings/Settings.tsx`: replace `downloadBackup/parseBackup/readFileAsText` imports and calls with:
- Export: `downloadJson(\`split-backup-${new Date().toISOString().slice(0,10)}.json\`, buildBackup())`
- Import: `readFileAsText` from `@/shared/lib/file`, then `parseBackup` from `@/settings/backup`, then `applyBackup(result.data)`.

Delete `src/shared/lib/storage.ts`. Fix any remaining `@/shared/lib/storage` imports (there should be none after the store defines `STORAGE_KEY`).

- [ ] **Step 8: Verify build + tests + round-trip**

Run: `npm run build` — Expected: PASS.
Run: `npm test` — Expected: PASS.
In the browser: create a Nomnom, set palette to Coffee, Export → open the JSON and confirm `version:2`, `apps.split`, `appearance`. Clear data, Import the file → nights and Coffee theme both restored. Screenshot restored state.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(settings): app-aware backup v2 incl. appearance, v1 migration"
```

---

### Task 11: PWA identity (palette-agnostic)

Neutral install identity that won't clash with any palette.

**Files:**
- Modify: `scripts/generate-icons.mjs` (BRAND color → neutral slate), regenerate `public/icons/*` + `public/apple-touch-icon.png`
- Modify: `vite.config.ts` manifest (`name`, `short_name`, `theme_color`, keep `start_url`/`scope` `/`)

**Interfaces:** none.

- [ ] **Step 1: Recolor the icon generator**

In `scripts/generate-icons.mjs`, change `const BRAND = [0x6d, 0x5e, 0xfc]` to neutral slate `const BRAND = [0x47, 0x53, 0x69]` (#475369). Leave geometry as-is.

- [ ] **Step 2: Regenerate icons**

Run: `node scripts/generate-icons.mjs` — Expected: writes 4 PNGs.

- [ ] **Step 3: Update the manifest**

In `vite.config.ts` `manifest`: set `name: 'Split'`, `short_name: 'Split'`, `theme_color: '#0f1117'` (neutral dark; matches default-dark background), keep `background_color`, `display`, `start_url: '/'`, `scope: '/'`.

- [ ] **Step 4: Verify build + manifest**

Run: `npm run build` — Expected: PASS; PWA plugin regenerates `manifest.webmanifest`. Confirm `dist/manifest.webmanifest` shows the new name + `theme_color`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore(pwa): palette-agnostic install identity (neutral icon + theme_color)"
```

---

### Task 12: Docs + final verification

**Files:**
- Modify: `bill-splitter/README.md` (new structure, launcher, custom palette, Nomnom), `D:\study\CLAUDE.md` (Split row description if needed)
- Create: `bill-splitter/docs/superpowers/specs/2026-08-11-nomnom-launcher-design.md` (record the grilling outcome table from this plan's Design summary)

- [ ] **Step 1: Update README**

Document: the `apps/ + shared/ + launcher/ + settings/` layout; the launcher + registry (how to add an app); "Nomnom" wording; the deferred-creation flow; the custom-palette modal; backup v2. Keep the existing "Changing the colors" section and add the Custom palette paragraph.

- [ ] **Step 2: Write the design record**

Save the Design summary table (from the top of this plan) to the spec path above so the decision history lives with the repo.

- [ ] **Step 3: Full verification pass**

Run: `npm test` — Expected: PASS (all suites).
Run: `npm run build` — Expected: PASS.
Browser walkthrough (screenshot each): launcher grid → Split → New Nomnom (Create disabled → add person → Create) → add item with combobox names → balances → Settings custom palette apply → export/import round-trip. Confirm no console errors via read_console_messages.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: update README + record Nomnom/launcher design"
```

---

## Self-Review

**Spec coverage:**
- Rename → Task 2. Deferred creation → Task 7. Combobox → Tasks 4–5. Frequency remembering → Task 6. Launcher/registry → Task 3. Reuse/structure → Task 1. Custom palette (logic+UI) → Tasks 8–9. Global settings split → Task 9. Backup v2 → Task 10. PWA identity → Task 11. Docs → Task 12. All eight design rows covered.

**Placeholder scan:** No TBD/TODO; every code step has concrete code; refactor steps list exact files and replacements.

**Type consistency:** `useSplitStore` (Task 1) used consistently thereafter. `CustomColors`/`deriveTokens`/`TOKEN_NAMES` defined in Task 8, consumed in Tasks 9–10. `frequentNames`/`promoteFrequentNames` defined + consumed in Task 6. `buildBackup`/`applyBackup`/`parseBackup` defined in Task 10, consumed in Settings same task. `AppEntry`/`apps` defined + consumed in Task 3. `STORAGE_KEY` relocated in Task 10 with all importers updated.

**Known risk:** Task 1 is a large mechanical move; its verification (build + 14 tests + screenshot) is the gate. If `bg-popover` token is undefined, Task 4 Step 5 note gives the `bg-card` fallback.
