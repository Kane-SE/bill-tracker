# PIU charts — draft plan (for grilling)

**Status: DRAFT, 2026-10-13. Nothing here is approved.** Grill §2 one decision at a time. Each one has a recommended default (★). Once every decision is settled, the agreed design goes into `spec.md`, and this file is rewritten as the task-by-task implementation plan (the same format as `docs/features/2026-10-hub-dashboard/plan.md`).

**Inputs:**
- [`research.md`](research.md): data sources (re-verified 2026-10-13, see its §6).
- [`research-ui.md`](research-ui.md): mobile list, search and filter UI.
- The original handoff (pasted into chat on 2026-10-08). Its `docs/PLAN.md` and `docs/MANUAL-FETCH.md` were never found. This plan replaces them.

---

## 0. Decisions log (grilling)

The log is authoritative. Rows in §2 stay for context; a settled row is marked ✅ here.

**Round 1 — 2026-10-13**

| # | Decision | Note |
|---|---|---|
| ✅ D1 | **Purpose: (a) practise a skill at my level + (b) chase the official skill titles.** No random pick (D18 dropped). No personal to-play/cleared lists in v1 | b needs its own design: see round 2 |
| ✅ D2 | **PHOENIX 2 only.** No version switch | Data shape stays single-level (§4.2) |
| ✅ D5 | **"Half" = Double charts on the middle panels**, the skill behind the official [HALF] titles. Those charts existed long before P2's Half-Double mode | How the Half-Double *mode* itself is handled is folded into D4 (round 2) |
| ◐ D9 | **Gimmick follows the official sense**: the user picked (v) "slow", recognising Twist of Fate as a gimmick song. Exact definition and source: round 2 | Fact: Twist of Fate S19 was **[GIMMICK] Lv.8 in PHOENIX** and is on the **SLOW** track in P2. Its step file has **no** speed, scroll, stop, warp or fake changes, so a timing-based rule would never flag it |
| ✅ D6 | **Ship derived facts only, credit the sources, ask both maintainers before the PR merges.** Fallback: an import-on-phone data file | Claude drafts the two messages; the user sends them |
| ✅ D21 | **"Pump"**, lucide `Footprints`, "Find charts to play". Route `#/pump`, folder `src/apps/pump/` | |
| ✅ D24 | **Fix the shared Dialog in this branch** (44 px close, reduced motion, sticky footer slot) | |
| ✅ D25 | **Branch `feature/piu-charts` from `origin/main`**; commit the docs and push the branch now; PR after the build | Done: `d59c88c` |

**Round 2 — 2026-10-13**

| # | Decision | Note |
|---|---|---|
| ✅ D3 | **Every song available in PHOENIX 2**, old ones included, plus a "Version" filter | 462 S/D charts debuted before FIESTA, and 19 of the 67 matched P2 title charts are among them |
| ✅ D4 | **Include everything, with the Steam Link content hidden behind a filter**: Half-Double mode (790 charts) and the 10 RISE songs (87 charts). Premium-mode charts (172) are in, with an icon. Co-op and UCS are out | None of the Steam Link charts have skill data, so skill filters never match them. The detail sheet says "no skill data" |
| ✅ D9 | **Gimmick = every chart ever required by an official GIMMICK title (any version with records) + PHOENIX 2's SLOW track.** No user-curated list. No tag computed from timing | Result ([`research-gimmick-titles.md`](research-gimmick-titles.md)): titles exist only in **XX, PHOENIX and PHOENIX 2**; PRIME 2 and earlier had none. Ladders: XX Gimmick (community sources only), P1 [GIMMICK], P2 [GIMMICK] + [SLOW] → **22 charts in P2** (19 S, 3 D). Older ladders add Bad Apple!! S15 (XX) and 8 6 S16 (P1); LOVE SCENARIO is gone from P2. Match on pumpout chart IDs, not levels: e.g. Take Out D23 [SLOW] was D22 before P2. Wicked Legend D21 ("All Gimmick Ver." in community files) is **not** a title chart, so it's excluded under this rule |
| ✅ D1-b | **Titles screen**: PHOENIX 2's 9 tracks, each Lv.1→10. Tap a title to open its chart. **Tick the titles you've earned**; ticks are saved on the phone and included in the Settings backup | The only personal data in v1. P1 ladders are not shown, since they didn't carry over |
| ✅ D8 | **6 skills: half, run, twist, bracket, gimmick, drill.** Tagged when coverage passes a tuned threshold; official title charts are always tagged. Finer tags appear only in the detail sheet | |
| ✗ D7/D10/D23 | Unclear as asked ("don't get it") → re-asked in plain words in round 3 | |

**Round 3 — 2026-10-13** (answered on mockups)

| # | Decision | Note |
|---|---|---|
| ✅ D10 | **Data refresh on request**: Claude runs `npm run piu:data`, shows what changed, commits | D7 (two sources, pumpout pinned) and D23 (data bundled into the lazy Pump chunk) are engineering defaults with no visible trade-off; kept as proposed |
| ✅ D11/D17 | **One row per chart, sorted by level, sticky level headers** | |
| ✅ D12 | **Search in the bottom bar** (with the keyboard fix; move to the top only if it fails on the phone) | |
| ✅ D13 | **7×4 level grid, tap start then end; ranges only** | "Separate levels" was left unanswered → default (ranges only). Presets cover separate levels |
| ✅ D14 | **Skills: any by default, with an any/all switch** | |
| ✅ D16 | **Bottom bar: S/D (+HD when Steam Link is on), level range, selected skills, Clear; search + Filters (n)** | |
| ✅ D20 | **Presets in v1**, as chips at the top of the Filters sheet | |
| ✅ Nav | **Charts \| Titles tabs in the header** | |
| ✅ D15 | **Back closes the open sheet, otherwise leaves Pump** | |
| ✗ D19 | Chart sheet mockup was read as a search result → re-asked as a tap-a-row flow in round 4 | |

**Round 4 — 2026-10-13** (answered on mockups)

| # | Decision | Note |
|---|---|---|
| ✅ D19 | **Tapping a row opens a sheet over the list** with that chart's details: title, artist, type, debut version, BPM, step artist, old level if changed, skill bars, and its title with an "earned" tick. Back or swipe down returns to the same place | |
| ✅ Empty | **No results → suggest which filter to remove**, with the count each removal would give, plus Clear all | |
| ✅ D22 | **Add `@tanstack/react-virtual`** (8 KB) for the list | The one new runtime dependency |
| ✅ D9 detail | **Wicked Legend D21 stays out** (not a title chart). No objection raised | |

**Frontier empty: every §2 decision is settled.** Next: the user confirms the shared understanding → `spec.md` → user review → task-by-task plan.

---

## 1. Goal

A third Nook mini-app, next to Split and Hub. It lists the Pump It Up charts you can play at the arcade. You narrow them down one-handed, between songs, by combining filters:
- mode;
- a level range;
- skills: half, run, twist, bracket, gimmick;
- song type and version;
- free-text search on title and artist.

It works offline, like the rest of Nook.

**Success looks like:**
- From opening the app to a short list of charts takes ≤ 3 taps (e.g. "D, Lv 20–22, twist").
- Every chart in the game version you play is listed at its correct level. No UCS charts, no Co-op charts.
- The list scrolls smoothly on your phone, and works in airplane mode after the first open.

**Out of scope for v1** (each can be a later feature):
- score or clear tracking;
- signing in to piugame.com;
- tracking title progress;
- UCS and Co-op;
- a desktop layout.

---

## 2. Decisions to grill

Legend: ★ = recommended default. "Affects" names the parts of §4–§5 that change if you pick differently.

### A. Purpose and scope

| # | Question | Options | ★ Default and why | Affects |
|---|---|---|---|---|
| D1 | What do you mainly do with the list at the arcade? | a) practise a skill at my level · b) chase the official skill titles · c) keep a personal to-play list · d) pick something random | ★ **a + d.** Filtering is the core and a random pick is cheap. Official title charts get a badge and a filter (b-lite). Personal lists wait for v2 | Whole UI; whether a store of "my charts" exists |
| D2 | **Which game version does your arcade run?** | a) PHOENIX 2 only · b) a version switch (FIESTA … PHOENIX 2) that changes which charts exist and their levels | ★ **Ask first.** If every machine you play is PHOENIX 2, pick (a). If some run FIESTA 2, PRIME or XX, pick (b): pumpout has per-version chart lists and levels, but the data file grows | Data shape (§4.2), Phase 1 |
| D3 | Which songs are in the list? | a) every song playable in the chosen version, old ones included · b) only songs that debuted in FIESTA or later (the handoff's rule) | ★ **a**, plus a "Version" filter so you can still hide older songs. Dropping 1st~ZERO and NX songs would hide charts you can actually play | Data build filter |
| D4 | Which chart kinds are included? | Single, Double, Premium-mode-only charts (172), Steam-Link-only content (P2's Half-Double mode, 790 charts, and the 10 RISE songs, 87 charts), Co-op, UCS | ★ Include S and D. Include Premium-only charts with an icon. Include Steam-Link-only content, **hidden by default** behind one "Steam Link" filter. Exclude Co-op and UCS at build time. No HIDDEN icon: the verification found no source that flags hidden charts in P2 | Data build, filter defaults |
| D5 | What does "half" mean to you? | a) Double charts that stay on the middle panels (the official [HALF] titles) · b) P2's Half-Double mode · c) both | ★ **a as the skill, b as a mode.** "Half" becomes a skill tag, and "Half-Double" is a mode chip next to S and D | Skill mapping (§4.3), mode facet |

### B. Data

| # | Question | Options | ★ Default and why | Affects |
|---|---|---|---|---|
| D6 | **Licence: how do we ship third-party data in a public repo and a public site?** | a) commit derived facts only, credit the sources, ask the maintainers before merging to `main` · b) keep data out of the repo: the build script makes a file you import on your phone (like the Settings backup) · c) a separate private repo or deploy | ★ **a.** Commit only facts our script produces (title, artist, level, mode, type, version, category, BPM range, skill tags), never step data or piucenter chart JSONs. Ask aaaaaa2493 (pumpout-db-updates) and DrMurloc (PIU Scores) before the PR merges, because `main` auto-deploys publicly. (b) is the fallback if either says no | Phase 0, repo contents |
| D7 | Which sources feed the build | pumpout SQLite · PIU Scores public CSV · piucenter snapshot (34 MB) · step files | ★ **Two sources.** pumpout gives levels, version history, Half-Double mode and the Premium/Steam-Link labels; pin it by commit SHA. The **public PIU Scores CSV** (`Columns=…,SkillEmphasis`, no login) gives song type, channel, debut version, step artist, top-3 badges and 29 per-skill coverage columns. They join on title + cut + mode + level for 4,653 of 4,675 rows (99.5%); a 4-entry alias table covers the rest. The snapshot is not needed. Step files are only needed for gimmick "likely" (D9) | Data build |
| D8 | Skill rule for run, twist, bracket, half | top-3 badges only · per-skill coverage with a threshold | ★ **Coverage with a threshold, tuned so the official title charts land in the right skill.** Top-3 alone misses charts; "any segment" flags 86% of charts for run. The 87 RISE charts and 11 others have no skill data | Skill mapping (§4.3) |
| D9 | Gimmick | a) official list only (about 30 title charts plus patch-note gimmick edits) · b) official plus a derived "likely" flag from step-file timing · c) skip gimmick in v1 | ★ **b, shown as two levels**: "official" (solid tag) and "likely" (outlined). Cost: it adds the step files as a third source (rayden's `.ssc`, pinned by SHA; joins 97.9% of P2 S/D charts). The rule is tuned in Phase 1. If it can't stay under ~15% of charts while catching the official ones, fall back to (a) | Skill mapping, row UI, Phase 1 size |
| D10 | How is data refreshed when Andamiro patches? | manual script run · scheduled CI | ★ **Manual**: `npm run piu:data`, read the report, commit. Patches come every month or two. The CSV is live and can't be pinned, so the script saves a dated copy and the report diffs it against the last build: new, removed and re-rated charts, plus skill changes | Phase 1, docs |

### C. Screens

| # | Question | Options | ★ Default and why | Affects |
|---|---|---|---|---|
| D11 | List layout | a) one row per chart under sticky level headers · b) one row per song with chart chips | ★ **a.** You pick charts, and a filtered list rarely has two charts of one song at the same level. Research-ui §2 | List component, virtualiser choice |
| D12 | Search position | bottom bar (thumb) · top header | ★ **Bottom**, with a keyboard fix (`visualViewport`). Test on your phone in Phase 3. If it flickers, move it to the top | Dock component |
| D13 | Level picker | 7×4 grid, tap start then end · two steppers · slider | ★ **Grid.** Each cell is 44 px. Ranges are contiguous only. No slider: one level is ~2 mm wide on a slider | Filter sheet |
| D14 | Skills logic | any (OR) · all (AND) | ★ **Any by default, with an any/all switch.** The summary line spells it out ("twist or bracket") | Filter logic |
| D15 | Back button | each chip tap is a history step · Back only closes sheets and leaves | ★ **Back closes the open sheet, then leaves the screen.** Chip taps replace the URL rather than adding history; ten taps shouldn't mean ten Backs | URL state |
| D16 | Promoted filters in the bottom bar | Mode, level, selected skills, Clear · plus song type | ★ **Mode, level, selected skills, Clear.** Everything else lives in the Filters sheet | Dock component |
| D17 | Sort | level ascending, then title · title | ★ **Level ascending**, matching the in-game level folders | List |
| D18 | Random pick | yes · no | ★ **Yes.** A die button picks one chart from the current results and opens it | Dock, detail sheet |
| D19 | What a chart shows when tapped | — | ★ A **sheet over the list**, so the list keeps its scroll position. It shows title (+ Korean), artist, BPM, type, category, debut version, step artist, all skill tags with coverage bars, an official-title badge, and any level change since PHOENIX | Detail sheet |
| D20 | Presets | yes in v1 · later | ★ **Yes**: "Save current…" plus a chip row in the sheet. They are cheap (they store the URL query) and fit "my S18–20 twist practice" | Store |
| D21 | Name and icon in the launcher | "Pump", "PIU", "Charts" … | ★ **"Pump"** with lucide's `Footprints` icon. Description: "Find charts to play" | Registry |

### D. Engineering

| # | Question | Options | ★ Default and why | Affects |
|---|---|---|---|---|
| D22 | New dependency `@tanstack/react-virtual` (8 KB gzip, MIT) | accept · render all with `content-visibility` | ★ **Accept.** Rendering all 5,000+ rows costs ~1 s on a mid-range phone; a virtual window costs ~12 ms. It is the first new runtime dependency since Hub, which had a "no new deps" rule | package.json |
| D23 | How the data loads | import the JSON in a lazy route chunk · fetch `/piu/charts.json` | ★ **Import inside a lazy-loaded route**, so it is precached with the JS, the launcher stays light, and no Workbox pattern changes are needed. The chunk must stay under Workbox's 2 MiB per-file limit (budget: ≤ 600 KB raw) | App.tsx, vite.config |
| D24 | Fix the shared Dialog while we're here | yes · no | ★ **Yes.** Make the close button 44×44, add reduced-motion variants and a sticky footer slot. Small, and Split and Hub benefit too | `src/shared/ui/dialog.tsx` |
| D25 | Branch and PR | `feature/piu-charts` from `origin/main` | ★ **Yes**, one PR. Commits per phase | Git |

---

## 3. What the user sees (as decided)

```
Charts tab (390 px)                          Filter sheet
+------------------------------------------+ +------------------------------------------+
| <  Pump          [ Charts | Titles ]     | | Filters                     Reset  [ X ] |
|    212 charts · 141 songs                | | [D20-22 twist] [S18-20 run] [+ Save]      |
+------------------------------------------+ |------------------------------------------|
| LV 18 · 64                               | | Mode · any of                            |
| [S18] Song title A               twist   | | [✓ Single 2,752][✓ Double 1,783]         |
|       Artist · Full Song · FIESTA  run   | | Level · 18–20                            |
| [D18] Song title B          bracket 🏆   | | [ 1][ 2][ 3][ 4][ 5][ 6][ 7]             |
|       Artist · PRIME 2                   | | [ 8][ 9][10][11][12][13][14]             |
|   … virtualised …                        | | [15][16][17][18][19][20][21]  ← in range |
| LV 19 · 51                               | | [22][23][24][25][26][27][28]             |
+------------------------------------------+ | Skills   ( any of | all of )             |
| [✓S][✓D][Lv 18–20][twist ✕][Clear]       | | [✓twist][run][bracket][half][drill][gim] |
| [ 🔍 Search title, artist ] [Filters 3]  | | Song type · Version · Title charts only   |
+------------------------------------------+ | Steam Link (HD mode, RISE) · Premium     |
                                             |------------------------------------------|
Titles tab                                   | [          Show 212 charts            ]  |
+------------------------------------------+ +------------------------------------------+
| <  Pump          [ Charts | Titles ]     |
|    12 / 90 earned                        |  Chart sheet (tap a row)
| TWIST D · 3 / 10                         |  +------------------------------------------+
|  ☑ Lv.3 Dignity D17                      |  | [D21] Love is a Danger Zone              |
|  ☐ Lv.4 Final Audition 2 D18          >  |  | Artist · type · debut · BPM · step artist|
| HALF · 1 / 10                            |  | was D20 in PHOENIX (when changed)        |
|  ☐ Lv.2 Butterfly D17                 >  |  | twist ███████░░░  run ████░░░░░░  …      |
|   … 9 tracks …                           |  | 🏆 TWIST D Lv.7 · needs SSS  [☐ earned]  |
+------------------------------------------+  +------------------------------------------+
```

The HD mode chip appears in the bottom bar only while the Steam Link filter is on.

Behaviour:
- **Search** filters as you type: accents stripped, case ignored, half-typed Korean matches. Every typed word must appear somewhere. Title-prefix matches rank first.
- **Filters** apply live. The sheet button shows the live count, and every way of closing the sheet keeps the changes.
- **Combining**: OR within one facet, AND across facets. Skills have the any/all switch.
- **Counts** appear on each option, computed with the other facets applied.
- **Zero results** shows one button per active filter, each with the count that removing it would give ("Remove bracket → 18 charts"), plus Clear all.
- **State**: the URL holds the live filters (`#/pump?m=S,D&lv=18-20&sk=twist`). Chip taps replace the URL entry, so Back never steps through filters. The last-used filters, presets and earned titles survive restarts. Opening the app with no filters restores the last ones.
- **Back**: closes the open sheet; otherwise leaves Pump.
- **Earned titles** can be ticked on the Titles tab or in a chart's sheet. They're included in Settings → backup.

---

## 4. How it's built

### 4.1 Files

```text
scripts/piu-data/
  build.mjs                 entry: download pinned sources → join → map → write JSON + report
  sources.mjs               pinned raw.githubusercontent URLs at commit SHAs (pumpout .db, title lists, .ssc) + the CSV URL
  pumpout.mjs               read SQLite → songs, charts, levels, labels for the chosen version(s)
  piuscores.mjs (+ .test)   fetch + parse the CSV (quoted titles with commas) → metadata + skill coverage; save a dated copy
  join.mjs (+ .test.mjs)    pumpout ↔ CSV on title + cut + mode + level, with the alias table (research.md §6)
  skills.mjs (+ .test.mjs)  coverage → run / twist / bracket / half / drill; title charts always tagged
  titles.mjs (+ .test.mjs)  P2 ladders (9 tracks × 10) for the Titles tab; gimmick = XX + P1 [GIMMICK] + P2 [GIMMICK] + [SLOW],
                            matched by pumpout chart ID (research-gimmick-titles.md)
  report.mjs                counts, unmatched charts, re-rates vs the previous build, title-chart check
  README.md                 how to refresh after a patch

src/apps/pump/
  routes.tsx                /pump (lazy)
  data/charts.json          GENERATED — do not edit
  data/types.ts             Song, Chart, SkillId, Mode, VersionId
  lib/normalize.ts (+test)  NFKD + strip marks + lower-case; tokenise
  lib/search.ts (+test)     token-AND substring match + ranking
  lib/filters.ts (+test)    Filters type, applyFilters, facetCounts, removalCounts (zero-results helper)
  lib/url-state.ts (+test)  Filters ↔ URLSearchParams (parse is forgiving, serialise is canonical)
  lib/summary.ts (+test)    "S or D · Lv 18–20 · twist or bracket"
  lib/titles.ts (+test)     group title charts by track, progress counts ("TWIST D · 3 / 10")
  store/usePumpStore.ts (+test)  persist { lastFilters, presets, earnedTitles }, zod-validated, versioned
  hooks/useKeyboardInset.ts visualViewport → bottom offset for the dock
  components/               ChartList (virtualised + sticky level headers), ChartRow, LevelBadge,
                            SkillTag, FilterDock, ChipRow, FilterSheet, FacetGroup, LevelGrid,
                            AnyAllSwitch, ChartSheet, EmptyResults, PresetBar, PumpTabs, TitleTrack
  pages/PumpHome.tsx        Charts | Titles tabs (tab in the URL: #/pump/titles)

Modified: src/App.tsx (lazy route + Suspense), src/launcher/registry.ts, src/shared/ui/dialog.tsx (D24),
          src/settings/backup.ts (+ earned titles), package.json (+ @tanstack/react-virtual, + "piu:data" script),
          README.md
```

Tests follow the repo's rule: pure logic in Vitest's node environment, no DOM tests. The data script's mapping functions are tested the same way.

### 4.2 Data file shape (draft)

```ts
// charts.json — generated by scripts/piu-data/build.mjs
{
  meta: {
    builtAt: string,                 // ISO date
    game: 'PHOENIX 2', patch: '1.01.0',
    sources: { name: string; url: string; commit: string }[],
  },
  songs: {
    id: string,                      // stable: pumpout song id
    title: string, titleKo?: string, artist: string,
    type: 'ARCADE' | 'SHORTCUT' | 'REMIX' | 'FULLSONG',
    category: 'K-POP' | 'ORIGINAL' | 'WORLD MUSIC' | 'XROSS' | 'RISE',  // P2 channels, from the CSV
    debut: VersionId,                // 'FIESTA' … 'PHOENIX 2', plus older series
    bpm: [min: number, max: number],
  }[],
  charts: {
    song: number,                    // index into songs
    mode: 'S' | 'D' | 'HDB',
    level: number,                   // in `meta.game`
    skills: SkillId[],               // 'half' | 'run' | 'twist' | 'bracket' | 'drill' | 'gimmick'; [] = no skill data
    gimmickFrom?: string[],          // e.g. ['XX Gimmick Lv.3', 'P2 SLOW Lv.2'], shown in the chart sheet
    badges: string[],                // piucenter top-3, for the detail sheet
    coverage?: Record<string, number>, // 0–1 for the 6 skills, for bars in the detail sheet
    flags?: ('PREMIUM' | 'STEAM_LINK')[],
    stepArtist?: string,
    prevLevel?: number,              // level in PHOENIX, when it changed
  }[],
  titles: {                          // PHOENIX 2 skill-title ladders, 9 tracks × 10
    id: string,                      // e.g. 'TWIST_D_7' — the key stored in earnedTitles
    track: 'TWIST S' | 'TWIST D' | 'RUN S' | 'RUN D' | 'DRILL' | 'GIMMICK' | 'SLOW' | 'HALF' | 'BRACKET',
    lv: number,                      // 1–10
    chart: number,                   // index into charts
    needs: 'SSS',
  }[],
}
```

The data budget gets checked in Phase 1.

### 4.3 Skill mapping (to tune in Phase 1)

"coverage(x)" is the CSV's `pc:badge_fraction:x` column: the share of a chart's segments that show skill x, from 0 to 1.

| Skill | Rule (draft) | Tuned against |
|---|---|---|
| run | coverage(`run` ∪ `anchor_run` ∪ `run_without_twists`) ≥ *t₁*, or one of them in top-3 | P2 RUN S + RUN D (20 charts), P1 RUN (10) |
| twist | coverage(`twist_90` ∪ `twist_over90` ∪ `twist_close` ∪ `twist_far`) ≥ *t₂*, or `twists` in top-3 | P2 TWIST S + D (20), P1 TWIST (10) |
| bracket | coverage(any `bracket*` or `staggered_bracket`) ≥ *t₃*, or one in top-3 | P2 BRACKET (10), P1 BRACKET (10) |
| half | mode D **and** coverage(`mid6_doubles`) ≥ *t₄* | P2 HALF (10), P1 HALF (10) |
| drill | coverage(`drill` ∪ `bracket_drill`) ≥ *t₅*, or `drill` in top-3 | P2 DRILL (10), P1 DRILL (10) |
| gimmick | **Fixed list, no threshold**: the 22 P2 charts from the XX, P1 and P2 GIMMICK ladders plus the P2 SLOW ladder | — |

Each threshold is picked so that ≥ 90% of that skill's title charts are tagged, then checked against how many charts the skill tags overall. The report prints both numbers, so you can sanity-check them by eye.

---

## 5. Phases

Each phase ends with green tests, `npx tsc --noEmit` clean, and a commit on `feature/piu-charts`.

### Phase 0 — Decide (no code)
- [x] Grill §2 and record each answer here (rounds 1–4, 2026-10-13).
- [ ] Write `spec.md` from the answers. You review it.
- [ ] Send permission requests to the data maintainers (D6). Drafts go in this folder; you send them.
- [ ] Rewrite this file as the task-by-task plan (writing-plans format).

### Phase 1 — Data pipeline
- [ ] `sources.mjs` pins every GitHub input to a raw.githubusercontent URL at a commit SHA. Downloads are cached outside the repo (git-ignored `.cache/`).
- [ ] Read pumpout for PHOENIX 2 v1.01. Drop Co-op and UCS. Keep Steam-Link (HDB mode, RISE) and Premium charts with flags.
- [ ] Fetch the PIU Scores CSV with the extra columns. Join it to pumpout (`join.mjs`, tested on fixtures, including the alias table).
- [ ] Load the title ladders (P2 tracks for the Titles tab; the gimmick list), then tune the skill thresholds (`skills.mjs`, tested).
- [ ] Write `charts.json` and print the report. **Exit:**
  - 100% of P2 S/D charts have a level;
  - ≥ 97% have skills (the RISE songs have none);
  - all 90 P2 title charts and all 22 gimmick charts are found;
  - the file is ≤ 600 KB;
  - every unmatched chart is listed by name.

  Two known level disagreements stay in the report as warnings: U Got Me Rocking D6 vs D5, and 1948's D chart with no level in pumpout.

### Phase 2 — Core logic (TDD, no UI)
- [ ] `normalize` and `search`, with Korean and accent cases from research-ui §3.3.
- [ ] `filters`: apply, facet counts, removal counts, any/all.
- [ ] `url-state`: round-trip tests; garbage input → defaults.
- [ ] `summary` and `titles` (track grouping and progress).
- [ ] `usePumpStore`: persist `lastFilters`, `presets` and `earnedTitles`, zod-validated, version 1. Add earned titles to the Settings backup.

### Phase 3 — Screens
- [ ] Register the app (D21) and add the lazy route `/pump` with a skeleton fallback.
- [ ] `ChartList`: window virtualiser, fixed 64 px rows, 32 px sticky level headers.
- [ ] `ChartRow`: level badge (letter + colour), title, line 2, up to 2 skill tags, Premium/title-chart icons.
- [ ] `FilterDock` in `BottomBar`: chip row, search, Filters (n). Wire `useKeyboardInset`.
- [ ] `FilterSheet`: presets, mode, level grid, skills with any/all, type, version, title charts only, Steam Link, Premium, live "Show N charts".
- [ ] `ChartSheet` (with the earned tick) and `EmptyResults`.
- [ ] `PumpTabs` and the Titles tab: 9 tracks, progress, ticks, tap → chart sheet.
- [ ] Back closes sheets (push one history entry on open; `popstate` closes).
- [ ] Shared `Dialog` fixes (D24).

### Phase 4 — Check on real devices
- [ ] Preview at 390×844 in light and dark themes. Screenshots go in the PR.
- [ ] Your phone: keyboard over the dock (iOS and/or Android), one-handed reach, a dim room.
- [ ] Install, go to airplane mode, reopen: the list loads.
- [ ] Lighthouse mobile: INP ≤ 200 ms on chip taps; fewer than 800 DOM nodes.

### Phase 5 — Ship
- [ ] Open the PR. Merge only after D6 permission (or the fallback) is settled.
- [ ] Update the "Nook Split, Explained" storyboard with a Pump chapter.
- [ ] Refresh `now/bill-splitter.md`.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| A maintainer says no, or doesn't answer | Fallback D6(b): data stays out of the repo and you import the file on your phone |
| Joining sources misses charts (titles differ) | Alias table plus the report's unmatched list; the Phase 1 exit criteria block on it |
| The PIU Scores CSV changes shape or goes away (it's a live endpoint, not a pinned file) | The build keeps a dated copy and validates the header row with zod. A failed fetch keeps the last committed `charts.json`. The CSV has no CORS headers, so it's only fetched at build time |
| The gimmick list is small (22 charts) and the XX ladder rests on community copies only | It's a fixed, cited list (research-gimmick-titles.md). The report names any title chart that fails to match |
| The keyboard hides the bottom dock | `visualViewport` hook; fallback to search at the top (D12) |
| The data goes stale after a patch | `npm run piu:data` plus the diff report. The app shows "Data: P2 1.01.0, built <date>" in the Presets/about area |
| The window virtualiser fights the route slide animation or sticky headers | Prototype in Phase 3 first. The App wrapper uses `overflow-x: clip` (not `hidden`), so sticky positioning still works |
| The data chunk grows past budget | Budget check in the Phase 1 exit criteria; move `coverage` to a second lazy chunk if needed |
