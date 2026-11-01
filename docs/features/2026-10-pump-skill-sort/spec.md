# Pump skill sort — Design

**Date:** 2026-11-02 · **Status:** decisions answered 2026-10-31 (grilling, Q1–Q13), built 2026-11-02 (not pushed or merged)
**Builds on:** [`../2026-10-piu-chart-filter/spec.md`](../2026-10-piu-chart-filter/spec.md) (Pump v1: filters, URL state, list order) · [`../2026-10-pump-song-art/spec.md`](../2026-10-pump-song-art/spec.md) (grid and list views)

## Problem

Filtering D18 + run shows the 93 run-tagged D18 charts, sorted by title. To pick a chart that drills runs hardest, or one that's only a little runny, you have to open each chart sheet and read its run bar. The list should rank by that skill's coverage %, both ways, and show the number.

## Decisions

| # | Decision |
|---|---|
| 1 | **Ranking applies when exactly one computed skill is selected** (half, run, twist, bracket or drill), with any level filter or none. It ranks inside each level header, so a single level is just the one-header case. |
| 2 | **Only the order changes.** The filter keeps showing just the charts tagged with that skill; headers and their counts are unchanged. |
| 3 | **Three orders: most first (default), least first, A–Z** (today's order). |
| 4 | **Ties keep today's order**: title, then S before D before HDB. |
| 5 | **No ranking for gimmick** (it has no %), **for two or more skills**, or with no skill: the control hides and the list stays A–Z. |
| 6 | **The selected skill's tag shows its %** while ranking, e.g. "run 67%". |
| 7 | **The order is filter state**: it lives in the URL and comes back with the last filters. |
| 8 | **The control is a chip in the bottom dock**, right after the skill chip. Each tap moves to the next order. |
| 9 | **Grid view shows the % too.** Correction to the grilling answer: grid tiles already show skill tags below the art (song-art spec, decision 2), so the tile's tag reads "run 67%" exactly like the list row, and no separate badge is added. Built with the fallback: at 360 px "bracket 100%", a second tag and a trophy measured about 162 px of icons in a 142 px tile, so while ranking the tile shows only the selected tag (`max = 1`). |
| 10 | **Charts with no %** (Steam Link and 11 others with no coverage data; they can still be tagged through an official title list) go to the end of their level in both directions and show no %. |
| 11 | **The chosen direction carries over** when the skill changes (run → twist, or removed and another added). Most first is only the starting value. |
| 12 | **Titles tab unchanged.** Ranking by more than one skill is out of scope. |

## Data (no change)

`chart.coverage[skill]` is already 0–100 for the five computed skills, absent when the chart has no data. Example, D18 + run: 93 charts, % from 14 to 83, with big ties (18 charts at 33 %, 15 at 29 %).

## Behaviour

### When ranking applies

`rankSkill(f)` returns the skill to rank by, or `null`:

- `f.skills` has exactly one entry, and it isn't `gimmick` → that skill.
- Anything else → `null`. `skillsAll` doesn't matter with one skill.

The order is used only when `rankSkill` isn't `null`. Otherwise the stored value is kept but ignored, so it carries over (decision 11).

### Order

`rankCharts(sorted, skill, dir)` takes the already level → title → mode sorted list:

- `dir = 'az'` → returned as is.
- Otherwise a stable sort by: level ascending, then charts with a % before those without, then % descending (`most`) or ascending (`least`). Equal keys keep the input order (decision 4).

Applied after `applyFilters`, so filtering still never reorders. `toRows` / `toGridRows` are unchanged: a header still comes before each level.

### Filter state and URL

- `Filters` gains `sort: 'most' | 'least' | 'az'`, default `'most'`.
- URL key `so`: `least` or `az`; `most` (the default) is omitted, like every other default. Unknown values parse to `'most'`.
- `so` joins `FILTER_KEYS`, so it is replaced by `withFilters`, saved in `lastFilters` and restored by `mergeLiveFilters`.
- **Not a facet:** `activeFacetCount`, `summarize`, `passes`, `facetCounts` and `removalSuggestions` ignore it. The Filters (n) count doesn't change when the order does.
- **Clear** resets all filters, including the order back to most first.
- **Presets** save the whole query, so a preset saved with "least first" restores it.
- Changing the order changes the list key, so the list scrolls to the top, like any filter change.

## Screens

### Order chip (bottom dock)

```text
[ S ] [ D ] [ Lv 18 ] [ run × ] [ ↓ Most run ] [ Clear ]
```

- Shown only while `rankSkill(filters)` isn't `null`, right after the skill chips and before Clear.
- Uses `Chip` with `active` false (outline look), so it doesn't read as a removable filter.
- Label by state, with the lucide icon before the text:
  - `most`: `ArrowDownWideNarrow` + "Most run"
  - `least`: `ArrowUpNarrowWide` + "Least run"
  - `az`: `ArrowDownAZ` + "A–Z"
- Tap cycles most → least → A–Z → most.
- `aria-label`: "Order: most run first. Tap for least first" / "Order: least run first. Tap for A to Z" / "Order: A to Z. Tap for most run first". The skill name follows the selected skill.

### % on the tag (list row and grid tile)

- While ranking (whatever the direction, A–Z included), the selected skill's `SkillTag` reads `run 67%`, with `tabular-nums` on the number.
- No % on the tag for a chart with no coverage.
- `rowSkills` already puts the selected skill first, so the % tag is always the first one shown.
- The grid tile's icon line is `h-5`, and a tile is about 170 px wide at 390 px. "bracket 100%" plus a second tag, trophy and gem might not fit: check in the browser at 360 px. If it overflows, the tile shows only the selected tag while ranking (`max = 1`).

## Files

| File | Change |
|---|---|
| `src/apps/pump/lib/filters.ts` | `SortDir` type, `sort` in `Filters` and `defaultFilters`, `rankSkill(f)` |
| `src/apps/pump/lib/order.ts` | `rankCharts(sorted, skill, dir)` |
| `src/apps/pump/lib/url-state.ts` | `so` key: parse, serialise, `FILTER_KEYS` |
| `src/apps/pump/lib/labels.ts` | `sortLabel(dir, skill)` and `sortAriaLabel(dir, skill)`; `nextSort(dir)` |
| `src/apps/pump/pages/PumpHome.tsx` | rank `results`; pass the ranked skill to `ChartList` |
| `src/apps/pump/components/FilterDock.tsx` | the order chip |
| `src/apps/pump/components/ChartList.tsx`, `ChartRow.tsx`, `ChartTile.tsx` | thread `rankedSkill` down to `RowIcons` |
| `src/apps/pump/components/SkillTag.tsx` | optional `pct` prop |

## Testing

Vitest, pure logic only (the repo's rule); components are checked in the browser.

| Test | Covers |
|---|---|
| `filters.test.ts` | `rankSkill`: one computed skill → it; gimmick, two skills, none → `null` |
| `order.test.ts` | `rankCharts`: most / least / az; ranked inside each level, never across; ties keep title order; no-% charts last in both directions; input not mutated |
| `url-state.test.ts` | `so` round-trip; default omitted; garbage → `'most'`; `mergeLiveFilters` brings `so` back |
| `summary.test.ts` | `activeFacetCount` ignores `sort` |
| `labels.test.ts` | `nextSort` cycle; labels name the skill |

Browser checks (dev server, 390 px and 360 px, light and dark):

1. D18 + run: chip shows "Most run", first chart has the highest run %, tags read "run NN%", list and grid.
2. Tap → least first, then A–Z (tags still show %), then most again; the list scrolls to the top each time.
3. Lv 17–19 + run: each level is ranked on its own; headers and counts unchanged.
4. Add twist (two skills) → chip gone, A–Z, no %. Remove run → ranking by twist, with the direction chosen before.
5. Gimmick alone → no chip.
6. Reload, and close and reopen Pump → same order; Clear → most first.

## Docs to update when this ships

- Pump v1 spec, the list-order line (§ List: "Order: level ascending, then title"): add "or by the selected skill's %, see the skill-sort spec".
- The explainer "Nook Split, Explained" (https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4): the sort chip in its Pump content.

## Out of scope

- Ranking by two or more skills (sum or highest %).
- Ranking across levels (one flat list with no headers).
- The Titles tab.
- Showing every skill's % on the row.
