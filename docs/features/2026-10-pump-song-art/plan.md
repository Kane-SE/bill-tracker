# Pump song art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each song's jacket art in Pump: a 2-column grid view (default) and a banner-row list view of the Charts tab, switched from the header, plus a hero image in the chart sheet.

**Architecture:** The data build reads pumpout's `songCard` table and writes one `[hostIndex, fileName]` per song into `charts.json`. `decodeCatalog` turns that into `song.image`. The phone hotlinks the image, Workbox keeps the ones it has shown, and a placeholder covers everything else. The list's virtual rows gain a `pair` kind for the grid; the chosen view is persisted in `usePumpStore`.

**Tech Stack:** Vite + React + TS, Tailwind tokens, TanStack Virtual, Zustand persist + zod, sql.js (build), vite-plugin-pwa / Workbox, Vitest (node, pure logic only).

**Spec:** [`spec.md`](spec.md). Read it before any task; this plan doesn't repeat its screen details.

## Global Constraints

- Images are hotlinked at runtime, never bundled; nothing goes in `public/`.
- `charts.json` stays ≤ 600 KB (enforced by `report.mjs` and `catalog.test.ts`).
- Every tap target ≥ 44 px. Colours from tokens only. Mode never shown by colour alone.
- Images are decorative: `alt=""`; the placeholder is `aria-hidden`.
- Grid row = 156 px (148 px tile + 8 px gap); list row = 64 px; level header = 32 px.
- Hero: `aspect-video w-full max-h-[28vh] rounded-lg`.
- Image hosts: `https://pumpout.anyhowstep.com/img/card/` and `https://raw.githubusercontent.com/aaaaaa2493/pumpout-db-updates/<PUMPOUT.commit>/img/`.
- Tests: Vitest, pure logic only (the repo's rule). Components are checked in the browser, not unit-tested.
- `main` changes only through a PR. Work on `feature/pump-song-art`; don't push without the user's OK.

## Review Focus

1. **An image host is down or a file 404s**: the tile shows the initials, the row shows no art, and the URL isn't retried on every remount. Covered by `songInitials` tests (Task 4) and the failed-URL memory in `SongArt` (Task 4, browser check).
2. **Switching views when the anchored chart is gone** (filters changed, empty results): nothing scrolls and nothing throws. `rowIndexOf` returns `-1` (Task 5 test).
3. **A level with one chart, or an odd count**: the last tile sits alone in the left column and the next header starts a new row (Task 5 test).
4. **A stored `view` from an old or broken localStorage**: falls back to `'grid'` without losing presets or titles (Task 6 test).
5. **Production CSP blocks the hosts** (dev doesn't enforce it): checked on a Vercel preview build (Task 10).

---

### Task 1: Feature branch, docs and the tag outline

**Files:**
- Docs from `prototype/pump-thumbnails` (uncommitted there): `docs/features/2026-10-pump-song-art/{spec,plan}.md`, `docs/features/2026-10-piu-chart-filter/research-thumbnails.md`, `docs/features/2026-10-piu-chart-filter/permission-messages.md` (modified)
- Modify: `src/apps/pump/components/SkillTag.tsx` (cherry-pick `1819126`)

- [ ] **Step 1:** Copy the four doc files to the scratchpad, then `git stash -u` on `prototype/pump-thumbnails` (keeps the prototype branch clean; drop the stash once Step 3 is committed). The prototype branch stays local for reference in Task 7.
- [ ] **Step 2:** `git switch main && git pull --ff-only` (local `main` is 88 behind), then `git switch -c feature/pump-song-art`.
- [ ] **Step 3:** Copy the docs back in, `git cherry-pick 1819126` (SkillTag outline, one file), commit the docs:

```bash
git add docs/features/2026-10-pump-song-art docs/features/2026-10-piu-chart-filter/research-thumbnails.md docs/features/2026-10-piu-chart-filter/permission-messages.md
git commit -m "docs(pump): song-art research, spec and plan; image lines in the permission drafts"
```

- [ ] **Step 4:** Run `npm test`. Expected: all pass (no code changed besides the tag classes).

---

### Task 2: Build reads one card per song

**Files:**
- Modify: `scripts/piu-data/pumpout.mjs`, `scripts/piu-data/sources.mjs`
- Test: `scripts/piu-data/pumpout.test.mjs`

**Interfaces:**
- Produces: `cardImage(path: string): { host: 0 | 1; file: string }` (exported from `pumpout.mjs`); each song from `readPumpout` gains `card: { host: 0 | 1; file: string } | null`; `PUMPOUT.imgHosts: [string, string]` (getter in `sources.mjs`, index 0 = anyhowstep, 1 = GitHub raw at `PUMPOUT.commit`).

- [ ] **Step 1: Write the failing tests.** Add `songCard (songCardId, songId, path, sortOrder)` and `songCardVersion (songCardId, versionId, operationId)` to the test DDL. Data: song 10 has two live cards (`/img/card/B28.png` sortOrder 1, `/img/card/20.png` sortOrder 0); song 12 has `/img/card/Phoenix2_CALL_ME_BACK.png`, deleted at version 3, and `/img/card/Phoenix_STAGER.png` live.

```js
it('picks the lowest-sortOrder live card per song', () => {
  expect(songs.get(10).card).toEqual({ host: 0, file: '20.png' })
  expect(songs.get(12).card).toEqual({ host: 1, file: 'Phoenix_STAGER.png' })
})
it('leaves a song without a live card at null', () => expect(songs.get(13).card).toBeNull())
describe('cardImage', () => {
  it.each([
    ['/img/card/20.png', 0, '20.png'],
    ['/img/card/Phoenix_STAGER.png', 1, 'Phoenix_STAGER.png'],
    ['/img/card/Phoenix2_CALL_ME_BACK.png', 1, 'Phoenix2_CALL_ME_BACK.png'],
  ])('%s', (path, host, file) => expect(cardImage(path)).toEqual({ host, file }))
  it('throws on any other shape', () => {
    expect(() => cardImage('/img/big/20.png')).toThrow(/card path/)
    expect(() => cardImage('20.png')).toThrow(/card path/)
  })
})
```

- [ ] **Step 2:** `npx vitest run scripts/piu-data/pumpout.test.mjs`. Expected: FAIL (`card` undefined, `cardImage` not exported).
- [ ] **Step 3: Implement.** A `CARDS_SQL` in the same shape as `CATEGORY_SQL`: latest `songCardVersion` operation per `songCardId` among the version's ancestors, skip `DELETE`, `ORDER BY c.songId, c.sortOrder, c.songCardId`; the first row per song wins. `cardImage` matches `^/img/card/([^/]+\.png)$`, host 1 when the file starts with `Phoenix_` or `Phoenix2_`, else throws `Unknown card path "<path>"`. `readSongs` sets `card`.
- [ ] **Step 4:** Rerun the tests. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(pump-data): read one song card per song`.

---

### Task 3: Card paths in charts.json and `song.image`

**Files:**
- Modify: `scripts/piu-data/encode.mjs`, `scripts/piu-data/build.mjs`, `scripts/piu-data/report.mjs`, `src/apps/pump/data/schema.ts`, `src/apps/pump/data/types.ts`, `src/apps/pump/data/catalog.ts`, `src/apps/pump/data/charts.json` (regenerated)
- Test: `scripts/piu-data/encode.test.mjs`, `src/apps/pump/data/catalog.test.ts`

**Interfaces:**
- Consumes: `song.card`, `PUMPOUT.imgHosts` (Task 2).
- Produces: schema `meta.imgHosts: string[]`, song `i?: [number, string]`; `Song.image?: string` (full URL).

- [ ] **Step 1: Write the failing tests.**
  - `encode.test.mjs`: a song with `card: { host: 1, file: 'Phoenix_STAGER.png' }` encodes `i: [1, 'Phoenix_STAGER.png']`; a song with `card: null` has no `i` key and adds the warning `no song art: <title>`; `meta.imgHosts` passes through.
  - `catalog.test.ts` (decode fixture gains `imgHosts: ['https://a/', 'https://b/']` and `i: [1, 'x.png']`): `expect(cat.byId.get(10)!.song.image).toBe('https://b/x.png')`; a song without `i` → `image` undefined.
  - `catalog.test.ts` (committed file): `it('gives every song art from a known host', …)` — every song has `i`, and `i[0] < file.meta.imgHosts.length`.
- [ ] **Step 2:** `npx vitest run scripts/piu-data/encode.test.mjs src/apps/pump/data/catalog.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `encodeCatalog` writes `i` after `bpm` and the warning for a missing card. `build.mjs` passes `imgHosts: PUMPOUT.imgHosts` in `meta` and adds a source `{ name: 'Song art (Andamiro), via Pump Out', url: 'https://pumpout.anyhowstep.com', ref: 'songCard paths' }` (the About dialog lists `meta.sources`, so it needs no edit). `renderReport` adds `Song art <n>/<songs>` to the summary line. `decodeCatalog` builds `image` as `imgHosts[i[0]] + i[1]`.
- [ ] **Step 4:** `npm run piu:data`. Expected: `Song art 669/669`, no errors, file ≤ 600,000 bytes (about 539 KB). The PIU Scores CSV is fetched fresh, so check `git diff --stat src/apps/pump/data/charts.json`: if charts changed beyond `meta` and `i`, list those changes in the commit body.
- [ ] **Step 5:** `npm test`. Expected: all pass.
- [ ] **Step 6: Commit** — `feat(pump-data): song art paths in charts.json`.

---

### Task 4: `SongArt` and its placeholder

**Files:**
- Create: `src/apps/pump/components/SongArt.tsx`
- Modify: `src/apps/pump/lib/labels.ts`
- Test: `src/apps/pump/lib/labels.test.ts`

**Interfaces:**
- Produces: `songInitials(title: string): string` (labels.ts); `SongArt(props: { song: Song; className?: string; eager?: boolean; fallback?: 'initials' | null })`. `fallback` defaults to `'initials'`; `null` (list view) renders nothing when there's no image or it failed.

- [ ] **Step 1: Write the failing test.**

```ts
it.each([
  ['Iolite Sky', 'IS'],
  ['STAGER', 'S'],
  ['Come to Me', 'CT'],
  ['%X (Percent X)', 'XP'],
  ['8 6', '86'],
  ['!!!', '!'],
])('songInitials(%s)', (title, want) => expect(songInitials(title)).toBe(want))
```

- [ ] **Step 2:** `npx vitest run src/apps/pump/lib/labels.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `songInitials`: first character of the first two words made of `\p{L}\p{N}`, upper-cased; when there are none, the title's first character. `SongArt`: port `SongArt` from `src/apps/pump/prototype/ThumbnailVariants.prototype.tsx` reading `song.image` instead of the prototype map; keep the module-level `failed` set, `decoding="async"`, `loading` lazy unless `eager`, `object-cover`, `dark:brightness-90`, `alt=""`; placeholder uses `songInitials`.
- [ ] **Step 4:** Rerun the test. Expected: PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `feat(pump): SongArt with an initials placeholder`.

---

### Task 5: Grid rows and the anchor lookup

**Files:**
- Modify: `src/apps/pump/lib/order.ts`
- Test: `src/apps/pump/lib/order.test.ts`

**Interfaces:**
- Produces:
  - `type GridRow = Extract<ListRow, { kind: 'header' }> | { kind: 'pair'; key: string; charts: Chart[] }`
  - `toGridRows(rows: readonly ListRow[]): GridRow[]` — pairs never cross a header; pair key = first chart's row key.
  - `rowIndexOf(rows: readonly (ListRow | GridRow)[], chartId: number): number` — index of the row holding the chart, `-1` if none.

- [ ] **Step 1: Write the failing tests** (build `ListRow[]` with `toRows` from the existing fixtures: level 19 with 3 charts, level 20 with 1).

```ts
it('pairs charts inside each level and starts a new row at each header', () => {
  const g = toGridRows(rows)
  expect(g.map((r) => (r.kind === 'header' ? `H${r.level}` : r.charts.length))).toEqual(['H19', 2, 1, 'H20', 1])
})
it('finds the row holding a chart in both shapes', () => {
  const g = toGridRows(rows)
  expect(rowIndexOf(rows, thirdLv19.id)).toBe(3)
  expect(rowIndexOf(g, thirdLv19.id)).toBe(2)
  expect(rowIndexOf(g, 999_999)).toBe(-1)
  expect(rowIndexOf([], 1)).toBe(-1)
})
```

- [ ] **Step 2:** `npx vitest run src/apps/pump/lib/order.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both functions (the prototype's `pairUp` in `ChartList.tsx` is the grouping).
- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(pump): grid rows and row lookup`.

---

### Task 6: Persisted view choice

**Files:**
- Modify: `src/apps/pump/store/usePumpStore.ts`
- Test: `src/apps/pump/store/usePumpStore.test.ts`

**Interfaces:**
- Produces: `export type ChartView = 'grid' | 'list'`; state `view: ChartView` (default `'grid'`); action `setView(v: ChartView): void`. Not added to `settings/backup.ts`.

- [ ] **Step 1: Write the failing tests.** Add `view: 'grid'` to the `beforeEach` reset.

```ts
it('defaults to the grid and remembers the list', () => {
  expect(usePumpStore.getState().view).toBe('grid')
  usePumpStore.getState().setView('list')
  expect(JSON.parse(localStorage.getItem(PUMP_STORAGE_KEY)!).state.view).toBe('list')
})
it('falls back to the grid when the stored view is garbage', async () => {
  localStorage.setItem(PUMP_STORAGE_KEY, JSON.stringify({ state: { view: 'tiles', earnedTitles: ['A'] }, version: 1 }))
  await usePumpStore.persist.rehydrate()
  expect(usePumpStore.getState()).toMatchObject({ view: 'grid', earnedTitles: ['A'] })
})
```

  Update `persists only the three data fields` to expect `['earnedTitles', 'lastFilters', 'presets', 'view']`.
- [ ] **Step 2:** `npx vitest run src/apps/pump/store/usePumpStore.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Add `view: z.enum(['grid', 'list']).catch('grid')` to `persistedSchema`, the default, `setView`, and `view` to `partialize`. Keep `version: 1` (the `merge` fallback handles old data).
- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(pump): remember grid or list view`.

---

### Task 7: Grid tile and banner row

**Files:**
- Create: `src/apps/pump/components/ChartTile.tsx`
- Modify: `src/apps/pump/components/ChartRow.tsx`, `src/apps/pump/components/ChartList.tsx`, `src/apps/pump/pages/PumpHome.tsx`
- Reference only (on `prototype/pump-thumbnails`, read with `git show prototype/pump-thumbnails:<path>`): `src/apps/pump/prototype/ThumbnailVariants.prototype.tsx` (`GridPair`, `RowD`), `src/apps/pump/components/ChartList.tsx` (`pairUp`). None of the prototype files exist on this branch; nothing is deleted.

**Interfaces:**
- Consumes: `SongArt` (Task 4), `GridRow`, `toGridRows` (Task 5), `ChartView` (Task 6).
- Produces: `ChartTile({ chart, selectedSkills, earned, onOpen })` (same props as `ChartRow`); `GRID_ROW_HEIGHT = 156` exported from `ChartTile.tsx`; `ChartList` prop `view: ChartView` (replaces the prototype's `variant`).

- [ ] **Step 1:** `ChartTile`: port the tile markup from the prototype's `GridPair` (spec § Grid view). Extract the icon group (tags, trophy with its `aria-label`, gem with its `aria-label`) from `ChartRow` into `RowIcons` inside `ChartRow.tsx`, exported, and use it in both.
- [ ] **Step 2:** `ChartRow`: add the art layer and icon pad from the spec § List view (`SongArt` with `fallback={null}`, `aria-hidden` wrapper, gradient, `bg-background/85` pad behind `RowIcons`); the badge gets no fill or blur. Row stays `h-16`, `relative overflow-hidden`.
- [ ] **Step 3:** `ChartList`: `rows` is `toGridRows(listRows)` when `view === 'grid'`, else `listRows`; `estimateSize` by kind (32 / 156 / 64); a `pair` row renders `grid h-[156px] grid-cols-2 gap-2 pb-2` with a `ChartTile` per chart. `PumpHome` reads `view` from `usePumpStore` and passes it.
- [ ] **Step 4:** `npx tsc --noEmit && npm test`. Expected: clean, all pass.
- [ ] **Step 5: Browser check** (preview "dev", 375×812, dark then light; reload once if the skeleton sticks): `#/pump` shows the grid; `usePumpStore.setState({ view: 'list' })` from the console shows banner rows; CHAOS AGAIN S21's tile line 2 fits; a chart with no tags draws no empty box; S/HD badges read on bright art. Screenshot both views.
- [ ] **Step 6: Commit** — `feat(pump): grid tiles and banner rows with song art`.

---

### Task 8: View toggle that keeps your place

**Files:**
- Create: `src/apps/pump/components/ViewToggle.tsx`
- Modify: `src/apps/pump/components/PumpHeader.tsx`, `src/apps/pump/components/ChartList.tsx`, `src/apps/pump/pages/PumpHome.tsx`

**Interfaces:**
- Consumes: `view`, `setView` (Task 6); `rowIndexOf` (Task 5).
- Produces: `ViewToggle({ view, onChange }: { view: ChartView; onChange(v: ChartView): void })`; `PumpHeader` gains optional `view?: ChartView; onView?(v: ChartView): void` and renders the toggle only when both are set (PumpHome sets them on the Charts tab only).

- [ ] **Step 1:** `ViewToggle`: one `Button variant="ghost" size="icon"` (44×44 like the (i) button), icon `Rows3` in grid view / `LayoutGrid` in list view, `aria-label` "Show as list" / "Show as grid". In `PumpHeader.actions`, before the (i) button.
- [ ] **Step 2:** Anchor: `ChartList` keeps a ref to the first chart whose row is fully below the sticky header (from `virtualizer.getVirtualItems()` on each render). In a `useLayoutEffect` keyed on `view` (skip the first run), `const i = rowIndexOf(rows, anchorId)`; if `i >= 0`, `virtualizer.scrollToIndex(i, { align: 'start' })`.
- [ ] **Step 3:** `npx tsc --noEmit && npm test`. Expected: clean, all pass.
- [ ] **Step 4: Browser check** at 375×812: scroll to Lv 19, toggle → the same chart is at the top in both directions; the toggle isn't on the Titles tab; reload keeps the view; with a filter that empties the list, toggling doesn't throw (console clean).
- [ ] **Step 5: Commit** — `feat(pump): switch between grid and list from the header`.

---

### Task 9: Hero image in the chart sheet

**Files:**
- Modify: `src/apps/pump/components/ChartSheet.tsx`

**Interfaces:**
- Consumes: `SongArt` (Task 4).

- [ ] **Step 1:** First child of the sheet body: `<SongArt key={c.song.title} song={c.song} eager className="aspect-video max-h-[28vh] w-full rounded-lg" />` above the header row; no caption. Remove the header row's `-mt-3`, as the prototype did, so the image isn't pulled under the grabber.
- [ ] **Step 2:** `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 3: Browser check:** open a chart, tap a sibling chart → the image doesn't flicker; a song whose image fails shows initials at the same size; "Titles this chart unlocks" is reachable on 375×667.
- [ ] **Step 4: Commit** — `feat(pump): song art at the top of the chart sheet`.

---

### Task 10: Offline cache and CSP

**Files:**
- Modify: `vite.config.ts`, `vercel.json`

- [ ] **Step 1:** `workbox.runtimeCaching`: one entry, `urlPattern` matching both host prefixes from Global Constraints, `handler: 'CacheFirst'`, `options: { cacheName: 'pump-art', expiration: { maxEntries: 700, maxAgeSeconds: 90 * 24 * 60 * 60, purgeOnQuotaError: true }, cacheableResponse: { statuses: [0, 200] } }`.
- [ ] **Step 2:** `vercel.json` `img-src`: append `https://pumpout.anyhowstep.com https://raw.githubusercontent.com`.
- [ ] **Step 3:** `npm run build`. Expected: success; `dist/sw.js` contains `pump-art`; no song images in the precache manifest (`grep -c "img/card" dist/sw.js` → 0).
- [ ] **Step 4: Browser check** (`npm run preview`): scroll a few screens, then DevTools offline (or `context.setOffline`) and reload → seen art shows, unseen tiles show initials. Console clean.
- [ ] **Step 5: Commit** — `feat(pump): cache seen song art offline; allow the image hosts in CSP`.
- [ ] **Step 6:** Ask the user before pushing `feature/pump-song-art`. After the push and a Vercel preview: images load from both hosts with no CSP errors. Then the spec's phone checks (spec § Testing) go in the PR description with screenshots of both views in light, dark and a custom palette.
