# Pump skill sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When exactly one computed skill is filtered, rank each level's charts by that skill's coverage % (most first by default, least first, or A–Z), switched from a chip in the bottom dock, with the % shown on the selected skill's tag.

**Architecture:** `Filters` gains a `sort` field, carried in the URL as `so` like every other filter. `rankSkill(f)` decides whether ranking applies. `rankCharts` re-sorts the filtered list inside each level, after `applyFilters`. The ranked skill is threaded down to `RowIcons`, which gives the selected `SkillTag` a `pct`.

**Tech Stack:** Vite + React + TS, Tailwind tokens, lucide-react 0.454, Vitest (node, pure logic only).

**Spec:** [`spec.md`](spec.md). Read it before any task; this plan doesn't repeat its details.

## Global Constraints

- Ranking only when `rankSkill(f) !== null`: exactly one of half, run, twist, bracket, drill.
- Never reorder across levels; ties keep the input order (stable sort).
- Charts without `coverage` go last in their level, in both directions.
- `sort` isn't a facet: `activeFacetCount`, `summarize`, `passes`, `facetCounts`, `removalSuggestions` ignore it.
- URL is canonical: `so` omitted for `'most'`.
- Every tap target ≥ 44 px (the `Chip` already is). Colours from tokens only.
- Tests: Vitest, pure logic only. Components are checked in the browser.
- `main` changes only through a PR. Work on `feature/pump-skill-sort`; don't push without the user's OK.

## Review Focus

1. **Stable ties**: 18 D18 charts share run 33 %, and they must stay in title order (Task 2 test).
2. **No-% charts in least-first**: they must not jump to the top as if they were 0 % (Task 2 test).
3. **Stored or shared URLs from before this change** (no `so`) → most first, nothing breaks (Task 3 test).
4. **Grid tile overflow** with a long tag ("bracket 100%") at 360 px (Task 5, browser check).

---

### Task 1: `sort` in Filters and `rankSkill`

**Files:** Modify `src/apps/pump/lib/filters.ts`; test `src/apps/pump/lib/filters.test.ts`, `src/apps/pump/lib/summary.test.ts`

**Interfaces:**

```ts
export type SortDir = 'most' | 'least' | 'az'
export const SORT_DIRS: readonly SortDir[] = ['most', 'least', 'az']
// Filters: + sort: SortDir   defaultFilters: + sort: 'most'
/** The skill the list ranks by: exactly one selected skill with a coverage %, else null. */
export function rankSkill(f: Filters): ComputedSkill | null
```

- [ ] **Step 1:** Failing tests: `rankSkill` returns `'run'` for `skills: ['run']`, also with `skillsAll: true`; `null` for `['gimmick']`, `['run', 'twist']`, `[]`. `activeFacetCount(f({ sort: 'least' }))` is `0`.
- [ ] **Step 2:** Run `npx vitest run src/apps/pump/lib`. Expected: the new tests fail.
- [ ] **Step 3:** Implement. Use `(COMPUTED_SKILLS as readonly string[]).includes(s)` to narrow.
- [ ] **Step 4:** Run `npm test` and `npx tsc -b`. Fix the type errors that the new required field causes in fixtures and other `Filters` literals.
- [ ] **Step 5:** Commit `feat(pump): sort order in the filter state`.

### Task 2: `rankCharts`

**Files:** Modify `src/apps/pump/lib/order.ts`; test `src/apps/pump/lib/order.test.ts`

```ts
/** Each level's charts by `skill` coverage (most or least first); no-% charts last; ties keep input order. 'az' returns the input. */
export function rankCharts(sorted: readonly Chart[], skill: ComputedSkill, dir: SortDir): readonly Chart[]
```

- [ ] **Step 1:** Failing tests, with a fixture of two levels: charts with run 33, 67, 33 (titles A, B, C) and one without coverage at Lv 18, plus one Lv 19 chart at 90.
  - `most` → Lv 18: B(67), A(33), C(33), no-%; then Lv 19. The 90 stays in Lv 19.
  - `least` → Lv 18: A(33), C(33), B(67), no-%.
  - `az` → same array reference as the input.
  - The input array isn't mutated.
- [ ] **Step 2:** Run the tests. Expected: they fail.
- [ ] **Step 3:** Implement: `[...sorted].sort(...)` comparing level, then `has % ? 0 : 1`, then `±(pa - pb)`. `Array.prototype.sort` is stable.
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit `feat(pump): rank charts by a skill's coverage within each level`.

### Task 3: `so` in the URL

**Files:** Modify `src/apps/pump/lib/url-state.ts`; test `src/apps/pump/lib/url-state.test.ts`

- [ ] **Step 1:** Failing tests: `so=least` and `so=az` round-trip; `'most'` serialises with no `so`; `so=banana` and a missing `so` parse to `'most'`; `mergeLiveFilters(new URLSearchParams(), 'sk=run&so=least')` has `so=least`; `withFilters` replaces an old `so`.
- [ ] **Step 2:** Run the tests. Expected: they fail.
- [ ] **Step 3:** Add `'so'` to `FILTER_KEYS`. Parse with `SORT_DIRS.find((d) => d === p.get('so')) ?? 'most'`, and set `so` only when `f.sort !== 'most'`. Put it after `np` and before `q`, so `q` stays last.
- [ ] **Step 4:** Run `npm test`. Expected: all pass, the existing canonical-order tests included.
- [ ] **Step 5:** Commit `feat(pump): sort order in the URL and last filters`.

### Task 4: Labels

**Files:** Modify `src/apps/pump/lib/labels.ts`; test `src/apps/pump/lib/labels.test.ts`

```ts
export function nextSort(d: SortDir): SortDir                         // most → least → az → most
export function sortLabel(d: SortDir, skill: ComputedSkill): string    // "Most run" | "Least run" | "A–Z"
export function sortAriaLabel(d: SortDir, skill: ComputedSkill): string // spec § Order chip
```

- [ ] **Step 1:** Failing tests for the cycle and for each label with `run` and `twist`.
- [ ] **Step 2:** Implement, then run `npm test`.
- [ ] **Step 3:** Commit `feat(pump): labels for the sort chip`.

### Task 5: Wire the list, tags and chip

**Files:** Modify `PumpHome.tsx`, `FilterDock.tsx`, `ChartList.tsx`, `ChartRow.tsx`, `ChartTile.tsx`, `SkillTag.tsx` (all under `src/apps/pump/`)

- [ ] **Step 1: List.** In `PumpHome`, add `const ranked = rankSkill(deferred)` and `const ordered = useMemo(() => (ranked ? rankCharts(results, ranked, deferred.sort) : results), …)`. Feed `ordered` to `toRows`. The `listKey` already includes `so`, so a change of order scrolls to the top.
- [ ] **Step 2: Tags.** Add an optional `pct?: number` to `SkillTag`. It renders `{skill} <span className="tabular-nums">{pct}%</span>`. Pass `rankedSkill: ComputedSkill | null` from `PumpHome` → `ChartList` → `ChartRow` / `ChartTile` → `RowIcons`. `RowIcons` gives `pct={chart.coverage?.[s]}` to the tag where `s === rankedSkill`.
- [ ] **Step 3: Chip.** In `FilterDock`, after the skill chips and before Clear, when `rankSkill(filters)` isn't null: `<Chip label={sortAriaLabel(...)} onClick={() => onChange({ ...filters, sort: nextSort(filters.sort) })}>` with the spec's icon (`h-3.5 w-3.5`, `aria-hidden`) and `sortLabel(...)`.
- [ ] **Step 4:** Run `npm test`, `npx tsc -b`, `npm run lint`. Expected: clean.
- [ ] **Step 5: Browser.** Run spec § Testing browser checks 1–6 with `npm run dev` at 390 px and 360 px, light and dark, list and grid. If a tile's icon line overflows, pass `max = 1` to `rowSkills` in the tile while ranking, and record it in the spec (decision 9).
- [ ] **Step 6:** Commit `feat(pump): sort chip and % on the selected skill tag`.

### Task 6: Docs

- [ ] **Step 1:** Pump v1 spec, § List, "Order:" line: add "When one computed skill is selected, each level is ranked by that skill's % instead (see `../2026-10-pump-skill-sort/spec.md`)."
- [ ] **Step 2:** Set this spec's status to "built", with the date.
- [ ] **Step 3:** Commit `docs(pump): list order with skill ranking`.
- [ ] **Step 4:** Ask the user before pushing and before opening the PR. After merge, update the explainer artifact's Pump content with the sort chip.
