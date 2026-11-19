# Pump "New" mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Songs added in the latest PHOENIX 2 patch get a gold border and a NEW tag on grid tiles and list rows, and a "New in v1.02.0" line in the chart sheet; shipped with the v1.02 data update.

**Architecture:** The data build compares pumpout's live songs at `PUMPOUT.version` with the version just before it and writes `n: 1` on new songs in `charts.json`. The app decodes that into `Song.isNew`. A new `--new` colour token (all themes plus the custom palette) styles a shared `NewPill` and the tile and row marks.

**Tech Stack:** Node + sql.js build scripts, Vite + React + TypeScript, Tailwind 3.4 with HSL CSS tokens, zod, Vitest.

**Spec:** `docs/features/2026-11-pump-new-songs/spec.md`

## Global Constraints

- New = playable in `PUMPOUT.version` and not playable in the version just before it (its nearest ancestor). No hand-maintained list.
- The mark belongs to the song; every chart of a new song is marked. New charts of older songs are not.
- The word **NEW** is always shown with the colour, never colour alone.
- `--new` is never purple. Contrast: `--new` vs `--card` ≥ 3:1; `--new-foreground` vs `--new` ≥ 4.5:1, in light, dark, coffee, coffee-dark and the derived custom palette.
- Light-type themes: `--new: 36 90% 33%`, `--new-foreground: 0 0% 100%`. Dark-type themes: `--new: 40 92% 58%`, `--new-foreground: 30 60% 8%`. (Adjust only if a contrast test fails.)
- The tile stays 148 px tall (`GRID_ROW_HEIGHT` 156 unchanged); the row stays 64 px.
- `charts.json` stays ≤ 600 KB.

## Review Focus

- A version with no ancestor (first patch of the db) — expect no song marked, not every song.
- A song removed in an earlier patch and revived in this one — expect it marked (spec decision 3).
- A long new-song title in a list row — the title truncates and the NEW pill stays whole.
- The custom palette with a mid-grey background — `--new` still meets both contrast targets.
- A new song's chart opened from a sibling chip in the sheet — the sheet shows the New line for the picked chart.

---

### Task 1: Commit the v1.02 data update

**Files:**
- Modify (already changed): `scripts/piu-data/sources.mjs`, `src/apps/pump/data/charts.json`

- [ ] **Step 1:** `npx vitest run` → 523 passed.
- [ ] **Step 2: Commit** `feat(pump): PHOENIX 2 v1.02 data (6 new songs, R!SE Vol.1 charts)` with the two files.

### Task 2: The build marks new songs

**Files:**
- Modify: `scripts/piu-data/pumpout.mjs` (`readPumpout`, `readSongs`)
- Test: `scripts/piu-data/pumpout.test.mjs`

**Interfaces:**
- Produces: each value of `readPumpout(db, { version, prevVersion }).songs` gains `isNew: boolean`.

- [ ] **Step 1: Write the failing tests** in `describe('readPumpout')`, using the existing fixture (versions 1 → 2 → 3; song 12 inserted at 3, song 13 crossed in at 2, song 10 from 1):

```js
it('marks a song new when it is live in the version but not in the one before it', () => {
  expect(read.songs.get(12).isNew).toBe(true)   // read = version 3
  expect(read.songs.get(10).isNew).toBe(false)
  expect(read.songs.get(13).isNew).toBe(false)
})
it('takes the nearest ancestor as the version before', () => {
  const v2 = readPumpout(db, { version: 2, prevVersion: 1 })
  expect(v2.songs.get(13).isNew).toBe(true)
  expect(v2.songs.get(10).isNew).toBe(false)
})
it('marks nothing new in a version with no ancestor', () => {
  const v1 = readPumpout(db, { version: 1, prevVersion: 1 })
  expect([...v1.songs.values()].some((s) => s.isNew)).toBe(false)
})
it('marks a song revived in this version as new', () => {
  // add to a fresh fixture db: song 14 inserted at 1, deleted at 2, revived (op 5) at 3, with one live S chart
  expect(revived.songs.get(14).isNew).toBe(true)
})
```

- [ ] **Step 2:** `npx vitest run scripts/piu-data/pumpout.test.mjs` → the four new tests FAIL (`isNew` undefined).
- [ ] **Step 3: Implement.** Add `PARENT_SQL` (`SELECT ancestorId FROM _derived_versionAncestor WHERE versionId = :v AND ancestorId <> :v ORDER BY ancestorSortOrder DESC LIMIT 1`) and `LIVE_SONGS_SQL` (the `sv`/`live_songs` CTE of `STATE_SQL`, selecting `songId`; share the CTE text rather than copying it). In `readPumpout`, build `wasLive: Set<number> | null` (null when there is no parent) and pass it to `readSongs`; each song gets `isNew: wasLive !== null && !wasLive.has(id)`.
- [ ] **Step 4:** Same command → all pass.
- [ ] **Step 5: Commit** `feat(pump): data build marks songs new in the patch`.

### Task 3: `n` in charts.json, `Song.isNew`, report line, regenerate

**Files:**
- Modify: `scripts/piu-data/encode.mjs`, `scripts/piu-data/report.mjs`, `src/apps/pump/data/schema.ts`, `src/apps/pump/data/types.ts`, `src/apps/pump/data/catalog.ts`, `src/apps/pump/lib/__fixtures__/charts.ts`, `src/apps/pump/data/charts.json` (regenerated)
- Test: `scripts/piu-data/encode.test.mjs`, `scripts/piu-data/report.test.mjs`, `src/apps/pump/data/catalog.test.ts`

**Interfaces:**
- Consumes: `song.isNew` from Task 2.
- Produces: song entry `n?: 1` (schema `z.literal(1).optional()`); `Song.isNew: boolean` (decoded `s.n === 1`); `makeSong()` defaults `isNew: false`.

- [ ] **Step 1: Write the failing tests:**
  - encode: `it('writes n: 1 on a new song and leaves it out otherwise')` → new song entry has `n: 1`; the existing "keeps optional song fields out when empty" song has no `n` key.
  - report: `it('lists the new songs')` → `renderReport` output contains `New songs (1): Bee` when `file.songs = [{ t: 'Bee', n: 1 }, { t: 'Conflict' }]`, and `New songs (0): —` when none.
  - catalog (committed data): `it('marks the six PHOENIX 2 v1.02.0 songs new')` → titles of songs with `isNew` sorted equal `['Assault TAXI', 'Falling Stars', 'Mephitz', 'NEMONEMO', 'PHYSALIS', 'Until Defined']`; and every chart of those songs has `song.isNew`.
- [ ] **Step 2:** `npx vitest run scripts/piu-data src/apps/pump/data` → the new tests FAIL.
- [ ] **Step 3: Implement** the encoder line (`if (s.isNew) out.n = 1`, after `i`), schema field, `Song.isNew` (doc comment: "first playable in this data's patch"), decoder, fixture default, and the report line under the Changes heading: `` `New songs (${k}): ${names.join(', ') || '—'}` ``.
- [ ] **Step 4:** `npm run piu:data` → report shows `New songs (6): NEMONEMO, Mephitz, Falling Stars, Until Defined, PHYSALIS, Assault TAXI`, no failed checks; `git diff --stat src/apps/pump/data/charts.json` shows only the 6 song lines and the meta line changing.
- [ ] **Step 5:** `npx vitest run` → all pass. `npx tsc --noEmit` → clean.
- [ ] **Step 6: Commit** `feat(pump): new songs flagged in charts.json`.

### Task 4: `--new` colour token

**Files:**
- Modify: `src/index.css` (each `[data-theme]` block: light, dark, coffee, coffee-dark), `src/shared/lib/palette.ts` (`TOKEN_NAMES`, `deriveTokens`), `tailwind.config.*` (`colors.new`)
- Test: `src/shared/lib/palette.test.ts`; Create: `src/shared/lib/theme-tokens.test.ts`

**Interfaces:**
- Produces: Tailwind classes `border-new`, `ring-new`, `bg-new`, `text-new-foreground` (`new: { DEFAULT: 'hsl(var(--new))', foreground: 'hsl(var(--new-foreground))' }`); `TOKEN_NAMES` has 22 entries.

- [ ] **Step 1: Write the failing tests:**
  - palette.test: rename "every one of the 20 tokens" to 22; `it('derives a gold new token readable on light and dark custom palettes')` → for backgrounds `#fafafa`, `#0f1117` and `#808080`: `contrast(tokens.new, tokens.card) >= 3` and `contrast(tokens['new-foreground'], tokens.new) >= 4.5`, where `contrast` is a WCAG ratio helper over `hslTokenToHex` written in the test file.
  - theme-tokens.test: reads `src/index.css` (`readFileSync`), and for each of `light`, `dark`, `coffee`, `coffee-dark` parses `--card`, `--new`, `--new-foreground` from its block and asserts the same two ratios.
- [ ] **Step 2:** `npx vitest run src/shared/lib` → FAIL.
- [ ] **Step 3: Implement** the four CSS blocks with the Global Constraints values, `deriveTokens` with `isLight` choosing between them (a comment like the warning one: fixed hue so it reads as "new" in any palette), `TOKEN_NAMES` and the palette header comment's count, and the Tailwind colour.
- [ ] **Step 4:** Same command → pass. `npx vitest run` → all pass.
- [ ] **Step 5: Commit** `feat(theme): gold --new token in every palette`.

### Task 5: Tile, row and sheet show the mark

**Files:**
- Create: `src/apps/pump/components/NewPill.tsx`
- Modify: `src/apps/pump/components/ChartTile.tsx`, `src/apps/pump/components/ChartRow.tsx`, `src/apps/pump/components/ChartSheet.tsx`, `src/apps/pump/pages/PumpHome.tsx`, `src/apps/pump/lib/labels.ts`
- Test: `src/apps/pump/lib/labels.test.ts`

**Interfaces:**
- Consumes: `Song.isNew` (Task 3); Tailwind `new` colour (Task 4).
- Produces: `NewPill({ className }: { className?: string })`; `newInLabel(patch: string): string`; `ChartSheet` prop `patch: string` (PumpHome passes `catalog.meta.patch`).

- [ ] **Step 1: Write the failing test:** `it('names the patch a new song arrived in')` → `newInLabel('1.02.0') === 'New in v1.02.0'`.
- [ ] **Step 2:** `npx vitest run src/apps/pump/lib/labels.test.ts` → FAIL.
- [ ] **Step 3: Implement:**
  - `NewPill`: `<span>` with text `NEW`, `rounded-md bg-new px-1.5 py-0.5 text-[11px] font-bold leading-none tracking-wide text-new-foreground`.
  - `ChartTile`: when `chart.song.isNew`, `border-new ring-1 ring-new` instead of `border-border` (ring adds the second pixel without changing size), and `<NewPill className="absolute right-1 top-1" />` on the art.
  - `ChartRow`: every row gets `pl-2.5` so badges line up; a new row adds `<span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-new" />` and a `NewPill` after the title, with the title in a `flex min-w-0 items-center gap-1.5` line where the title `truncate`s and the pill is `shrink-0`.
  - `ChartSheet`: when `c.song.isNew`, a `text-sm` line `newInLabel(patch)` directly before the "Was … in PHOENIX" line.
- [ ] **Step 4:** Test passes; `npx vitest run` all pass; `npx tsc --noEmit` clean; `npm run build` OK.
- [ ] **Step 5: Commit** `feat(pump): gold border and NEW tag on new songs`.

### Task 6: Check it in the browser

- [ ] **Step 1:** `preview_start dev`, viewport 375×812, open `/#/pump?lv=21`.
- [ ] **Step 2:** Grid: Mephitz D21, Assault TAXI S21, NEMONEMO S21 and Until Defined S21/D21 show the gold border and NEW; older tiles unchanged; the grid rows don't shift (tile height 148). Screenshot.
- [ ] **Step 3:** List view: the bar sits left of the badge without touching it, badges line up across rows, the NEW pill stays whole on a long title (search `Until Defined` at 375 px). Screenshot.
- [ ] **Step 4:** Open Mephitz D21: "New in v1.02.0" shows; tap a sibling chart: still shows. Open an older chart: no line.
- [ ] **Step 5:** Repeat Step 2 in light, Coffee and a custom palette (Settings); no console errors.

### Task 7: Docs and explainer

**Files:**
- Modify: `docs/features/2026-11-pump-new-songs/spec.md` (status → built, plus a Verified section), `docs/features/2026-10-piu-chart-filter/spec.md` (v1.01 → v1.02 mentions, sources row commit/file, charts.json shape gains `isNew`/`n`, report gains "New songs"), `scripts/piu-data/README.md` (report lists new songs; the mark moves with each patch), `README.md` (Pump paragraph: new songs marked), `docs/features/2026-11-pump-chart-videos/spec.md` only if a number there must change (it records a v1.01 measurement; leave it).
- Artifacts: "Nook Split, Explained" (Pump section: v1.02 data, New mark, real screenshot) and "Nook Workflow" (Pump feature row), each with a refreshed Synced line.

- [ ] **Step 1:** Update the files above; `grep -rn "1\.01" docs/features/2026-10-piu-chart-filter README.md scripts/piu-data/README.md` → only historical mentions remain.
- [ ] **Step 2: Commit** `docs(pump): v1.02 data and the New mark`.
- [ ] **Step 3:** Read, edit and republish both artifacts.

### Task 8: Pull request

- [ ] **Step 1:** `git push -u origin feature/pump-phoenix2-1.02`.
- [ ] **Step 2:** `gh pr create` with title `Pump: PHOENIX 2 v1.02 data and a New mark on new songs`, body: what, data report numbers, screenshots, tests, phone checks still to do.
