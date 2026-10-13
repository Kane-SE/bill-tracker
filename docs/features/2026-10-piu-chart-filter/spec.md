# Pump — Design

**Date:** 2026-10-14 · **Status:** grilled (rounds 1–4, 2026-10-13), awaiting spec review
**Decisions log:** [`decisions.md`](decisions.md) · **Research:** [`research.md`](research.md) (data sources), [`research-ui.md`](research-ui.md) (mobile list and filters), [`research-gimmick-titles.md`](research-gimmick-titles.md) (gimmick list)

## Problem

At the arcade, between songs, there's a minute or two to pick the next chart. Finding "a twisty D20–22" or "the next chart for my HALF title" means scrolling the cabinet's folders or digging through community websites. Those sites are desktop-sized tables, need paging, or show PHOENIX 1 levels.

**Pump** is the third mini-app in Nook, next to Split and Hub. It lists every PHOENIX 2 chart and narrows them down one-handed:
- by mode;
- by level range;
- by skill: half, run, twist, bracket, drill, gimmick;
- by song type and version;
- by searching title or artist.

A second tab tracks the official skill titles. It works offline.

## Decisions (from grilling)

| # | Decision |
|---|---|
| 1 | Purpose: **practise a skill at my level** and **chase the official skill titles**. No random pick and no personal to-play or cleared lists in v1. |
| 2 | **PHOENIX 2 only** (v1.01.0 today). No version switch. Levels are P2 levels. |
| 3 | **Every song available in P2**, including pre-FIESTA songs. A **Version** filter narrows by series. |
| 4 | Single and Double are in. **Steam Link content** (Half-Double mode, 790 charts, and the 10 RISE songs, 87 charts) is in but **hidden by default**. **Premium-mode charts** (172) are in, with an icon. **Co-op and UCS are out.** |
| 5 | **Half** is a skill: Double charts that stay on the middle panels. It is not the Half-Double mode. |
| 6 | **Six skills**: half, run, twist, bracket, drill, gimmick. The first five come from piucenter skill coverage with tuned thresholds; official title charts are always tagged. |
| 7 | **Gimmick is a fixed list**: every chart ever required by an official GIMMICK title (XX, PHOENIX, PHOENIX 2), plus PHOENIX 2's SLOW ladder. That is 22 charts today. Nothing is computed from timing data. |
| 8 | **Titles tab**: PHOENIX 2's 9 skill-title tracks, each Lv.1→10. You tick titles you've earned. Ticks are saved on the phone and included in Settings → backup. |
| 9 | **Data**: pumpout's SQLite (pinned to a commit) plus the public PIU Scores CSV export, fetched at **build time only** and turned into one JSON file bundled with the app. **Refresh on request**: Claude runs `npm run piu:data`, shows what changed, and commits. |
| 10 | **Licensing**: commit only derived facts, credit the sources in the app, and ask both maintainers (aaaaaa2493 for pumpout-db-updates, DrMurloc for PIU Scores) before the PR merges. Fallback if refused: an import-on-phone data file (a separate design). |
| 11 | Charts tab: **one row per chart, level ascending, sticky level headers**. |
| 12 | **Search in the bottom bar**, filtering as you type. |
| 13 | **Level grid, tap start then end**; ranges only. |
| 14 | **Skills combine with "any" by default**, with an any/all switch. Other facets: OR within a facet, AND across facets. |
| 15 | **Bottom bar**: mode chips, level chip, selected skills, Clear, search, Filters (n). |
| 16 | **Presets** (saved filters) in v1. |
| 17 | **Charts \| Titles tabs** in the header. |
| 18 | **Back closes the open sheet**; otherwise it leaves Pump. Filter taps don't add history. |
| 19 | **Tapping a chart opens a sheet over the list**; the list keeps its place. |
| 20 | **No results → suggest which filter to remove**, with counts. |
| 21 | Name **Pump**, lucide `Footprints` icon, "Find charts to play", route `#/pump`. |
| 22 | One new runtime dependency: **`@tanstack/react-virtual`**. |
| 23 | **Fix the shared Dialog** in this branch: 44 px close target and reduced motion. |

## Architecture

```text
build time (dev machine)                                     runtime (phone, offline)
┌──────────────────────────────┐   charts.json (committed)   ┌──────────────────────────────────┐
│ scripts/piu-data/build.mjs   │ ──────────────────────────▶ │ lazy chunk: PumpHome + charts.json│
│  pumpout .db (pinned SHA)    │                             │  pure lib: search, filters,       │
│  PIU Scores CSV (dated copy) │   report (console + .cache) │  url-state, summary, titles       │
│  title ladders (in repo)     │                             │  usePumpStore (persist)           │
└──────────────────────────────┘                             └──────────────────────────────────┘
```

- **Build time** does all the joining and mapping. The phone never talks to a data source; the PIU Scores CSV has no CORS headers anyway.
- **Runtime** is pure functions over an in-memory array, plus one persisted Zustand store. Filtering 5,400 charts takes about 0.1 ms (measured in research-ui §6), so there's no worker and no index.
- **Code split.** `App.tsx` mounts `/pump` through `React.lazy`. `charts.json` is imported by the lazy module, so the launcher and the other apps don't load it. Workbox precaches the chunk like any other JS.

### Files

```text
scripts/piu-data/
  build.mjs                 entry: fetch → join → map → validate → write charts.json, print report; exits non-zero if a check fails
  sources.mjs               pinned inputs: pumpout raw URL at a commit SHA; PIU Scores CSV URL + column list
  pumpout.mjs               sql.js over the .db → P2 v1.01 songs, charts, levels, prior levels, labels, step artists
  piuscores.mjs (+test)     CSV parse (quoted fields with commas, BOM) → per chart: type, channel, debut, coverage, badges
  join.mjs (+test)          pumpout ↔ CSV on normalised title + cut + mode + level; ALIASES table; returns matched + unmatched
  skills.mjs (+test)        coverage → half/run/twist/bracket/drill with thresholds; title charts forced on
  titles.mjs (+test)        P2 ladders (9 × 10) and the gimmick list, keyed by pumpout chart ID
  ladders.json              hand-copied, cited title ladders (P2's 9 tracks; P1's RUN/TWIST/BRACKET/HALF/DRILL/GIMMICK;
                            XX Gimmick) — the only hand-kept data
  report.mjs                counts; unmatched; new/removed/re-rated vs the committed charts.json; threshold stats; warnings
  README.md                 how to refresh after a patch

src/apps/pump/
  routes.tsx                <Route path="/pump"> with lazy PumpHome + Suspense skeleton
  data/charts.json          GENERATED — never hand-edited
  data/schema.ts            zod schema + types for charts.json (also used by the build and by a test)
  lib/normalize.ts (+test)  fold(): NFKD → strip \p{M} → lower-case; tokens()
  lib/search.ts (+test)     matches(chart, tokens): every token is a substring of title | titleKo | artist
  lib/filters.ts (+test)    Filters type, applyFilters, facetCounts, removalSuggestions, defaultFilters
  lib/url-state.ts (+test)  Filters ↔ URLSearchParams (forgiving parse, canonical serialise)
  lib/summary.ts (+test)    "S or D · Lv 18–20 · twist or bracket"
  lib/titles.ts (+test)     tracks with progress; nextTitle(track, earned)
  lib/order.ts (+test)      sort (level, title, mode) and level-header sections
  store/usePumpStore.ts (+test)  persist { lastFilters, presets, earnedTitles }
  hooks/useKeyboardInset.ts visualViewport → px the keyboard covers
  hooks/useSheetParam.ts    open/close a sheet through a URL param with push / history.back()
  components/  PumpHeader (tabs + info), ChartList, ChartRow, LevelBadge, SkillTag, FilterDock, ChipRow,
               FilterSheet, FacetGroup, LevelGrid, AnyAllSwitch, PresetBar, ChartSheet, EmptyResults,
               TitlesTab, TitleTrack, AboutDialog, PumpSkeleton
  pages/PumpHome.tsx

Modified:
  src/App.tsx                 lazy /pump route
  src/launcher/registry.ts    Pump entry
  src/shared/ui/dialog.tsx    44 px close target; motion-reduce variants
  src/shared/components/BottomBar.tsx   accepts `style` (for the keyboard inset)
  src/settings/backup.ts      optional apps.pump.earnedTitles (v2 stays readable)
  package.json                + @tanstack/react-virtual; devDependency sql.js; script "piu:data"
  .gitignore                  + .cache/
  README.md                   Pump section
```

## Data

### Inputs

| Input | Pinned how | Gives |
|---|---|---|
| `aaaaaa2493/pumpout-db-updates` `db/pumpout-phoenix-2-1.01.db` | raw.githubusercontent URL at commit `ed314a8216f9c0dfe7cef29a1de5ce84ec4f1e44` | songs, charts and their P2 levels, the chart's level in PHOENIX v2.12.0, mode (S/D/HDB/Co-Op), labels (PREMIUM MODE EXCLUSIVE, STEAM LINK EXCLUSIVE, UCS), step artists, BPM range, Korean titles where present |
| PIU Scores `Charts/Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType,Channel,DebutMix,StepArtist,Badges,SkillEmphasis` | live endpoint; each run saves `.cache/piu-data/piuscores-YYYY-MM-DD.csv` | song type, channel, debut mix, top-3 badges, 29 `pc:badge_fraction:*` coverage columns |
| `scripts/piu-data/ladders.json` | in the repo; each entry cites its source | P2's 9 ladders (Titles tab, forced skills); P1's 6 ladders (threshold tuning, forced skills); XX and P1 GIMMICK (gimmick list) |

Downloads are cached in `.cache/piu-data/` (git-ignored). The script reads SQLite through **`sql.js`** (dev dependency only), because the repo's Node 20 has no `node:sqlite`.

### Rules

- **Included**: P2 v1.01.0 charts with mode S, D or HDB. **Excluded**: Co-Op, and anything labelled UCS.
- **Level**: from pumpout. If pumpout has none, the CSV level is used and the report warns: today that's 1948's D chart, D29 per PIU Scores. Known disagreement kept as a warning: U Got Me Rocking D6 (pumpout) vs D5 (observed on machines).
- **prevLevel**: the chart's PHOENIX v2.12.0 level, only when it differs.
- **Flags**: `PREMIUM` when labelled PREMIUM MODE EXCLUSIVE. `STEAM_LINK` when labelled STEAM LINK EXCLUSIVE; that covers HDB mode and the RISE songs.
- **Series** (Version filter): the CSV's `DebutMix` is mapped to the P2 Series Zone groups: `1st~ZERO`, `NX~NXA`, `FIESTA~FIESTA 2`, `PRIME`, `PRIME 2`, `XX`, `PHOENIX`, `PHOENIX 2`. Infinity and Prime JE map to `PRIME`, the in-game rule. A chart with no CSV row (HDB) takes its song's series. A `DebutMix` value missing from the map fails the build, so nothing lands in the wrong group silently.
- **Song type**: ARCADE, SHORTCUT, REMIX, FULLSONG.
- **Skills** (coverage c(x) = `pc:badge_fraction:x`, 0–1):

  | Skill | Tagged when |
  |---|---|
  | run | c(run) + c(anchor_run) + c(run_without_twists) ≥ t_run, or one of them is in the top-3 badges |
  | twist | max(c(twist_90), c(twist_over90), c(twist_close), c(twist_far)) ≥ t_twist, or "Twists" is in the top-3 |
  | bracket | max over bracket, staggered_bracket, bracket_run, bracket_drill, bracket_jump, bracket_twist ≥ t_bracket, or one is in the top-3 |
  | half | mode D and c(mid6_doubles) ≥ t_half |
  | drill | c(drill) + c(bracket_drill) ≥ t_drill, or "Drills" is in the top-3 |
  | gimmick | the chart is in the fixed gimmick list (below). No threshold |

  Each threshold is the **highest value that still tags ≥ 90% of that skill's P2 + P1 title charts**. Every chart on a P2 or P1 ladder for that skill is then forced on: e.g. every chart on TWIST S/D, or on P1 TWIST, gets twist. The report prints, per skill: threshold, title-chart hit rate before forcing, and total charts tagged.
  The exact score per skill (sum vs max) gets fixed during tuning. Whichever scores the title charts best wins, and is recorded in `skills.mjs`.
- **Gimmick list**: the union of the XX Gimmick, P1 [GIMMICK], P2 [GIMMICK] and P2 [SLOW] ladders. Matched by **pumpout chart ID**, not by level, because levels moved: Take Out D23 [SLOW] was D22 before P2. Today that's 22 charts. Wicked Legend D21 is not included.
- **No skill data**: Steam Link charts and 11 others have no CSV coverage. Their `skills` is empty, and the sheet says so.

### charts.json shape

Compact on purpose: the budget is **≤ 600 KB raw**, which the build enforces. `data/schema.ts` is the source of truth; this is its outline:

```ts
{
  meta: { game: 'PHOENIX 2', patch: '1.01.0', builtAt: string,
          sources: { name: string; url: string; ref: string }[] },
  songs: { title: string; titleKo?: string; artist: string;
           type: 'ARCADE' | 'SHORTCUT' | 'REMIX' | 'FULLSONG';
           channel?: string; series: SeriesId; bpm: [number, number] }[],
  charts: { id: number;            // pumpout chart ID — stable across rebuilds; used in URLs
            s: number;             // index into songs
            m: 'S' | 'D' | 'HDB'; lv: number; prev?: number;
            sk: SkillId[];         // [] = no skill data
            cov?: number[];        // 0–100 for [half, run, twist, bracket, drill], for the sheet's bars
            badges?: string[];     // piucenter top-3, for the sheet
            gim?: string[];        // e.g. ['XX GIMMICK Lv.3', 'P2 SLOW Lv.2']
            fl?: ('PREMIUM' | 'STEAM_LINK')[]; by?: string /* step artist */ }[],
  titles: { id: string;            // 'TWIST_D_7' — stored in earnedTitles
            track: Track; lv: number; chart: number /* chart id */ }[],
}
```

## Runtime

### Filters and the URL

The Charts tab's state lives in the hash route's query string. Chip taps call `setSearchParams(next, { replace: true })`. Opening a sheet pushes one entry, so Back closes it.

| Param | Meaning | Default when absent |
|---|---|---|
| `m` | modes, comma list of `S`, `D`, `HDB` | any mode |
| `lv` | `18-20` or `19` | any level |
| `sk` | skills, comma list | none |
| `all` | `1` = skills combine with AND | any (OR) |
| `ty` | song types | all |
| `v` | series | all |
| `tc` | `1` = title charts only | off |
| `sl` | `1` = show Steam Link content | off |
| `np` | `1` = hide Premium-mode charts | off |
| `q` | search text | empty |
| `tab` | `titles` | Charts |
| `f` | `1` = Filters sheet open (pushed) | closed |
| `c` | chart ID = chart sheet open (pushed) | closed |

- **An empty facet means no restriction.** That holds for every facet, modes included: with no mode chip selected you see S and D, plus HDB while `sl=1`.
- **Parsing** is forgiving: unknown values are dropped, and a bad `lv` means any level. **Serialising** is canonical: sorted lists, defaults omitted. So the same filters always give the same URL, and presets compare by string.
- **`HDB` in `m`** only applies while `sl=1`. Turning `sl` off drops it.
- **Last filters**: every change mirrors the filter params (not `q`, `tab`, `f` or `c`) into `lastFilters`. Opening `#/pump` with no params replaces the URL with `lastFilters`. Search text is deliberately not restored: an old query at the arcade is confusing.
- **Closing a sheet keeps the changes.** Filter taps inside the open Filters sheet replace the *top* history entry (the one with `f=1`). The entry below it still holds the filters from before the sheet opened. So whenever a sheet closes, by Back, swipe, ✕ or "Show N charts" (which calls `history.back()`), `useSheetParam` re-applies the current filters from `lastFilters` with `replace`. The pure part, `paramsAfterClose(current, live)`, is unit-tested.
- **Presets apply with `replace`**, like chips, so Back never steps through filter states.
- **A sheet reached by a link** (`#/pump?f=1` or `?c=…` opened directly, so there's no pushed entry below it) closes with `replace`, not `history.back()`, so closing it never leaves the app. `useSheetParam` tells the two cases apart with a marker it puts in `history.state` when it pushes.
- **Matching**: a chart passes when it passes every active facet:
  - mode ∈ m;
  - level in range;
  - skills: any → ∩ ≠ ∅, all → ⊇;
  - type ∈ ty;
  - series ∈ v;
  - `tc` → it is a P2 title chart;
  - `sl` off → no STEAM_LINK flag;
  - `np` → no PREMIUM flag;
  - search → every token is in fold(title + titleKo + artist).
- **Counts on options**: each option's count uses all *other* active facets ("Double 1,783").
- **Removal suggestions** (empty list): for each active facet value (each skill, the level range, a mode set, a type set, a series set, `tc`, the search text), count the results without it. Show the top 3 by count, then **Clear all**.

### Search

- `fold(s) = s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()`. Tokens split on whitespace.
- NFKD lets half-typed Korean match, which research-ui §3.3 measured.
- The query feeds a `useDeferredValue`. The list component is `memo`'d. No debounce.
- Search only filters. The order stays level → title, so the level headers still mean something.
- Input: `type="search"`, `enterkeyhint="search"`, `autocapitalize="none"`, `autocorrect="off"`, `spellcheck={false}`.

### Store (`usePumpStore`)

Persisted under `pump-store`, version 1. Only these three fields are persisted, and each is checked with zod when it loads; anything invalid falls back to empty.

```ts
{ lastFilters: string;                                  // canonical query string
  presets: { id: string; name: string; query: string }[];   // max 12
  earnedTitles: string[] }                              // title IDs
```

**Backup**: `buildBackup()` adds `apps.pump = { earnedTitles }`. In `backupV2Schema` that field is **optional**, so older backup files still import. Restoring sets `earnedTitles` and leaves filters and presets alone.

## Screens

All sizes are CSS px at a 390 px width. Every tap target is ≥ 44 px, or extends its hit area to 44. Colours come from tokens only.

### Header (both tabs)

`PageHeader` shows the title "Pump", a back arrow to `/`, an (i) button that opens the About dialog, and a **Charts | Titles** segmented control (two `aria-pressed` buttons) under the title. The subtitle depends on the tab:
- Charts: "212 charts · 141 songs". It's a `role="status"` line fed by the deferred count.
- Titles: "12 / 90 earned".

### Charts tab

- **List**: `useWindowVirtualizer`.
  - Rows are fixed at **64 px**; level headers are fixed at **32 px** and sticky ("Lv 19 · 51"), via `rangeExtractor`.
  - Order: level ascending, then title (`Intl.Collator`), then S before D before HDB.
- **Row** (the whole row is one button that opens the chart sheet):
  - **Left: `LevelBadge`** (40×40) shows `S19`, `D19` or `HD19`. Single is outlined, Double is filled with `primary`, HD is a dashed outline. The mode is never shown by colour alone.
  - **Line 1:** the title, truncated, then `titleKo` as a muted suffix when present.
  - **Line 2** (muted): artist · song type (only when not Arcade) · series.
  - **Right:** up to 2 `SkillTag`s. Selected skills come first, then by coverage; gimmick comes first when it applies. A trophy icon marks a P2 title chart (filled when earned), and a small P marks Premium.
- **FilterDock** (in `BottomBar`, lifted by `useKeyboardInset`):
  - Row 1 is a sideways-scrolling `ChipRow`:
    - mode chips S and D, plus HD while `sl=1`. None selected = all modes;
    - the level chip ("Lv 18–20", or "Any level"), which opens the sheet at Level;
    - one chip per selected skill, with an ✕;
    - **Clear**, shown when anything is active.
  - Row 2 is the search field, plus **Filters (n)**, where n is the number of active facets.
- **Empty**: "No charts match." The top 3 removal suggestions, each a button like "Remove bracket → 18 charts", then **Clear all**.

### Filters sheet (shared `Dialog`, bottom sheet)

- **Opening**: it opens with `f=1` pushed. Focus goes to the title (`onOpenAutoFocus` → focus the `tabIndex={-1}` title), not to an input.
- **Header**: Filters, **Reset**, and the close button.
- **Sections**, in order:
  1. **Presets**: chips, then "+ Save current". Saving asks for a name, prefilled with the summary. An **Edit** toggle shows ✕ on each chip to delete it. Tapping a preset applies it (with `replace`).
  2. **Mode · any of**: Single, Double with counts. Half-Double (count) appears only when Steam Link is on.
  3. **Level**: `LevelGrid`. It shows every level in the data, 7 per row (1–29 today: 5 rows).
     - Tap one level: that level.
     - Tap a second: the inclusive range.
     - A third tap starts over.
     - Tapping the only selected level clears it.
     - "Any level" clears the filter.
  4. **Skills** (`AnyAllSwitch`: any of | all of): half, run, twist, bracket, drill, gimmick, with counts.
  5. **Song type · any of**: Arcade, Short Cut, Remix, Full Song.
  6. **Version · any of**: the 8 series, scrolling sideways.
  7. **More**: Title charts only · Show Steam Link charts · Hide Premium-mode charts.
- **Footer** (sticky): one primary button, **Show N charts**. It closes the sheet with `history.back()`. Every way of closing keeps the changes, because they're applied live.
- **Markup**: each facet is a `role="group"` with `aria-labelledby`. Each option is a `<button aria-pressed>` with a visible check icon when on, and its label never changes with state.

### Chart sheet (shared `Dialog`)

It opens with `c=<id>` pushed. Back or swiping down closes it, and the list hasn't moved underneath. Content:
- The `LevelBadge`, title, `titleKo`, and artist.
- Song type · channel · series · BPM (or a range) · step artist.
- "Was D20 in PHOENIX" when `prev` is set.
- **Skill bars** for half, run, twist, bracket and drill (0–100). Tagged skills are emphasised.
- **Gimmick** as a line naming its ladders ("PHOENIX 2 SLOW Lv.2 · PHOENIX GIMMICK Lv.8").
- The top-3 piucenter badges, in small muted text.
- **Titles** this chart unlocks ("TWIST D Lv.7 · needs SSS"), each with an **earned** toggle.
- No skill data → "No skill data for this chart (Steam Link)." or "No skill data for this chart."
- Flags: Premium mode, Steam Link.

### Titles tab

- The 9 tracks in the order of the official title page (as captured in `Phoenix2TitleList.cs`). As listed in research.md §3.7: TWIST S, TWIST D, RUN S, RUN D, DRILL, GIMMICK, SLOW, HALF, BRACKET.
- Each track has a header ("TWIST D · 3 / 10") and then 10 rows.
- Each row has a **tick** button (44×44, `aria-pressed`, labelled "Earned TWIST D Lv.3"), then "Lv.3", the `LevelBadge` and the title. Tapping the rest of the row opens the chart sheet.
- The first unearned title in each track is marked **next**.
- No virtualiser: 90 rows is fine.
- Switching tabs replaces `tab` in the URL. The Charts filters stay put.

### About dialog

Shows:
- the data version from `meta` ("PHOENIX 2 v1.01.0 · built 14 Oct 2026");
- the sources with links and credits: Pump Out / pumpout-db-updates (Haru-kaze, AnyhowStep, aaaaaa2493), PIU Scores (DrMurloc), piucenter.com (skill analysis, maxwshen), and the title lists;
- "Skill tags are computed from piucenter's step analysis; gimmick tags come from official title lists.";
- "Not affiliated with Andamiro."

### Launcher

`registry.ts` gets `{ id: 'pump', name: 'Pump', description: 'Find charts to play', icon: Footprints, to: '/pump' }`.

## Shared changes

- **`dialog.tsx`**:
  - The close button gets a 44×44 hit area: same icon, with padding and a negative margin.
  - `DialogOverlay` and `DialogContent` get `motion-reduce:animate-none`.
  - Split and Hub dialogs change only in these two ways.
- **`BottomBar.tsx`**: takes an optional `style`. `FilterDock` passes `{ transform: translateY(-inset px) }`, where `useKeyboardInset` computes `max(0, innerHeight − visualViewport.height − visualViewport.offsetTop)` from the visualViewport `resize` and `scroll` events.
- **`App.tsx`**: the `/pump` route renders `<Suspense fallback={<PumpSkeleton/>}>` around a `React.lazy` PumpHome.

## Testing

Vitest in the node environment, pure logic only, which is the repo's rule.

| Area | Tests |
|---|---|
| `piuscores.mjs` | quoted titles with commas; BOM; missing columns → a clear error |
| `join.mjs` | exact match; cut suffixes; aliases (e.g. `Phalanx "RS2018 Edit"`); unmatched charts are returned, not dropped |
| `skills.mjs` | threshold picking on a fixture; title charts forced on; HDB charts get `[]` |
| `titles.mjs` | gimmick union by chart ID survives a re-rate (the Take Out D22→D23 case) |
| `charts.json` (committed) | passes `schema.ts`; 90 titles resolve; 22 gimmick charts; no Co-Op or UCS; every `s` and `chart` index is valid; size ≤ 600 KB |
| `normalize` / `search` | accents (Café), full-width, the Korean IME states from research-ui §3.3, multi-token AND |
| `filters` | each facet; any vs all; `sl` off hides HDB even when `m` has it; counts exclude their own facet; removal suggestions |
| `url-state` | round-trip; canonical ordering; garbage → defaults; HDB dropped without `sl`; `paramsAfterClose` keeps live filters and drops `f`/`c` |
| `summary`, `order`, `titles` (lib) | as named |
| `usePumpStore` | `partialize`; zod rejects bad stored data; max 12 presets |
| `backup` | a v2 file without `apps.pump` still imports; with it, the earned titles are restored |

**Manual checks** (Phase 4; screenshots go in the PR):
- 390×844 in light and dark, and in a custom palette.
- On your phone:
  - the keyboard over the bottom bar;
  - one-handed reach;
  - Back closes sheets;
  - airplane mode after installing;
  - a tick survives restarting the app.
- Lighthouse mobile: INP ≤ 200 ms on chip taps, and the DOM stays small while scrolling.

## Data refresh (after a patch)

1. Bump the pumpout commit SHA in `sources.mjs`.
2. Run `npm run piu:data`.
3. Read the report:
   - new, removed and re-rated charts;
   - unmatched charts;
   - per-skill threshold stats;
   - title-chart checks;
   - warnings.
4. If P2 changed a title ladder, update `ladders.json` and cite the source.
5. Commit `charts.json` (plus `sources.mjs` / `ladders.json`) on a branch, then open a PR.

If the CSV fetch fails, the build stops and the committed `charts.json` stays as it is.

## Licensing

- The repo only gains derived facts: titles, artists, levels, modes, flags, skill tags and coverage percentages. There's no step data, no `.ssc` files, and no piucenter chart JSON.
- The About dialog credits every source.
- Before the PR merges, both maintainers are asked; Claude drafts the messages and the user sends them. If either says no, the fallback is an import-on-phone data file, which gets its own small design.

## Out of scope (v1)

- Score or clear tracking (other than ticking titles).
- Personal chart lists.
- A random pick.
- Signing in to piugame.com.
- Other game versions.
- UCS and Co-op.
- A computed gimmick tag.
- Showing title tracks from PHOENIX or XX. They're used only behind the scenes: tuning the skill thresholds and building the gimmick list.
- Desktop layout.
- Sharing links (the URL is shareable, but there's no Share button).
