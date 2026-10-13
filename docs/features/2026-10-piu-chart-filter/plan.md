# Pump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add **Pump**, a third Nook mini-app that lists every PHOENIX 2 chart and filters it one-handed by mode, level, six skills, song type, version and search, with a Titles tab for ticking off the official skill titles.

**Architecture:** A build-time Node script (`scripts/piu-data/`) reads the pinned pumpout SQLite and the public PIU Scores CSV. It joins them, tags skills, resolves the title ladders, and writes one compact, committed `charts.json`. The app lazy-loads that file and decodes it into typed objects. Pure, unit-tested functions do search, filtering, URL state, ordering and title progress. A persisted Zustand store keeps the last filters, presets and earned titles. Presentational React components are wired together in one `PumpHome` page; the URL query string is the live filter state.

**Tech Stack:** Vite 6, React 18.3, TypeScript (strict), Tailwind 3 + shadcn/Radix (`src/shared/ui`), Zustand 5 (`persist`), zod 3, lucide-react, react-router-dom 6 (`HashRouter`), vite-plugin-pwa, Vitest 2 (node environment). New: `@tanstack/react-virtual` (runtime) and `sql.js` (dev only, for the data script).

**Spec:** `docs/features/2026-10-piu-chart-filter/spec.md`. Background: `decisions.md`, `research.md`, `research-ui.md`, `research-gimmick-titles.md` in the same folder.

## Global Constraints

- **New dependencies: exactly two.** `@tanstack/react-virtual@^3` (runtime) and `sql.js@^1` (devDependency). Nothing else.
- **Data source pins:**
  - pumpout-db-updates commit `ed314a8216f9c0dfe7cef29a1de5ce84ec4f1e44`, file `db/pumpout-phoenix-2-1.01.db`.
  - Version IDs inside it: **201** = PHOENIX 2 v1.01.0 and **199** = PHOENIX v2.12.0.
  - PIU Scores CSV: `https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType,Badges,SkillEmphasis`.
- **Included charts:** P2 modes `S`, `D` and `HDB`. Co-Op and anything labelled `UCS` are excluded.
- **Skill order is fixed everywhere:** `['half', 'run', 'twist', 'bracket', 'drill', 'gimmick']`.
  - Bit *i* of a chart's `sk` mask is `SKILLS[i]`.
  - `cov` holds the first five, as 0–100.
- **Flags bitmask:** `1` = Premium mode exclusive, `2` = Steam Link exclusive.
- **Size budget:** `src/apps/pump/data/charts.json` ≤ **600,000 bytes**. The build enforces it, and a test enforces it too.
- **App identity:** id `pump`, name `Pump`, lucide `Footprints` icon, description `Find charts to play`, route `#/pump`.
- **URL params:** `m`, `lv`, `sk`, `all`, `ty`, `v`, `tc`, `sl`, `np`, `q` are filters; `tab`, `f`, `c`, `a` are UI state. Their meanings are in spec §Runtime.
- **Store:** key `pump-store`, version 1. It persists `{ lastFilters, presets, earnedTitles }`. At most **12** presets.
- **Tap targets ≥ 44 px**, or a hit area extended to 44 px.
- **Colours** come only from tokens (`bg-primary`, `text-muted-foreground` …); no hex values in components. The mode is never shown by colour alone.
- **Tests** are pure logic in Vitest's node environment. No DOM tests. Run `npm test` (= `vitest run`) and `npx tsc --noEmit`.
- **Git:**
  - Work on `feature/piu-charts`; `main` changes only through a PR.
  - Every commit ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - The PR is **not merged** until both data maintainers have answered (spec §Licensing).

**Where this plan refines the spec** (implementation details found while planning; the user-visible behaviour is unchanged):
1. **Song metadata** (song type, channel, series, BPM, Korean title) comes from **pumpout**, not the CSV, so Half-Double songs (absent from the CSV) get it too. pumpout's `J-MUSIC` channel maps to `WORLD MUSIC`. Each song's series is the mix of its first `INSERT`/`EXISTS` row, which the verification checked: 376/376.
2. **The CSV supplies only** skill coverage and top-3 badges, joined on title + cut + mode + level. The join rules come from a prototype that matched **4,535 / 4,535** P2 S/D charts:
   - two title aliases;
   - a "- SHORT CUT -" suffix overrides the CSV's song type (PRiMA MATERiA);
   - a chart with no pumpout level matches on title + cut + mode (1948 D29).
3. **`charts.json` is compact.** It uses short keys, a skill bitmask, and lookup tables for badge names and step artists, because a readable version measured ~655 KB. The app imports it with `?raw` and decodes it once, so TypeScript never infers a type from the 5,000-row JSON.
4. **Skill score = the max of the skill's coverage columns.** The prototype scored title charts better with max than with sum.
   - Prototype thresholds at a 90% title-hit target: run 0.286, twist 0.429, bracket 0.444, half 0.25, drill 0.333.
   - With the top-3 badge rule, they tag about run 58% · twist 43% · bracket 26% · half 24% · drill 25% of S/D charts.
   - `TITLE_HIT_TARGET` and the badge rule are named constants in `skills.mjs`, so they can be tightened after the user has looked at them.
5. **The `charts.json` schema is checked by a Vitest test** over the committed file. The build script runs its own checks; it doesn't import TypeScript.
6. **`PageHeader` gains** a forwarded `ref`, a `children` slot (for the Charts | Titles tabs) and a `ReactNode` subtitle (for the `role="status"` count).
7. **The About dialog** also opens through a URL param (`a=1`), so Back closes it like the other sheets.

## Review Focus

1. **Editing filters in the open Filters sheet, then closing it with Back, ✕ or "Show N charts".** The changes must still be applied afterwards. Filter taps replace the pushed `f=1` entry, so the entry below still holds the old filters. *Tests added in Task 10 (`mergeLiveFilters`, `paramsAfterClose`). The hook in Task 14 must also keep the history-state marker on every replace.*
2. **Turning "Show Steam Link charts" off while the HD mode chip is selected.** HD must be dropped from the modes, not leave an empty list. *Tests added in Task 9 (`withSteamLink`) and Task 10 (`parseFilters` drops `HDB` without `sl=1`).*
3. **Earned-title IDs that no longer exist after a data refresh.** They're ignored in progress counts and never crash; storage keeps them. *Test added in Task 11.*
4. **Backup files**:
   - one made before Pump existed still imports;
   - one with `apps.pump` restores the ticks;
   - a malformed `apps.pump` is rejected.
   *Tests added in Task 12.*
5. **Odd level values in a URL or preset** (`lv=29-18`, `lv=0`, `lv=abc`, `lv=99`). They're normalised or ignored, never thrown. The grid only offers levels that exist in the data. *Tests added in Task 10.*

---

## File Structure

```text
scripts/piu-data/
  fold.mjs (+ fold.test.mjs)             title join key: NFKD, strip marks, lower-case, letters/digits only
  cache.mjs                              fetchCached(url, name, { refresh }) into .cache/piu-data/
  sources.mjs                            pinned inputs (pumpout commit + version IDs, CSV URL)
  piuscores.mjs (+ .test.mjs)            parseCsv, readPiuScores → S/D rows with badges + coverage
  pumpout.mjs (+ .test.mjs)              readPumpout(db, { version, prevVersion }) → { songs, charts }
  join.mjs (+ .test.mjs)                 titleKey, joinCoverage → { byChart, unmatched }
  ladders.json                           P2 (90), P1 (60), XX (10) title charts as pumpout chart IDs, cited
  titles.mjs (+ .test.mjs)               resolveLadders → { titles, forced, gimmickFrom, missing }
  skills.mjs (+ .test.mjs)               SKILLS, skillScore, pickThreshold, tagSkills, computeThresholds, skillsFor, skillStats
  encode.mjs (+ .test.mjs)               encodeCatalog, stringifyCatalog
  report.mjs (+ .test.mjs)               diffCatalogs, checkCatalog, renderReport
  build.mjs                              entry for `npm run piu:data`
  README.md                              refresh steps

src/apps/pump/
  data/types.ts                          Mode, SkillId, SongType, Series, Track, Song, Chart, Title, Catalog + const lists
  data/schema.ts                         zod schema of the compact charts.json
  data/catalog.ts (+ catalog.test.ts)    decodeCatalog, getCatalog (imports charts.json?raw)
  data/charts.json                       GENERATED by `npm run piu:data`
  lib/normalize.ts (+ test)              fold, tokens
  lib/labels.ts                          MODE_SHORT, MODE_LABEL, SONG_TYPE_LABEL, levelLabel, modesLabel, chartLine2, titleName
  lib/__fixtures__/charts.ts             makeSong, makeChart for tests
  lib/search.ts                          matchesSearch
  lib/filters.ts (+ test)                Filters, defaultFilters, applyFilters, facetCounts, removalSuggestions, toggleValue, withSteamLink
  lib/url-state.ts (+ test)              parseFilters, serializeFilters, withFilters, hasFilterParams, mergeLiveFilters, paramsAfterClose
  lib/level-range.ts (+ test)            nextLevelRange
  lib/summary.ts (+ test)                summarize, activeFacetCount
  lib/order.ts (+ test)                  sortCharts, toRows, rowSkills
  lib/titles.ts (+ test)                 trackViews, earnedCount
  store/usePumpStore.ts (+ test)         persisted lastFilters / presets / earnedTitles
  hooks/usePumpFilters.ts                URL ↔ Filters, tab, restore last filters
  hooks/useSheetParam.ts                 sheet open/close through a pushed URL param; re-apply filters on close
  hooks/useKeyboardInset.ts              visualViewport keyboard height
  components/LevelBadge.tsx, SkillTag.tsx, ChartRow.tsx, ChartList.tsx, EmptyResults.tsx,
             Chip.tsx, FilterDock.tsx, FacetGroup.tsx, LevelGrid.tsx, AnyAllSwitch.tsx, PresetBar.tsx,
             SheetGrabber.tsx, FilterSheet.tsx, EarnedToggle.tsx, ChartSheet.tsx, AboutDialog.tsx,
             TitleTrack.tsx, TitlesTab.tsx, PumpHeader.tsx, PumpSkeleton.tsx
  pages/PumpHome.tsx                     default export, the container
  routes.tsx                             lazy /pump route

Modified:
  package.json, package-lock.json        deps + "piu:data" script
  .gitignore                             .cache/
  src/shared/ui/dialog.tsx               44 px close target; motion-reduce
  src/shared/components/BottomBar.tsx    optional style prop
  src/shared/components/PageHeader.tsx   forwardRef, children, ReactNode subtitle
  src/settings/backup.ts (+ test)        optional apps.pump.earnedTitles
  src/App.tsx                            {pumpRoutes}
  src/launcher/registry.ts               Pump entry
  README.md                              Pump section
```

Test command for every task: `npm test`. Type check: `npx tsc --noEmit`. A single test file: `npx vitest run <path>`.

---

### Task 1: Data script foundations

**Files:**
- Modify: `package.json`, `package-lock.json`, `.gitignore`
- Create: `scripts/piu-data/fold.mjs`, `scripts/piu-data/fold.test.mjs`, `scripts/piu-data/cache.mjs`, `scripts/piu-data/sources.mjs`

**Interfaces:**
- Produces:
  - `fold(s: string): string`
  - `fetchCached(url: string, name: string, opts?: { refresh?: boolean }): Promise<Buffer>`
  - `PUMPOUT = { name, repo, commit, file, url, version: 201, prevVersion: 199, patch: '1.01.0' }`
  - `PIUSCORES = { name, site, url }`

- [ ] **Step 1: Make sure you are on the branch and the tree is current**

Run: `git switch feature/piu-charts && git pull --ff-only && npm install`
Expected: on `feature/piu-charts`; install finishes without errors.

- [ ] **Step 2: Add the two dependencies, the script entry and the cache ignore**

Run: `npm install @tanstack/react-virtual@^3` then `npm install -D sql.js@^1`

Then edit `package.json` `"scripts"` to add `"piu:data"` after `"test:watch"`:

```json
    "test:watch": "vitest",
    "piu:data": "node scripts/piu-data/build.mjs"
```

Append to `.gitignore`:

```gitignore

# PIU data build downloads (scripts/piu-data)
.cache/
```

- [ ] **Step 3: Write the failing test for `fold`**

Create `scripts/piu-data/fold.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { fold } from './fold.mjs'

describe('fold', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(fold('Love is a Danger Zone(Cranky Mix)')).toBe(fold('love is a danger zone (cranky mix)'))
    expect(fold('Phalanx "RS2018 edit"')).toBe('phalanxrs2018edit')
    expect(fold('WI-EX-DOC-VA')).toBe('wiexdocva')
  })
  it('strips accents', () => {
    expect(fold('Café')).toBe('cafe')
  })
  it('keeps Korean and Japanese text', () => {
    expect(fold('사랑 했다')).toBe(fold('사랑했다'))
    expect(fold('사랑')).not.toBe('')
    expect(fold('ナナヒラ')).not.toBe('')
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run scripts/piu-data/fold.test.mjs`
Expected: FAIL. The module `./fold.mjs` can't be found.

- [ ] **Step 5: Implement `fold`, the cache helper and the sources**

Create `scripts/piu-data/fold.mjs`:

```js
/**
 * Join key for song titles across sources: NFKD (so accents and full-width
 * forms fold), strip combining marks, lower-case, keep only letters and digits.
 */
export function fold(s) {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}
```

Create `scripts/piu-data/cache.mjs`:

```js
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const CACHE_DIR = path.resolve('.cache/piu-data')

/**
 * Download `url` into .cache/piu-data/<name> once; later calls read the cached
 * copy unless `refresh` is set. Throws on a non-2xx response.
 */
export async function fetchCached(url, name, { refresh = false } = {}) {
  const file = path.join(CACHE_DIR, name)
  if (!refresh && existsSync(file)) return readFile(file)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, buf)
  return buf
}
```

Create `scripts/piu-data/sources.mjs`:

```js
/**
 * Every input of the Pump data build. Bump `PUMPOUT.commit` (and the version
 * IDs, file and patch if the game moved on) when Andamiro patches; see README.md.
 */
const PUMPOUT_REPO = 'aaaaaa2493/pumpout-db-updates'

export const PUMPOUT = {
  name: 'pumpout-db-updates',
  repo: `https://github.com/${PUMPOUT_REPO}`,
  commit: 'ed314a8216f9c0dfe7cef29a1de5ce84ec4f1e44',
  file: 'db/pumpout-phoenix-2-1.01.db',
  get url() {
    return `https://raw.githubusercontent.com/${PUMPOUT_REPO}/${this.commit}/${this.file}`
  },
  /** `version.versionId` rows inside the .db */
  version: 201, // PHOENIX 2 v1.01.0
  prevVersion: 199, // PHOENIX v2.12.0 — for "was D20 in PHOENIX"
  patch: '1.01.0',
}

export const PIUSCORES = {
  name: 'PIU Scores',
  site: 'https://piuscores.arroweclip.se',
  url: 'https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType,Badges,SkillEmphasis',
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run scripts/piu-data/fold.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/piu-data/fold.mjs scripts/piu-data/fold.test.mjs scripts/piu-data/cache.mjs scripts/piu-data/sources.mjs
git commit -m "chore(pump): data script foundations and dependencies" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PIU Scores CSV reader

**Files:**
- Create: `scripts/piu-data/piuscores.mjs`, `scripts/piu-data/piuscores.test.mjs`

**Interfaces:**
- Produces:
  - `parseCsv(text: string): string[][]`
  - `readPiuScores(text: string): Row[]`, where `Row = { song: string, mode: 'S'|'D', level: number, songType: string, badges: string[], coverage: Record<string, number> }`. Co-Op rows are skipped; coverage keys are piucenter skill names (`run`, `twist_90`, `mid6_doubles`, …), with values 0–1.
  - `COVERAGE_PREFIX = 'pc:badge_fraction:'`

- [ ] **Step 1: Write the failing tests**

Create `scripts/piu-data/piuscores.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { parseCsv, readPiuScores } from './piuscores.mjs'

const HEADER =
  'ChartId,Song,Type,Level,SongType,Badges,pc:badge_fraction:run,pc:badge_fraction:twist_90,pc:badge_fraction:mid6_doubles'

describe('parseCsv', () => {
  it('handles quoted fields with commas and doubled quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })
  it('handles CRLF, a BOM and a missing final newline', () => {
    expect(parseCsv('﻿x,y\r\n1,2')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ])
  })
})

describe('readPiuScores', () => {
  it('reads S/D rows with badges and coverage, skipping Co-Op', () => {
    const text = [
      HEADER,
      'g1,"Conflict",D,25,Arcade,Anchor Runs; Runs; Sustained,0.5,,0.25',
      'g2,"Love is a Danger Zone(Cranky Mix)",S,21,Arcade,Twists,,0.7143,',
      'g3,Some Co-op,CoOp,2,Arcade,,,,',
    ].join('\n')
    expect(readPiuScores(text)).toEqual([
      {
        song: 'Conflict',
        mode: 'D',
        level: 25,
        songType: 'Arcade',
        badges: ['Anchor Runs', 'Runs', 'Sustained'],
        coverage: { run: 0.5, mid6_doubles: 0.25 },
      },
      {
        song: 'Love is a Danger Zone(Cranky Mix)',
        mode: 'S',
        level: 21,
        songType: 'Arcade',
        badges: ['Twists'],
        coverage: { twist_90: 0.7143 },
      },
    ])
  })
  it('names the missing columns when the export changes shape', () => {
    expect(() => readPiuScores('ChartId,Song,Level\n1,x,2')).toThrow(/missing columns: Type, SongType, Badges/)
  })
  it('refuses an export without SkillEmphasis coverage', () => {
    expect(() => readPiuScores('Song,Type,Level,SongType,Badges\nx,S,2,Arcade,')).toThrow(/coverage/)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run scripts/piu-data/piuscores.test.mjs`
Expected: FAIL. The module `./piuscores.mjs` can't be found.

- [ ] **Step 3: Implement**

Create `scripts/piu-data/piuscores.mjs`:

```js
export const COVERAGE_PREFIX = 'pc:badge_fraction:'
const REQUIRED = ['Song', 'Type', 'Level', 'SongType', 'Badges']

/** Small RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF, optional BOM. */
export function parseCsv(text) {
  const s = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** PIU Scores chart export → one record per Single/Double chart. */
export function readPiuScores(text) {
  const [header, ...body] = parseCsv(text)
  const missing = REQUIRED.filter((h) => !header.includes(h))
  if (missing.length) throw new Error(`PIU Scores CSV is missing columns: ${missing.join(', ')}`)
  if (!header.some((h) => h.startsWith(COVERAGE_PREFIX))) {
    throw new Error('PIU Scores CSV has no skill coverage columns (add SkillEmphasis to Columns=)')
  }
  const at = Object.fromEntries(header.map((h, i) => [h, i]))
  const out = []
  for (const r of body) {
    const mode = r[at.Type]
    if (mode !== 'S' && mode !== 'D') continue
    const coverage = {}
    header.forEach((h, i) => {
      if (h.startsWith(COVERAGE_PREFIX) && r[i] !== undefined && r[i] !== '') {
        coverage[h.slice(COVERAGE_PREFIX.length)] = Number(r[i])
      }
    })
    out.push({
      song: r[at.Song],
      mode,
      level: Number(r[at.Level]),
      songType: r[at.SongType],
      badges: (r[at.Badges] ?? '').split(';').map((b) => b.trim()).filter(Boolean),
      coverage,
    })
  }
  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/piu-data/piuscores.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/piu-data/piuscores.mjs scripts/piu-data/piuscores.test.mjs
git commit -m "feat(pump): PIU Scores CSV reader" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: pumpout reader

The pumpout file is a SQLite database (schema in research.md §3.2 and §6.2). A song or chart is present in a version when its latest operation among that version's ancestors is not `DELETE` (operationId 2). Its level is its latest `chartRatingVersion` among the ancestors.

**Files:**
- Create: `scripts/piu-data/pumpout.mjs`, `scripts/piu-data/pumpout.test.mjs`

**Interfaces:**
- Consumes: `fold` (Task 1).
- Produces:
  - `readPumpout(db, { version, prevVersion })` takes a sql.js `Database` and returns `{ songs: Map<number, PSong>, charts: PChart[] }`, where:
    - `PSong = { id, title, names: string[], titleKo: string|null, artist: string, cut: 'ARCADE'|'SHORTCUT'|'REMIX'|'FULLSONG', channel: string|null, series: Series, bpm: [number, number]|null }`
    - `PChart = { id, songId, mode: 'S'|'D'|'HDB', level: number|null, prevLevel: number|null, premium: boolean, steamLink: boolean, stepArtist: string|null }`
  - `SERIES_BY_MIX`, `CHANNEL_BY_CATEGORY`, `CUT_BY_NAME`.

- [ ] **Step 1: Write the failing test with a small in-memory database**

Create `scripts/piu-data/pumpout.test.mjs`:

```js
import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { readPumpout } from './pumpout.mjs'

// The subset of pumpout's schema that readPumpout reads.
const DDL = `
CREATE TABLE mix (mixId INT, internalTitle TEXT, sortOrder INT);
CREATE TABLE version (versionId INT, mixId INT, sortOrder INT);
CREATE TABLE _derived_versionAncestor (versionId INT, ancestorId INT, ancestorSortOrder INT);
CREATE TABLE operation (operationId INT, internalTitle TEXT);
CREATE TABLE cut (cutId INT, internalTitle TEXT);
CREATE TABLE song (songId INT, cutId INT, internalTitle TEXT);
CREATE TABLE language (languageId INT, code TEXT);
CREATE TABLE songTitle (songTitleId INT, songId INT, languageId INT, title TEXT);
CREATE TABLE songVersion (songId INT, versionId INT, operationId INT);
CREATE TABLE chart (chartId INT, songId INT);
CREATE TABLE chartVersion (chartId INT, versionId INT, operationId INT);
CREATE TABLE mode (modeId INT, internalAbbreviation TEXT);
CREATE TABLE difficulty (difficultyId INT, value INT);
CREATE TABLE chartRating (chartRatingId INT, chartId INT, modeId INT, difficultyId INT);
CREATE TABLE chartRatingVersion (chartRatingId INT, chartId INT, versionId INT);
CREATE TABLE label (labelId INT, internalTitle TEXT);
CREATE TABLE chartLabel (chartLabelId INT, chartId INT, labelId INT);
CREATE TABLE chartLabelVersion (chartLabelId INT, versionId INT, operationId INT);
CREATE TABLE stepmaker (stepmakerId INT, internalTitle TEXT);
CREATE TABLE chartStepmaker (chartId INT, stepmakerId INT, sortOrder INT);
CREATE TABLE artist (artistId INT, internalTitle TEXT);
CREATE TABLE songArtist (songId INT, artistId INT, sortOrder INT);
CREATE TABLE songBpm (songBpmId INT, songId INT, bpmMin REAL, bpmMax REAL);
CREATE TABLE category (categoryId INT, internalTitle TEXT);
CREATE TABLE songCategory (songCategoryId INT, songId INT, categoryId INT);
CREATE TABLE songCategoryVersion (songCategoryId INT, songId INT, versionId INT);
`

// Versions: 1 = XX, 2 = PHOENIX, 3 = PHOENIX 2. Operations: 1 INSERT, 2 DELETE.
const DATA = `
INSERT INTO mix VALUES (34,'XX',550),(35,'Phoenix',560),(36,'Phoenix 2',570);
INSERT INTO version VALUES (1,34,10),(2,35,20),(3,36,30);
INSERT INTO _derived_versionAncestor VALUES (1,1,10),(2,1,10),(2,2,20),(3,1,10),(3,2,20),(3,3,30);
INSERT INTO cut VALUES (1,'Short Cut'),(2,'Arcade');
INSERT INTO song VALUES (10,2,'Bee'),(11,2,'Gone Song'),(12,2,'Seoul Song');
INSERT INTO language VALUES (22,'en'),(24,'kr');
INSERT INTO songTitle VALUES (1,10,22,'Bee'),(2,12,22,'Seoul Song'),(3,12,24,'서울 노래');
INSERT INTO songVersion VALUES (10,1,1),(11,1,1),(11,3,2),(12,3,1);
INSERT INTO chart VALUES (100,10),(101,10),(102,10),(103,10),(104,11),(105,10),(106,12),(107,10);
INSERT INTO chartVersion VALUES (100,1,1),(101,1,1),(102,1,1),(103,1,1),(104,1,1),(105,2,1),(106,3,1),(107,1,1),(107,3,2);
INSERT INTO mode VALUES (1,'S'),(2,'D'),(5,'C'),(7,'HDB');
INSERT INTO difficulty VALUES (12,12),(18,18),(19,19),(20,20),(50,NULL);
INSERT INTO chartRating VALUES (1,100,1,18),(2,100,1,19),(3,101,2,20),(4,102,5,12),(5,103,1,12),(6,104,1,12),(7,105,2,50),(8,106,7,20),(9,107,1,12);
INSERT INTO chartRatingVersion VALUES (1,100,1),(2,100,3),(3,101,1),(4,102,1),(5,103,1),(6,104,1),(7,105,2),(8,106,3),(9,107,1);
INSERT INTO label VALUES (1,'UCS'),(40,'PREMIUM MODE EXCLUSIVE'),(41,'STEAM LINK EXCLUSIVE');
INSERT INTO chartLabel VALUES (1,100,40),(2,101,40),(3,103,1),(4,106,41);
INSERT INTO chartLabelVersion VALUES (1,1,1),(1,2,2),(2,3,1),(3,1,1),(4,3,1);
INSERT INTO stepmaker VALUES (1,'BanYa'),(2,'FEFEMZ');
INSERT INTO chartStepmaker VALUES (100,2,1),(100,1,0);
INSERT INTO artist VALUES (1,'BanYa'),(2,'Guest');
INSERT INTO songArtist VALUES (10,1,0),(12,2,1),(12,1,0);
INSERT INTO songBpm VALUES (1,10,140,140),(2,10,147,147),(3,12,90,180);
INSERT INTO category VALUES (2,'WORLD MUSIC'),(3,'ORIGINAL'),(4,'J-MUSIC');
INSERT INTO songCategory VALUES (1,10,3),(2,12,4);
INSERT INTO songCategoryVersion VALUES (1,10,1),(2,12,3);
`

let read
beforeAll(async () => {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run(DDL)
  db.run(DATA)
  read = readPumpout(db, { version: 3, prevVersion: 2 })
})

describe('readPumpout', () => {
  it('keeps live S, D and HDB charts only (no Co-Op, UCS, deleted charts or charts of deleted songs)', () => {
    expect(read.charts.map((c) => c.id).sort()).toEqual([100, 101, 105, 106])
  })
  it('uses the latest rating and reports the previous version level only when it changed', () => {
    const c100 = read.charts.find((c) => c.id === 100)
    expect(c100).toMatchObject({ mode: 'S', level: 19, prevLevel: 18 })
    expect(read.charts.find((c) => c.id === 101)).toMatchObject({ level: 20, prevLevel: null })
  })
  it('keeps an unrated ("??") chart with a null level', () => {
    expect(read.charts.find((c) => c.id === 105)).toMatchObject({ mode: 'D', level: null })
  })
  it('reads only labels that are live in the version', () => {
    expect(read.charts.find((c) => c.id === 100).premium).toBe(false) // removed at v2
    expect(read.charts.find((c) => c.id === 101).premium).toBe(true)
    expect(read.charts.find((c) => c.id === 106)).toMatchObject({ mode: 'HDB', steamLink: true })
  })
  it('joins step artists in their sort order', () => {
    expect(read.charts.find((c) => c.id === 100).stepArtist).toBe('BanYa & FEFEMZ')
  })
  it('describes each song: names, Korean title, artists, cut, channel, series, bpm', () => {
    expect(read.songs.get(10)).toMatchObject({
      title: 'Bee', titleKo: null, artist: 'BanYa', cut: 'ARCADE', channel: 'ORIGINAL', series: 'XX', bpm: [147, 147],
    })
    expect(read.songs.get(12)).toMatchObject({
      titleKo: '서울 노래', artist: 'BanYa & Guest', channel: 'WORLD MUSIC', series: 'PHOENIX 2', bpm: [90, 180],
    })
    expect(read.songs.get(12).names).toEqual(['Seoul Song', 'Seoul Song', '서울 노래'])
    expect(read.songs.has(11)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/piu-data/pumpout.test.mjs`
Expected: FAIL. The module `./pumpout.mjs` can't be found.

- [ ] **Step 3: Implement**

Create `scripts/piu-data/pumpout.mjs`:

```js
import { fold } from './fold.mjs'

/**
 * Reads the pumpout SQLite for one game version. A song or chart is present
 * when its latest operation among the version's ancestors is not DELETE; its
 * level is its latest rating among the ancestors (research.md §6.2).
 */

const DELETE = 2
const KEEP_MODES = new Set(['S', 'D', 'HDB'])
const LABEL = { ucs: 'UCS', premium: 'PREMIUM MODE EXCLUSIVE', steamLink: 'STEAM LINK EXCLUSIVE' }

/** First appearance mix (pumpout `mix.internalTitle`) → P2 Series Zone group. */
export const SERIES_BY_MIX = {
  'The 1st Dance Floor': '1st~ZERO', '2nd Ultimate Remix': '1st~ZERO', '3rd O.B.G': '1st~ZERO',
  'The O.B.G / Season Evolution': '1st~ZERO', 'The Collection': '1st~ZERO', 'The Perfect Collection': '1st~ZERO',
  Extra: '1st~ZERO', 'The Premiere': '1st~ZERO', 'The Prex': '1st~ZERO', 'The Rebirth': '1st~ZERO',
  'The Premiere 2': '1st~ZERO', 'The Prex 2': '1st~ZERO', 'The Premiere 3': '1st~ZERO', 'The Prex 3': '1st~ZERO',
  Exceed: '1st~ZERO', 'Exceed 2': '1st~ZERO', Zero: '1st~ZERO',
  'NX / New Xenesis': 'NX~NXA', 'NX2 / Next Xenesis': 'NX~NXA', 'NX Absolute': 'NX~NXA',
  Fiesta: 'FIESTA~FIESTA 2', 'Fiesta EX': 'FIESTA~FIESTA 2', 'Fiesta 2': 'FIESTA~FIESTA 2',
  Infinity: 'PRIME', Prime: 'PRIME', 'Prime JE': 'PRIME',
  'Prime 2': 'PRIME 2', XX: 'XX', Phoenix: 'PHOENIX', 'Phoenix 2': 'PHOENIX 2',
}

/** pumpout category → P2 channel. P2 has no J-Music channel; PIU Scores folds it into World Music. */
export const CHANNEL_BY_CATEGORY = {
  'K-POP': 'K-POP', 'WORLD MUSIC': 'WORLD MUSIC', ORIGINAL: 'ORIGINAL',
  'J-MUSIC': 'WORLD MUSIC', XROSS: 'XROSS', RISE: 'RISE',
}

export const CUT_BY_NAME = { 'Short Cut': 'SHORTCUT', Arcade: 'ARCADE', Remix: 'REMIX', 'Full Song': 'FULLSONG' }

const ANC = 'anc AS (SELECT ancestorId, ancestorSortOrder FROM _derived_versionAncestor WHERE versionId = :v)'

const STATE_SQL = `
WITH ${ANC},
sv AS (SELECT s.songId, s.operationId,
         ROW_NUMBER() OVER (PARTITION BY s.songId ORDER BY a.ancestorSortOrder DESC, s.operationId DESC) rn
       FROM songVersion s JOIN anc a ON a.ancestorId = s.versionId),
live_songs AS (SELECT songId FROM sv WHERE rn = 1 AND operationId <> ${DELETE}),
cv AS (SELECT cv.chartId, cv.operationId,
         ROW_NUMBER() OVER (PARTITION BY cv.chartId ORDER BY a.ancestorSortOrder DESC, cv.operationId DESC) rn
       FROM chartVersion cv JOIN anc a ON a.ancestorId = cv.versionId),
live_charts AS (SELECT ch.chartId, ch.songId FROM cv JOIN chart ch ON ch.chartId = cv.chartId
                WHERE cv.rn = 1 AND cv.operationId <> ${DELETE} AND ch.songId IN (SELECT songId FROM live_songs)),
rv AS (SELECT crv.chartId, crv.chartRatingId,
         ROW_NUMBER() OVER (PARTITION BY crv.chartId ORDER BY a.ancestorSortOrder DESC) rn
       FROM chartRatingVersion crv JOIN anc a ON a.ancestorId = crv.versionId)
SELECT lc.chartId AS chartId, lc.songId AS songId, mo.internalAbbreviation AS mode, d.value AS level
FROM live_charts lc
JOIN rv ON rv.chartId = lc.chartId AND rv.rn = 1
JOIN chartRating cr ON cr.chartRatingId = rv.chartRatingId
JOIN mode mo ON mo.modeId = cr.modeId
JOIN difficulty d ON d.difficultyId = cr.difficultyId`

const LABELS_SQL = `
WITH ${ANC},
lv AS (SELECT clv.chartLabelId, clv.operationId,
         ROW_NUMBER() OVER (PARTITION BY clv.chartLabelId ORDER BY a.ancestorSortOrder DESC, clv.operationId DESC) rn
       FROM chartLabelVersion clv JOIN anc a ON a.ancestorId = clv.versionId)
SELECT cl.chartId AS chartId, l.internalTitle AS label
FROM lv JOIN chartLabel cl ON cl.chartLabelId = lv.chartLabelId JOIN label l ON l.labelId = cl.labelId
WHERE lv.rn = 1 AND lv.operationId <> ${DELETE}`

const CATEGORY_SQL = `
WITH ${ANC},
scv AS (SELECT scv.songId, scv.songCategoryId,
          ROW_NUMBER() OVER (PARTITION BY scv.songId ORDER BY a.ancestorSortOrder DESC) rn
        FROM songCategoryVersion scv JOIN anc a ON a.ancestorId = scv.versionId)
SELECT scv.songId AS songId, c.internalTitle AS category
FROM scv JOIN songCategory sc ON sc.songCategoryId = scv.songCategoryId JOIN category c ON c.categoryId = sc.categoryId
WHERE scv.rn = 1`

const DEBUT_SQL = `
SELECT sv.songId AS songId, m.internalTitle AS mix
FROM songVersion sv JOIN version v ON v.versionId = sv.versionId JOIN mix m ON m.mixId = v.mixId
WHERE sv.operationId IN (1, 4)
ORDER BY sv.songId, m.sortOrder, v.sortOrder`

const SONGS_SQL = 'SELECT s.songId AS songId, s.internalTitle AS title, c.internalTitle AS cut FROM song s JOIN cut c ON c.cutId = s.cutId'
const TITLES_SQL = 'SELECT st.songId AS songId, l.code AS lang, st.title AS title FROM songTitle st JOIN language l ON l.languageId = st.languageId ORDER BY st.songTitleId'
const ARTISTS_SQL = 'SELECT sa.songId AS songId, a.internalTitle AS name FROM songArtist sa JOIN artist a ON a.artistId = sa.artistId ORDER BY sa.songId, sa.sortOrder'
const STEPS_SQL = 'SELECT cs.chartId AS chartId, s.internalTitle AS name FROM chartStepmaker cs JOIN stepmaker s ON s.stepmakerId = cs.stepmakerId ORDER BY cs.chartId, cs.sortOrder'
const BPM_SQL = 'SELECT songId, bpmMin, bpmMax FROM songBpm ORDER BY songBpmId'

function all(db, sql, params = {}) {
  const st = db.prepare(sql)
  st.bind(params)
  const rows = []
  while (st.step()) rows.push(st.getAsObject())
  st.free()
  return rows
}

function groupBy(rows, key, value) {
  const out = new Map()
  for (const r of rows) {
    if (!out.has(r[key])) out.set(r[key], [])
    out.get(r[key]).push(value ? r[value] : r)
  }
  return out
}

export function readPumpout(db, { version, prevVersion }) {
  const state = all(db, STATE_SQL, { ':v': version })
  const prev = new Map(all(db, STATE_SQL, { ':v': prevVersion }).map((r) => [r.chartId, r.level]))
  const labels = groupBy(all(db, LABELS_SQL, { ':v': version }), 'chartId', 'label')
  const steps = groupBy(all(db, STEPS_SQL), 'chartId', 'name')

  const kept = state.filter((r) => KEEP_MODES.has(r.mode) && !(labels.get(r.chartId) ?? []).includes(LABEL.ucs))
  const charts = kept.map((r) => {
    const ls = labels.get(r.chartId) ?? []
    const p = prev.get(r.chartId)
    return {
      id: r.chartId,
      songId: r.songId,
      mode: r.mode,
      level: r.level ?? null,
      prevLevel: p != null && p !== r.level ? p : null,
      premium: ls.includes(LABEL.premium),
      steamLink: ls.includes(LABEL.steamLink),
      stepArtist: steps.get(r.chartId)?.join(' & ') ?? null,
    }
  })
  return { songs: readSongs(db, version, new Set(charts.map((c) => c.songId))), charts }
}

function readSongs(db, version, ids) {
  const titles = groupBy(all(db, TITLES_SQL), 'songId')
  const artists = groupBy(all(db, ARTISTS_SQL), 'songId', 'name')
  const category = new Map(all(db, CATEGORY_SQL, { ':v': version }).map((r) => [r.songId, r.category]))
  const debut = new Map()
  for (const r of all(db, DEBUT_SQL)) if (!debut.has(r.songId)) debut.set(r.songId, r.mix)
  const bpm = new Map()
  for (const r of all(db, BPM_SQL)) bpm.set(r.songId, [r.bpmMin, r.bpmMax]) // last row wins

  const songs = new Map()
  for (const s of all(db, SONGS_SQL)) {
    if (!ids.has(s.songId)) continue
    const rows = titles.get(s.songId) ?? []
    const ko = rows.find((t) => t.lang === 'kr')?.title ?? null
    const cat = category.get(s.songId)
    if (cat !== undefined && !(cat in CHANNEL_BY_CATEGORY)) throw new Error(`Unknown pumpout category "${cat}" (song ${s.songId})`)
    const mix = debut.get(s.songId)
    const series = SERIES_BY_MIX[mix]
    if (!series) throw new Error(`No series for debut mix "${mix}" (song ${s.songId} ${s.title}) — add it to SERIES_BY_MIX`)
    const cut = CUT_BY_NAME[s.cut]
    if (!cut) throw new Error(`Unknown cut "${s.cut}" (song ${s.songId})`)
    songs.set(s.songId, {
      id: s.songId,
      title: s.title,
      names: [s.title, ...rows.map((t) => t.title)],
      titleKo: ko && fold(ko) !== fold(s.title) ? ko : null,
      artist: artists.get(s.songId)?.join(' & ') ?? '',
      cut,
      channel: cat === undefined ? null : CHANNEL_BY_CATEGORY[cat],
      series,
      bpm: bpm.get(s.songId) ?? null,
    })
  }
  return songs
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/piu-data/pumpout.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/piu-data/pumpout.mjs scripts/piu-data/pumpout.test.mjs
git commit -m "feat(pump): pumpout reader for one game version" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Join PIU Scores rows to pumpout charts

**Files:**
- Create: `scripts/piu-data/join.mjs`, `scripts/piu-data/join.test.mjs`

**Interfaces:**
- Consumes: `fold` (Task 1); `PSong`, `PChart` (Task 3); `Row` (Task 2).
- Produces:
  - `ALIASES: Map<string, string>`, from the CSV's folded title to pumpout's folded title.
  - `titleKey(title: string): { key: string, cut: string|null }`
  - `joinCoverage(charts: PChart[], songs: Map<number, PSong>, rows: Row[]): { byChart: Map<number, Row>, unmatched: Row[] }`

- [ ] **Step 1: Write the failing tests**

Create `scripts/piu-data/join.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { joinCoverage, titleKey } from './join.mjs'

const song = (id, title, cut, names = [title]) => [id, { id, title, names, cut }]
const chart = (id, songId, mode, level) => ({ id, songId, mode, level })
const row = (song, mode, level, songType = 'Arcade') => ({ song, mode, level, songType, badges: [], coverage: {} })

const songs = new Map([
  song(1, 'Bee', 'ARCADE'),
  song(2, 'Jupin', 'SHORTCUT'),
  song(3, 'Phalanx', 'ARCADE', ['Phalanx', 'Phalanx "RS2018 edit"']),
  song(4, 'X Treme', 'ARCADE'),
  song(5, 'PRiMA MATERiA', 'SHORTCUT'),
  song(6, '1948', 'ARCADE'),
  song(7, 'Extreme Music School 1st period', 'ARCADE'),
  song(8, 'Bee', 'FULLSONG'),
])
const charts = [
  chart(10, 1, 'S', 19), chart(11, 2, 'S', 20), chart(12, 3, 'D', 24), chart(13, 4, 'S', 18),
  chart(14, 5, 'S', 23), chart(15, 6, 'D', null), chart(16, 7, 'S', 23), chart(17, 8, 'S', 19),
  chart(18, 1, 'HDB', 19),
]

describe('titleKey', () => {
  it('reads a cut suffix and folds the rest', () => {
    expect(titleKey('Jupin - SHORT CUT -')).toEqual({ key: 'jupin', cut: 'SHORTCUT' })
    expect(titleKey('Gargoyle - FULL SONG -')).toEqual({ key: 'gargoyle', cut: 'FULLSONG' })
    expect(titleKey('Bee')).toEqual({ key: 'bee', cut: null })
  })
  it('applies the alias table', () => {
    expect(titleKey('X-Tream').key).toBe('xtreme')
    expect(titleKey('Love is a Danger Zone 2 Try To B.P.M').key).toBe('loveisadangerzonetrytobpm')
  })
})

describe('joinCoverage', () => {
  const { byChart, unmatched } = joinCoverage(charts, songs, [
    row('Bee', 'S', 19),
    row('Jupin - SHORT CUT -', 'S', 20, 'ShortCut'),
    row('Phalanx "RS2018 edit"', 'D', 24),
    row('X-Tream', 'S', 18),
    row('PRiMA MATERiA - SHORT CUT -', 'S', 23, 'Arcade'), // suffix beats the CSV's song type
    row('1948', 'D', 29), // pumpout has no level for this chart
    row('Extreme Music School 1st period feat. Nanahira', 'S', 23), // prefix match
    row('Bee - FULL SONG -', 'S', 19, 'FullSong'),
    row('Nowhere', 'S', 5),
  ])
  it('matches exact titles, aliases, suffix cuts, prefixes and unrated charts', () => {
    expect([...byChart.keys()].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 16, 17])
    expect(byChart.get(15).level).toBe(29)
  })
  it('returns rows it cannot place instead of dropping them', () => {
    expect(unmatched.map((r) => r.song)).toEqual(['Nowhere'])
  })
  it('never attaches CSV rows to Half-Double charts', () => {
    expect(byChart.has(18)).toBe(false)
  })
  it('does not attach two rows to one chart', () => {
    const { byChart: b, unmatched: u } = joinCoverage(charts, songs, [row('Bee', 'S', 19), row('Bee', 'S', 19)])
    expect(b.size).toBe(1)
    expect(u).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run scripts/piu-data/join.test.mjs`
Expected: FAIL. The module `./join.mjs` can't be found.

- [ ] **Step 3: Implement**

Create `scripts/piu-data/join.mjs`:

```js
import { fold } from './fold.mjs'

/** CSV title → pumpout title, for the two songs whose names differ beyond punctuation. */
export const ALIASES = new Map([
  [fold('X-Tream'), fold('X Treme')],
  [fold('Love is a Danger Zone 2 Try To B.P.M'), fold('Love is a danger zone (try to B.P.M.)')],
])

const SUFFIX = /\s*-\s*(SHORT CUT|FULL SONG|REMIX)\s*-\s*$/i
const SUFFIX_CUT = { 'short cut': 'SHORTCUT', 'full song': 'FULLSONG', remix: 'REMIX' }
const CSV_CUT = { Arcade: 'ARCADE', ShortCut: 'SHORTCUT', Remix: 'REMIX', FullSong: 'FULLSONG' }

/** A CSV title → its folded join key, plus the cut named by a "- SHORT CUT -" style suffix. */
export function titleKey(title) {
  const m = title.match(SUFFIX)
  const key = fold(title.replace(SUFFIX, ''))
  return { key: ALIASES.get(key) ?? key, cut: m ? SUFFIX_CUT[m[1].toLowerCase()] : null }
}

/**
 * Attach PIU Scores rows to pumpout S/D charts on title + cut + mode + level.
 * Exact title first, then a unique prefix match; a chart pumpout left unrated
 * ("??") matches on title + cut + mode alone.
 */
export function joinCoverage(charts, songs, rows) {
  const keys = new Map([...songs].map(([id, s]) => [id, s.names.map(fold)]))
  const index = new Map()
  for (const c of charts) {
    if (c.mode === 'HDB') continue
    const k = `${songs.get(c.songId).cut}|${c.mode}|${c.level ?? '?'}`
    if (!index.has(k)) index.set(k, [])
    index.get(k).push(c)
  }
  const byChart = new Map()
  const unmatched = []
  for (const row of rows) {
    const { key, cut: suffixCut } = titleKey(row.song)
    const cut = suffixCut ?? CSV_CUT[row.songType]
    const pick = (level) => {
      const cands = index.get(`${cut}|${row.mode}|${level}`) ?? []
      const exact = cands.filter((c) => keys.get(c.songId).includes(key))
      if (exact.length) return exact.length === 1 ? exact[0] : null
      const prefix = cands.filter((c) => keys.get(c.songId).some((n) => n && (key.startsWith(n) || n.startsWith(key))))
      return prefix.length === 1 ? prefix[0] : null
    }
    const hit = pick(row.level) ?? pick('?')
    if (hit && !byChart.has(hit.id)) byChart.set(hit.id, row)
    else unmatched.push(row)
  }
  return { byChart, unmatched }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/piu-data/join.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/piu-data/join.mjs scripts/piu-data/join.test.mjs
git commit -m "feat(pump): join PIU Scores coverage to pumpout charts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Title ladders

`ladders.json` holds every title chart as a **pumpout chart ID**, because IDs survive re-rates. For example, Take Out D23 [SLOW] is chart 1017, which was D22 before PHOENIX 2. These IDs were resolved on 2026-10-14 against pumpout `ed314a8`: P2 at version 201 and P1 at version 199. All 150 resolved uniquely, and every P1 chart still exists in P2. The XX IDs come from `research-gimmick-titles.md` §3.1. XX's LOVE SCENARIO (5510) is no longer in P2, and the resolver skips it.

**Files:**
- Create: `scripts/piu-data/ladders.json`, `scripts/piu-data/titles.mjs`, `scripts/piu-data/titles.test.mjs`

**Interfaces:**
- Produces:
  - `TRACK_SKILL: Record<string, 'half'|'run'|'twist'|'bracket'|'drill'|'gimmick'>`
  - `resolveLadders(ladders, present: Set<number>)` returns:
    - `titles`: `{ id, track, lv, chart }[]`, P2 only, in file order;
    - `forced`: `Map<number, Set<skill>>`;
    - `gimmickFrom`: `Map<number, string[]>`;
    - `missing`: P2 entries whose chart is absent.
  - A title ID is the track with spaces as underscores, then the level: `TWIST_D_7`, `SLOW_9`.

- [ ] **Step 1: Create `scripts/piu-data/ladders.json` with exactly this content**

```json
{
  "sources": {
      "P2": "PHOENIX 2 skill titles: DrMurloc/PumpItUpScoreTracker@78499c4 ScoreTracker.Domain/Models/Titles/Phoenix2/Phoenix2TitleList.cs (authenticated scrape of piugame.com my_page/title.php, 2026-07-09)",
      "P1": "PHOENIX skill titles: DrMurloc/PumpItUpScoreTracker@78499c4 ScoreTracker.Tests.E2E/PiuGame/Fixtures/AccountTitles.html (capture of phoenix.piugame.com, 2026-07-03); matches PhoenixTitleList.cs and .ssc #CHARTNAME tags",
      "XX": "XX Gimmick titles (community only): namu.wiki XX §7.2 via Wayback 2020-05-30, pumpitup.fandom.com Titles rev 1872, XXTitleList.cs@78499c4. Chart IDs per research-gimmick-titles.md"
  },
  "P2": [
    {"track": "TWIST S", "lv": 1, "chart": 2779, "label": "Scorpion King S15"},
    {"track": "TWIST S", "lv": 2, "chart": 2513, "label": "Street show down S16"},
    {"track": "TWIST S", "lv": 3, "chart": 1320, "label": "U Got Me Rocking S17"},
    {"track": "TWIST S", "lv": 4, "chart": 393, "label": "Solitary 2 S18"},
    {"track": "TWIST S", "lv": 5, "chart": 824, "label": "U Got 2 Know S19"},
    {"track": "TWIST S", "lv": 6, "chart": 401, "label": "Canon D S20"},
    {"track": "TWIST S", "lv": 7, "chart": 1277, "label": "Love is a Danger Zone(Cranky Mix) S21"},
    {"track": "TWIST S", "lv": 8, "chart": 7762, "label": "DUEL S21"},
    {"track": "TWIST S", "lv": 9, "chart": 351, "label": "Love is a Danger Zone pt. 2 S22"},
    {"track": "TWIST S", "lv": 10, "chart": 6098, "label": "Uranium S22"},
    {"track": "TWIST D", "lv": 1, "chart": 4437, "label": "Redline D16"},
    {"track": "TWIST D", "lv": 2, "chart": 50, "label": "Mr. Larpus D17"},
    {"track": "TWIST D", "lv": 3, "chart": 496, "label": "Dignity D17"},
    {"track": "TWIST D", "lv": 4, "chart": 59, "label": "Final Audition 2 D18"},
    {"track": "TWIST D", "lv": 5, "chart": 87, "label": "Final Audition D19"},
    {"track": "TWIST D", "lv": 6, "chart": 646, "label": "Witch Doctor #1 D20"},
    {"track": "TWIST D", "lv": 7, "chart": 206, "label": "Love is a Danger Zone D21"},
    {"track": "TWIST D", "lv": 8, "chart": 1700, "label": "Super Fantasy D22"},
    {"track": "TWIST D", "lv": 9, "chart": 1281, "label": "Love is a Danger Zone(Cranky Mix) D23"},
    {"track": "TWIST D", "lv": 10, "chart": 346, "label": "Love is a Danger Zone pt. 2 D24"},
    {"track": "RUN S", "lv": 1, "chart": 6149, "label": "Switronic S15"},
    {"track": "RUN S", "lv": 2, "chart": 1704, "label": "Super Fantasy S16"},
    {"track": "RUN S", "lv": 3, "chart": 1101, "label": "Pavane S17"},
    {"track": "RUN S", "lv": 4, "chart": 4834, "label": "Gothique Resonance S18"},
    {"track": "RUN S", "lv": 5, "chart": 167, "label": "Bee S19"},
    {"track": "RUN S", "lv": 6, "chart": 7905, "label": "Jupin - SHORT CUT - S20"},
    {"track": "RUN S", "lv": 7, "chart": 7561, "label": "Horang Pungryuga S21"},
    {"track": "RUN S", "lv": 8, "chart": 5753, "label": "Conflict S22"},
    {"track": "RUN S", "lv": 9, "chart": 4895, "label": "Gargoyle - FULL SONG - S23"},
    {"track": "RUN S", "lv": 10, "chart": 571, "label": "Final Audition Ep. 2-X S24"},
    {"track": "RUN D", "lv": 1, "chart": 86, "label": "Final Audition D17"},
    {"track": "RUN D", "lv": 2, "chart": 3287, "label": "Yog-Sothoth D18"},
    {"track": "RUN D", "lv": 3, "chart": 4679, "label": "HTTP D20"},
    {"track": "RUN D", "lv": 4, "chart": 169, "label": "Bee D20"},
    {"track": "RUN D", "lv": 5, "chart": 5755, "label": "Conflict D21"},
    {"track": "RUN D", "lv": 6, "chart": 3390, "label": "Sarabande D21"},
    {"track": "RUN D", "lv": 7, "chart": 956, "label": "Destination - SHORT CUT - D22"},
    {"track": "RUN D", "lv": 8, "chart": 4896, "label": "Gargoyle - FULL SONG - D22"},
    {"track": "RUN D", "lv": 9, "chart": 6419, "label": "Baroque Virus - FULL SONG - D23"},
    {"track": "RUN D", "lv": 10, "chart": 3291, "label": "Canon D - FULL SONG - D24"},
    {"track": "DRILL", "lv": 1, "chart": 3358, "label": "Hellfire S15"},
    {"track": "DRILL", "lv": 2, "chart": 275, "label": "Vook S16"},
    {"track": "DRILL", "lv": 3, "chart": 680, "label": "Gun Rock S17"},
    {"track": "DRILL", "lv": 4, "chart": 334, "label": "Moonlight S18"},
    {"track": "DRILL", "lv": 5, "chart": 837, "label": "Vacuum S19"},
    {"track": "DRILL", "lv": 6, "chart": 2361, "label": "Guitar Man S20"},
    {"track": "DRILL", "lv": 7, "chart": 717, "label": "WI-EX-DOC-VA S21"},
    {"track": "DRILL", "lv": 8, "chart": 1038, "label": "Overblow S21"},
    {"track": "DRILL", "lv": 9, "chart": 817, "label": "Sorceress Elise S22"},
    {"track": "DRILL", "lv": 10, "chart": 4555, "label": "Death Moon - SHORT CUT - S23"},
    {"track": "GIMMICK", "lv": 1, "chart": 7427, "label": "STAGER S17"},
    {"track": "GIMMICK", "lv": 2, "chart": 6772, "label": "Ugly Dee S17"},
    {"track": "GIMMICK", "lv": 3, "chart": 1856, "label": "Rock the house - SHORT CUT - S18"},
    {"track": "GIMMICK", "lv": 4, "chart": 183, "label": "Come to Me S18"},
    {"track": "GIMMICK", "lv": 5, "chart": 2503, "label": "Miss S' story S19"},
    {"track": "GIMMICK", "lv": 6, "chart": 4623, "label": "Nakakapagpabagabag S19"},
    {"track": "GIMMICK", "lv": 7, "chart": 5542, "label": "8 6 S20"},
    {"track": "GIMMICK", "lv": 8, "chart": 5967, "label": "Tales of Pumpnia S20"},
    {"track": "GIMMICK", "lv": 9, "chart": 7568, "label": "CHAOS AGAIN S21"},
    {"track": "GIMMICK", "lv": 10, "chart": 1084, "label": "Everybody Got 2 Know S21"},
    {"track": "SLOW", "lv": 1, "chart": 1502, "label": "Yeo rae a S13"},
    {"track": "SLOW", "lv": 2, "chart": 4667, "label": "Twist of Fate (feat. Ruriling) S19"},
    {"track": "SLOW", "lv": 3, "chart": 335, "label": "Moonlight S20"},
    {"track": "SLOW", "lv": 4, "chart": 6791, "label": "Night Duty S20"},
    {"track": "SLOW", "lv": 5, "chart": 1839, "label": "Karyawisata S21"},
    {"track": "SLOW", "lv": 6, "chart": 1023, "label": "Take Out S21"},
    {"track": "SLOW", "lv": 7, "chart": 4670, "label": "Twist of Fate (feat. Ruriling) D21"},
    {"track": "SLOW", "lv": 8, "chart": 330, "label": "Moonlight D22"},
    {"track": "SLOW", "lv": 9, "chart": 1017, "label": "Take Out D23"},
    {"track": "SLOW", "lv": 10, "chart": 642, "label": "Banya-P Guitar Remix S23"},
    {"track": "HALF", "lv": 1, "chart": 6859, "label": "Mopemope D17"},
    {"track": "HALF", "lv": 2, "chart": 1030, "label": "Butterfly D17"},
    {"track": "HALF", "lv": 3, "chart": 4492, "label": "Shub Niggurath D18"},
    {"track": "HALF", "lv": 4, "chart": 3288, "label": "Super Fantasy D19"},
    {"track": "HALF", "lv": 5, "chart": 887, "label": "Phantom -Intermezzo- D20"},
    {"track": "HALF", "lv": 6, "chart": 359, "label": "Phantom D20"},
    {"track": "HALF", "lv": 7, "chart": 4454, "label": "Utsushiyo No Kaze feat. Kana D21"},
    {"track": "HALF", "lv": 8, "chart": 4907, "label": "Redline D22"},
    {"track": "HALF", "lv": 9, "chart": 370, "label": "Love is a Danger Zone 2 Try To B.P.M D23"},
    {"track": "HALF", "lv": 10, "chart": 2900, "label": "Imprinting D24"},
    {"track": "BRACKET", "lv": 1, "chart": 4425, "label": "Allegro Furioso D20"},
    {"track": "BRACKET", "lv": 2, "chart": 2890, "label": "Mad5cience S20"},
    {"track": "BRACKET", "lv": 3, "chart": 6808, "label": "Pop Sequence S21"},
    {"track": "BRACKET", "lv": 4, "chart": 5729, "label": "Meteo5cience (GADGET mix) S21"},
    {"track": "BRACKET", "lv": 5, "chart": 5936, "label": "Phalanx \"RS2018 edit\" S22"},
    {"track": "BRACKET", "lv": 6, "chart": 5731, "label": "Meteo5cience (GADGET mix) D22"},
    {"track": "BRACKET", "lv": 7, "chart": 1154, "label": "What Happened D23"},
    {"track": "BRACKET", "lv": 8, "chart": 6918, "label": "Scorpion King D23"},
    {"track": "BRACKET", "lv": 9, "chart": 6920, "label": "Phalanx \"RS2018 edit\" D24"},
    {"track": "BRACKET", "lv": 10, "chart": 8055, "label": "Hymn of Golden Glory - SHORT CUT - D24"}
  ],
  "P1": [
    {"track": "RUN", "lv": 1, "chart": 6149, "label": "Switronic S15"},
    {"track": "RUN", "lv": 2, "chart": 1704, "label": "Super Fantasy S16"},
    {"track": "RUN", "lv": 3, "chart": 1101, "label": "Pavane S17"},
    {"track": "RUN", "lv": 4, "chart": 4834, "label": "Gothique Resonance S18"},
    {"track": "RUN", "lv": 5, "chart": 967, "label": "Napalm S19"},
    {"track": "RUN", "lv": 6, "chart": 169, "label": "Bee D20"},
    {"track": "RUN", "lv": 7, "chart": 3390, "label": "Sarabande D21"},
    {"track": "RUN", "lv": 8, "chart": 4896, "label": "Gargoyle - FULL SONG - D22"},
    {"track": "RUN", "lv": 9, "chart": 6419, "label": "Baroque Virus - FULL SONG - D23"},
    {"track": "RUN", "lv": 10, "chart": 1671, "label": "Yog-Sothoth D24"},
    {"track": "TWIST", "lv": 1, "chart": 2779, "label": "Scorpion King S15"},
    {"track": "TWIST", "lv": 2, "chart": 2513, "label": "Street show down S16"},
    {"track": "TWIST", "lv": 3, "chart": 1320, "label": "U Got Me Rocking S17"},
    {"track": "TWIST", "lv": 4, "chart": 393, "label": "Solitary 2 S18"},
    {"track": "TWIST", "lv": 5, "chart": 824, "label": "U GOT 2 KNOW S19"},
    {"track": "TWIST", "lv": 6, "chart": 646, "label": "Witch Doctor #1 D20"},
    {"track": "TWIST", "lv": 7, "chart": 206, "label": "Love is a Danger Zone D21"},
    {"track": "TWIST", "lv": 8, "chart": 1700, "label": "Super Fantasy D22"},
    {"track": "TWIST", "lv": 9, "chart": 1281, "label": "Love Is A Danger Zone(Cranky Mix) D23"},
    {"track": "TWIST", "lv": 10, "chart": 171, "label": "Bee D24"},
    {"track": "BRACKET", "lv": 1, "chart": 4425, "label": "Allegro furioso D20"},
    {"track": "BRACKET", "lv": 2, "chart": 2890, "label": "Mad5cience S20"},
    {"track": "BRACKET", "lv": 3, "chart": 5729, "label": "Meteo5cience S21"},
    {"track": "BRACKET", "lv": 4, "chart": 1159, "label": "What Happened S21"},
    {"track": "BRACKET", "lv": 5, "chart": 5936, "label": "Phalanx S22"},
    {"track": "BRACKET", "lv": 6, "chart": 5731, "label": "Meteo5cience D22"},
    {"track": "BRACKET", "lv": 7, "chart": 1154, "label": "What Happened D23"},
    {"track": "BRACKET", "lv": 8, "chart": 6811, "label": "Pop Sequence D23"},
    {"track": "BRACKET", "lv": 9, "chart": 6918, "label": "Scorpion King D23"},
    {"track": "BRACKET", "lv": 10, "chart": 6920, "label": "Phalanx D24"},
    {"track": "HALF", "lv": 1, "chart": 6859, "label": "Mopemope D17"},
    {"track": "HALF", "lv": 2, "chart": 1030, "label": "Butterfly D17"},
    {"track": "HALF", "lv": 3, "chart": 4492, "label": "Shub Niggurath D18"},
    {"track": "HALF", "lv": 4, "chart": 3288, "label": "Super Fantasy D18"},
    {"track": "HALF", "lv": 5, "chart": 359, "label": "Phantom D19"},
    {"track": "HALF", "lv": 6, "chart": 4454, "label": "Utsushiyo No Kaze D20"},
    {"track": "HALF", "lv": 7, "chart": 645, "label": "Witch Doctor #1 D21"},
    {"track": "HALF", "lv": 8, "chart": 4907, "label": "Redline D22"},
    {"track": "HALF", "lv": 9, "chart": 370, "label": "Love is a Danger Zone 2 Try To B.P.M D23"},
    {"track": "HALF", "lv": 10, "chart": 2900, "label": "Imprinting D24"},
    {"track": "DRILL", "lv": 1, "chart": 3358, "label": "Hellfire S15"},
    {"track": "DRILL", "lv": 2, "chart": 275, "label": "Vook S16"},
    {"track": "DRILL", "lv": 3, "chart": 680, "label": "Gun Rock S17"},
    {"track": "DRILL", "lv": 4, "chart": 334, "label": "Moonlight S18"},
    {"track": "DRILL", "lv": 5, "chart": 837, "label": "Vacuum S19"},
    {"track": "DRILL", "lv": 6, "chart": 1038, "label": "Overblow S20"},
    {"track": "DRILL", "lv": 7, "chart": 817, "label": "Sorceress Elise S21"},
    {"track": "DRILL", "lv": 8, "chart": 1725, "label": "Rock the house D22"},
    {"track": "DRILL", "lv": 9, "chart": 343, "label": "Witch Doctor D23"},
    {"track": "DRILL", "lv": 10, "chart": 715, "label": "WI-EX-DOC-VA D24"},
    {"track": "GIMMICK", "lv": 1, "chart": 1502, "label": "Yeo rae a S13"},
    {"track": "GIMMICK", "lv": 2, "chart": 5541, "label": "8 6 S16"},
    {"track": "GIMMICK", "lv": 3, "chart": 6772, "label": "Ugly Dee S17"},
    {"track": "GIMMICK", "lv": 4, "chart": 183, "label": "Come to Me S17"},
    {"track": "GIMMICK", "lv": 5, "chart": 1856, "label": "Rock the house - SHORT CUT - S18"},
    {"track": "GIMMICK", "lv": 6, "chart": 2503, "label": "Miss S' story S19"},
    {"track": "GIMMICK", "lv": 7, "chart": 4623, "label": "Nakakapagpabagabag S19"},
    {"track": "GIMMICK", "lv": 8, "chart": 4667, "label": "Twist of Fate S19"},
    {"track": "GIMMICK", "lv": 9, "chart": 5542, "label": "8 6 S20"},
    {"track": "GIMMICK", "lv": 10, "chart": 1084, "label": "Everybody Got 2 Know S21"}
  ],
  "XX": [
    {"track": "GIMMICK", "lv": 1, "chart": 1502, "label": "Yeo rae a S13"},
    {"track": "GIMMICK", "lv": 2, "chart": 3317, "label": "Bad Apple!! feat. Nomico S15"},
    {"track": "GIMMICK", "lv": 3, "chart": 5510, "label": "LOVE SCENARIO S17 (removed in PHOENIX)"},
    {"track": "GIMMICK", "lv": 4, "chart": 183, "label": "Come to Me S17"},
    {"track": "GIMMICK", "lv": 5, "chart": 1856, "label": "Rock the house - SHORT CUT - S18"},
    {"track": "GIMMICK", "lv": 6, "chart": 2503, "label": "Miss S' story S19"},
    {"track": "GIMMICK", "lv": 7, "chart": 4623, "label": "Nakakapagpabagabag S19"},
    {"track": "GIMMICK", "lv": 8, "chart": 4667, "label": "Twist of Fate (feat. Ruriling) S19"},
    {"track": "GIMMICK", "lv": 9, "chart": 1084, "label": "Everybody Got 2 Know S19"},
    {"track": "GIMMICK", "lv": 10, "chart": 5542, "label": "8 6 S20"}
  ]
}
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/piu-data/titles.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveLadders } from './titles.mjs'

const ladders = {
  P2: [
    { track: 'TWIST D', lv: 7, chart: 206, label: 'Love is a Danger Zone D21' },
    { track: 'SLOW', lv: 9, chart: 1017, label: 'Take Out D23' },
    { track: 'GIMMICK', lv: 1, chart: 7427, label: 'STAGER S17' },
  ],
  P1: [
    { track: 'TWIST', lv: 7, chart: 206, label: 'Love is a Danger Zone D21' },
    { track: 'GIMMICK', lv: 2, chart: 5541, label: '8 6 S16' },
  ],
  XX: [
    { track: 'GIMMICK', lv: 3, chart: 5510, label: 'LOVE SCENARIO S17' },
    { track: 'GIMMICK', lv: 1, chart: 1502, label: 'Yeo rae a S13' },
  ],
}

describe('resolveLadders', () => {
  const present = new Set([206, 1017, 7427, 5541, 1502])
  const r = resolveLadders(ladders, present)

  it('lists PHOENIX 2 titles with stable ids', () => {
    expect(r.titles).toEqual([
      { id: 'TWIST_D_7', track: 'TWIST D', lv: 7, chart: 206 },
      { id: 'SLOW_9', track: 'SLOW', lv: 9, chart: 1017 },
      { id: 'GIMMICK_1', track: 'GIMMICK', lv: 1, chart: 7427 },
    ])
  })
  it('forces the ladder skill on every ladder chart, SLOW counting as gimmick', () => {
    expect([...r.forced.get(206)]).toEqual(['twist'])
    expect([...r.forced.get(1017)]).toEqual(['gimmick'])
    expect(r.forced.get(5541).has('gimmick')).toBe(true)
  })
  it('records where each gimmick tag came from, matched by chart id', () => {
    expect(r.gimmickFrom.get(1017)).toEqual(['PHOENIX 2 SLOW Lv.9'])
    expect(r.gimmickFrom.get(1502)).toEqual(['XX GIMMICK Lv.1'])
  })
  it('skips older-game charts that left the game, but reports missing PHOENIX 2 charts', () => {
    expect(r.forced.has(5510)).toBe(false)
    expect(r.missing).toEqual([])
    const gone = resolveLadders(ladders, new Set([206, 7427]))
    expect(gone.missing.map((e) => e.chart)).toEqual([1017])
  })
})

describe('ladders.json', () => {
  const file = JSON.parse(readFileSync(new URL('./ladders.json', import.meta.url), 'utf8'))
  it('has 90 PHOENIX 2, 60 PHOENIX and 10 XX entries', () => {
    expect([file.P2.length, file.P1.length, file.XX.length]).toEqual([90, 60, 10])
  })
  it('has 10 levels per PHOENIX 2 track', () => {
    const per = {}
    for (const e of file.P2) per[e.track] = (per[e.track] ?? 0) + 1
    expect(Object.values(per)).toEqual(Array(9).fill(10))
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run scripts/piu-data/titles.test.mjs`
Expected: FAIL. The module `./titles.mjs` can't be found.

- [ ] **Step 4: Implement**

Create `scripts/piu-data/titles.mjs`:

```js
/** Which skill each ladder track proves. SLOW counts as gimmick (decisions.md, round 2). */
export const TRACK_SKILL = {
  'TWIST S': 'twist', 'TWIST D': 'twist', TWIST: 'twist',
  'RUN S': 'run', 'RUN D': 'run', RUN: 'run',
  DRILL: 'drill', HALF: 'half', BRACKET: 'bracket',
  GIMMICK: 'gimmick', SLOW: 'gimmick',
}
const GAME = { P2: 'PHOENIX 2', P1: 'PHOENIX', XX: 'XX' }

/**
 * @param ladders parsed ladders.json
 * @param present chart ids that exist in the PHOENIX 2 catalog
 */
export function resolveLadders(ladders, present) {
  const titles = []
  const forced = new Map()
  const gimmickFrom = new Map()
  const missing = []
  for (const game of ['P2', 'P1', 'XX']) {
    for (const e of ladders[game]) {
      if (!present.has(e.chart)) {
        if (game === 'P2') missing.push(e)
        continue
      }
      const skill = TRACK_SKILL[e.track]
      if (!skill) throw new Error(`Unknown ladder track "${e.track}" in ${game}`)
      if (!forced.has(e.chart)) forced.set(e.chart, new Set())
      forced.get(e.chart).add(skill)
      if (skill === 'gimmick') {
        gimmickFrom.set(e.chart, [...(gimmickFrom.get(e.chart) ?? []), `${GAME[game]} ${e.track} Lv.${e.lv}`])
      }
      if (game === 'P2') titles.push({ id: `${e.track.replace(/ /g, '_')}_${e.lv}`, track: e.track, lv: e.lv, chart: e.chart })
    }
  }
  return { titles, forced, gimmickFrom, missing }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run scripts/piu-data/titles.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/piu-data/ladders.json scripts/piu-data/titles.mjs scripts/piu-data/titles.test.mjs
git commit -m "feat(pump): skill-title ladders as pumpout chart ids" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Skill tagging

**Files:**
- Create: `scripts/piu-data/skills.mjs`, `scripts/piu-data/skills.test.mjs`

**Interfaces:**
- Consumes: `Row.coverage` and `Row.badges` (Task 2); `forced` (Task 5); `PChart` (Task 3).
- Produces:
  - `SKILLS = ['half','run','twist','bracket','drill','gimmick']`
  - `COMPUTED_SKILLS = ['half','run','twist','bracket','drill']`
  - `SKILL_SOURCES`, `TITLE_HIT_TARGET = 0.9`
  - `skillScore(coverage, skill): number`
  - `pickThreshold(scores: number[], target?): number`
  - `tagSkills({ mode, coverage, badges }, thresholds): Set<skill>`
  - `computeThresholds(charts, byChart, forced, target?): Record<computed skill, number>`
  - `skillsFor(chart, row|undefined, thresholds, forcedSet|undefined): Set<skill>`
  - `skillStats(charts, byChart, thresholds, forced, skillsById): { skill, threshold, titleHit, titleCount, tagged }[]`

- [ ] **Step 1: Write the failing tests**

Create `scripts/piu-data/skills.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { computeThresholds, pickThreshold, skillScore, skillsFor, tagSkills } from './skills.mjs'

const TH = { half: 0.25, run: 0.3, twist: 0.4, bracket: 0.45, drill: 0.33 }

describe('skillScore', () => {
  it('takes the strongest coverage column of the skill', () => {
    expect(skillScore({ twist_90: 0.2, twist_far: 0.6 }, 'twist')).toBe(0.6)
    expect(skillScore({}, 'run')).toBe(0)
  })
})

describe('pickThreshold', () => {
  it('is the highest score that still tags the target share of title charts', () => {
    expect(pickThreshold([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05], 0.9)).toBe(0.1)
    expect(pickThreshold([0.5, 0.4], 0.9)).toBe(0.4)
  })
  it('tags nothing when a skill has no title charts', () => {
    expect(pickThreshold([], 0.9)).toBe(Infinity)
  })
})

describe('tagSkills', () => {
  it('tags by coverage or by a top-3 badge', () => {
    const s = tagSkills({ mode: 'S', coverage: { run: 0.5, twist_90: 0.1 }, badges: ['Twists'] }, TH)
    expect([...s].sort()).toEqual(['run', 'twist'])
  })
  it('tags half only on Double charts', () => {
    expect(tagSkills({ mode: 'S', coverage: { mid6_doubles: 0.9 }, badges: [] }, TH).has('half')).toBe(false)
    expect(tagSkills({ mode: 'D', coverage: { mid6_doubles: 0.3 }, badges: [] }, TH).has('half')).toBe(true)
  })
})

describe('skillsFor', () => {
  it('adds forced ladder skills and keeps charts without coverage empty', () => {
    expect([...skillsFor({ mode: 'HDB' }, undefined, TH, undefined)]).toEqual([])
    expect([...skillsFor({ mode: 'S' }, undefined, TH, new Set(['gimmick']))]).toEqual(['gimmick'])
  })
})

describe('computeThresholds', () => {
  it('uses only title charts of each skill that have coverage', () => {
    const charts = [{ id: 1, mode: 'S' }, { id: 2, mode: 'S' }, { id: 3, mode: 'D' }]
    const byChart = new Map([
      [1, { coverage: { run: 0.6 } }],
      [2, { coverage: { run: 0.3 } }],
      [3, { coverage: { mid6_doubles: 0.4 } }],
    ])
    const forced = new Map([[1, new Set(['run'])], [2, new Set(['run'])], [3, new Set(['half'])]])
    const t = computeThresholds(charts, byChart, forced, 0.5)
    expect(t.run).toBe(0.6)
    expect(t.half).toBe(0.4)
    expect(t.twist).toBe(Infinity)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run scripts/piu-data/skills.test.mjs`
Expected: FAIL. The module `./skills.mjs` can't be found.

- [ ] **Step 3: Implement**

Create `scripts/piu-data/skills.mjs`:

```js
/** Fixed order: bit i of a chart's `sk` mask is SKILLS[i]; `cov` holds the first five. */
export const SKILLS = ['half', 'run', 'twist', 'bracket', 'drill', 'gimmick']
export const COMPUTED_SKILLS = ['half', 'run', 'twist', 'bracket', 'drill']

/**
 * piucenter coverage columns (PIU Scores `pc:badge_fraction:*`) and top-3 badge
 * names behind each computed skill. Gimmick comes only from the title lists.
 */
export const SKILL_SOURCES = {
  half: { columns: ['mid6_doubles'], badges: [], doubleOnly: true },
  run: { columns: ['run', 'anchor_run'], badges: ['Runs', 'Anchor Runs', 'Runs Without Twists'] },
  twist: { columns: ['twist_90', 'twist_over90', 'twist_close', 'twist_far'], badges: ['Twists'] },
  bracket: {
    columns: ['bracket', 'staggered_bracket', 'bracket_run', 'bracket_drill', 'bracket_jump', 'bracket_twist'],
    badges: ['Brackets', 'Staggered Brackets', 'Bracket Runs', 'Bracket Drills', 'Bracket Jumps', 'Bracket Twists'],
  },
  drill: { columns: ['drill', 'bracket_drill'], badges: ['Drills', 'Bracket Drills'] },
}

/**
 * Share of a skill's title charts its threshold must still tag. Lowering it
 * raises every threshold, so fewer charts get tagged (spec §Data → Rules).
 */
export const TITLE_HIT_TARGET = 0.9

export function skillScore(coverage, skill) {
  return Math.max(0, ...SKILL_SOURCES[skill].columns.map((c) => coverage[c] ?? 0))
}

export function pickThreshold(scores, target = TITLE_HIT_TARGET) {
  if (scores.length === 0) return Infinity
  const sorted = [...scores].sort((a, b) => b - a)
  return sorted[Math.max(1, Math.ceil(sorted.length * target)) - 1]
}

export function tagSkills({ mode, coverage, badges }, thresholds) {
  const out = new Set()
  for (const skill of COMPUTED_SKILLS) {
    const src = SKILL_SOURCES[skill]
    if (src.doubleOnly && mode !== 'D') continue
    const byScore = skillScore(coverage, skill) >= thresholds[skill]
    const byBadge = badges.some((b) => src.badges.includes(b))
    if (byScore || byBadge) out.add(skill)
  }
  return out
}

export function computeThresholds(charts, byChart, forced, target = TITLE_HIT_TARGET) {
  const mode = new Map(charts.map((c) => [c.id, c.mode]))
  const out = {}
  for (const skill of COMPUTED_SKILLS) {
    const scores = []
    for (const [id, skills] of forced) {
      const row = byChart.get(id)
      if (!row || !skills.has(skill)) continue
      if (SKILL_SOURCES[skill].doubleOnly && mode.get(id) !== 'D') continue
      scores.push(skillScore(row.coverage, skill))
    }
    out[skill] = pickThreshold(scores, target)
  }
  return out
}

export function skillsFor(chart, row, thresholds, forcedSet) {
  const out = row ? tagSkills({ mode: chart.mode, coverage: row.coverage, badges: row.badges }, thresholds) : new Set()
  for (const s of forcedSet ?? []) out.add(s)
  return out
}

/** Per skill: threshold, how many of its title charts it tags before forcing, and how many charts end up tagged. */
export function skillStats(charts, byChart, thresholds, forced, skillsById) {
  return SKILLS.map((skill) => {
    const titleIds = [...forced].filter(([, s]) => s.has(skill)).map(([id]) => id)
    const hits = titleIds.filter((id) => {
      const row = byChart.get(id)
      const c = charts.find((x) => x.id === id)
      return row && c && skill !== 'gimmick' && tagSkills({ mode: c.mode, coverage: row.coverage, badges: row.badges }, thresholds).has(skill)
    }).length
    const tagged = charts.filter((c) => skillsById.get(c.id)?.has(skill)).length
    return { skill, threshold: thresholds[skill] ?? null, titleHit: hits, titleCount: titleIds.length, tagged }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/piu-data/skills.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/piu-data/skills.mjs scripts/piu-data/skills.test.mjs
git commit -m "feat(pump): skill tagging from piucenter coverage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Encode, check and build `charts.json`

**Files:**
- Create: `scripts/piu-data/encode.mjs`, `scripts/piu-data/encode.test.mjs`, `scripts/piu-data/report.mjs`, `scripts/piu-data/report.test.mjs`, `scripts/piu-data/build.mjs`, `scripts/piu-data/README.md`, `src/apps/pump/data/charts.json` (generated)

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces:
  - `encodeCatalog({ songs, charts, byChart, skillsById, gimmickFrom, titles, meta })` returns `{ file, warnings }`. `file` is the compact `charts.json` object:

    ```text
    meta   { game, patch, builtAt, sources[], badgeNames[], stepArtists[] }
    songs  [{ t, k?, a, y, ch?, se, bpm? }]
    charts [{ id, s, m, lv, p?, sk, cov?, b?, g?, f?, by? }]
    titles [{ id, track, lv, chart }]
    ```

  - `stringifyCatalog(file): string`, one array element per line.
  - `diffCatalogs(prev|null, next): { added: string[], removed: string[], rerated: string[] }`
  - `checkCatalog(file, ctx): string[]`, the errors.
  - `renderReport(...)`: string.

- [ ] **Step 1: Write the failing tests**

Create `scripts/piu-data/encode.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { encodeCatalog, stringifyCatalog } from './encode.mjs'

const songs = new Map([
  [1, { id: 1, title: 'Bee', titleKo: null, artist: 'BanYa', cut: 'ARCADE', channel: 'ORIGINAL', series: 'NX~NXA', bpm: [147, 147] }],
  [2, { id: 2, title: '1948', titleKo: '천구백사십팔', artist: 'X', cut: 'ARCADE', channel: null, series: 'PHOENIX 2', bpm: null }],
])
const charts = [
  { id: 20, songId: 2, mode: 'D', level: null, prevLevel: null, premium: false, steamLink: false, stepArtist: null },
  { id: 10, songId: 1, mode: 'S', level: 19, prevLevel: 18, premium: true, steamLink: false, stepArtist: 'BanYa' },
]
const byChart = new Map([
  [10, { level: 19, badges: ['Runs', 'Twists'], coverage: { run: 0.5, twist_90: 0.25, mid6_doubles: 0 } }],
  [20, { level: 29, badges: ['Runs'], coverage: { run: 0.123 } }],
])
const skillsById = new Map([[10, new Set(['run', 'twist', 'gimmick'])], [20, new Set(['run'])]])

describe('encodeCatalog', () => {
  const { file, warnings } = encodeCatalog({
    songs, charts, byChart, skillsById,
    gimmickFrom: new Map([[10, ['PHOENIX 2 SLOW Lv.1']]]),
    titles: [{ id: 'RUN_S_5', track: 'RUN S', lv: 5, chart: 10 }],
    meta: { game: 'PHOENIX 2', patch: '1.01.0', builtAt: '2026-10-14', sources: [] },
  })

  it('orders charts by id and indexes songs, badges and step artists', () => {
    expect(file.charts.map((c) => c.id)).toEqual([10, 20])
    expect(file.songs.map((s) => s.t)).toEqual(['Bee', '1948'])
    expect(file.meta.badgeNames).toEqual(['Runs', 'Twists'])
    expect(file.meta.stepArtists).toEqual(['BanYa'])
  })
  it('packs a chart compactly', () => {
    expect(file.charts[0]).toEqual({
      id: 10, s: 0, m: 'S', lv: 19, p: 18,
      sk: 0b100110, // run (bit 1) + twist (bit 2) + gimmick (bit 5)
      cov: [0, 50, 25, 0, 0], b: [0, 1], g: ['PHOENIX 2 SLOW Lv.1'], f: 1, by: 0,
    })
  })
  it('falls back to the PIU Scores level when pumpout has none, with a warning', () => {
    expect(file.charts[1].lv).toBe(29)
    expect(warnings).toEqual(['1948 D: no pumpout level, using PIU Scores D29'])
  })
  it('keeps optional song fields out when empty', () => {
    expect(file.songs[0]).toEqual({ t: 'Bee', a: 'BanYa', y: 'ARCADE', ch: 'ORIGINAL', se: 'NX~NXA', bpm: [147, 147] })
    expect(file.songs[1]).toEqual({ t: '1948', k: '천구백사십팔', a: 'X', y: 'ARCADE', se: 'PHOENIX 2' })
  })
  it('stringifies one array element per line and round-trips', () => {
    const text = stringifyCatalog(file)
    expect(JSON.parse(text)).toEqual(file)
    expect(text.split('\n').length).toBeGreaterThan(file.charts.length + file.songs.length)
  })
})
```

Create `scripts/piu-data/report.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { checkCatalog, diffCatalogs } from './report.mjs'

const file = (charts) => ({
  meta: {}, titles: Array(90).fill({}),
  songs: [{ t: 'Bee' }, { t: 'Conflict' }],
  charts,
})

describe('diffCatalogs', () => {
  it('lists new, removed and re-rated charts by name', () => {
    const prev = file([{ id: 1, s: 0, m: 'S', lv: 19 }, { id: 2, s: 1, m: 'D', lv: 24 }])
    const next = file([{ id: 2, s: 1, m: 'D', lv: 25 }, { id: 3, s: 0, m: 'HDB', lv: 20 }])
    expect(diffCatalogs(prev, next)).toEqual({ added: ['Bee HD20'], removed: ['Bee S19'], rerated: ['Conflict D24 → D25'] })
  })
  it('treats a first build as all new', () => {
    expect(diffCatalogs(null, file([{ id: 1, s: 0, m: 'S', lv: 19 }])).added).toEqual(['Bee S19'])
  })
})

describe('checkCatalog', () => {
  const ok = { missingTitles: [], unmatched: [], sdCount: 100, sdWithSkills: 98, bytes: 500_000 }
  it('passes a healthy build', () => {
    expect(checkCatalog(file([{ id: 1, s: 0, m: 'S', lv: 19 }]), ok)).toEqual([])
  })
  it('fails on missing title charts, unrated charts, low skill coverage, size and many unmatched rows', () => {
    const errors = checkCatalog(file([{ id: 1, s: 0, m: 'S', lv: null }]), {
      missingTitles: [{ label: 'Take Out D23' }],
      unmatched: Array(51).fill({ song: 'x' }),
      sdCount: 100, sdWithSkills: 90, bytes: 600_001,
    })
    expect(errors).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run scripts/piu-data/encode.test.mjs scripts/piu-data/report.test.mjs`
Expected: FAIL. The modules `./encode.mjs` and `./report.mjs` can't be found.

- [ ] **Step 3: Implement `encode.mjs` and `report.mjs`**

Create `scripts/piu-data/encode.mjs`:

```js
import { COMPUTED_SKILLS, SKILLS, skillScore } from './skills.mjs'

const MODE_SHORT = { S: 'S', D: 'D', HDB: 'HD' }

/** Build the compact charts.json object. Short keys keep the file under the 600 KB budget. */
export function encodeCatalog({ songs, charts, byChart, skillsById, gimmickFrom, titles, meta }) {
  const warnings = []
  const sorted = [...charts].sort((a, b) => a.id - b.id)
  const songIds = [...new Set(sorted.map((c) => c.songId))]
  const songIndex = new Map(songIds.map((id, i) => [id, i]))
  const badgeNames = [...new Set(sorted.flatMap((c) => byChart.get(c.id)?.badges ?? []))].sort()
  const stepArtists = [...new Set(sorted.map((c) => c.stepArtist).filter(Boolean))].sort()

  const outCharts = sorted.map((c) => {
    const row = byChart.get(c.id)
    let lv = c.level
    if (lv == null && row) {
      lv = row.level
      warnings.push(`${songs.get(c.songId).title} ${MODE_SHORT[c.mode]}: no pumpout level, using PIU Scores ${MODE_SHORT[c.mode]}${lv}`)
    }
    const skills = skillsById.get(c.id) ?? new Set()
    const out = { id: c.id, s: songIndex.get(c.songId), m: c.mode, lv }
    if (c.prevLevel != null) out.p = c.prevLevel
    out.sk = SKILLS.reduce((mask, s, i) => (skills.has(s) ? mask | (1 << i) : mask), 0)
    if (row) {
      out.cov = COMPUTED_SKILLS.map((s) => Math.round(skillScore(row.coverage, s) * 100))
      if (row.badges.length) out.b = row.badges.map((b) => badgeNames.indexOf(b))
    }
    const g = gimmickFrom.get(c.id)
    if (g) out.g = g
    const f = (c.premium ? 1 : 0) | (c.steamLink ? 2 : 0)
    if (f) out.f = f
    if (c.stepArtist) out.by = stepArtists.indexOf(c.stepArtist)
    return out
  })

  const outSongs = songIds.map((id) => {
    const s = songs.get(id)
    const out = { t: s.title }
    if (s.titleKo) out.k = s.titleKo
    out.a = s.artist
    out.y = s.cut
    if (s.channel) out.ch = s.channel
    out.se = s.series
    if (s.bpm) out.bpm = s.bpm
    return out
  })

  return {
    file: { meta: { ...meta, badgeNames, stepArtists }, songs: outSongs, charts: outCharts, titles },
    warnings,
  }
}

/** JSON with one array element per line, so a data refresh diffs readably in git. */
export function stringifyCatalog(file) {
  const arr = (items) => `[\n${items.map((x) => JSON.stringify(x)).join(',\n')}\n]`
  return `{\n"meta": ${JSON.stringify(file.meta)},\n"songs": ${arr(file.songs)},\n"charts": ${arr(file.charts)},\n"titles": ${arr(file.titles)}\n}\n`
}
```

Create `scripts/piu-data/report.mjs`:

```js
export const MAX_BYTES = 600_000
const MAX_UNMATCHED = 50
const MIN_SKILL_SHARE = 0.97
const MODE_SHORT = { S: 'S', D: 'D', HDB: 'HD' }

const name = (file, c) => `${file.songs[c.s].t} ${MODE_SHORT[c.m]}${c.lv}`

export function diffCatalogs(prev, next) {
  const before = new Map((prev?.charts ?? []).map((c) => [c.id, c]))
  const after = new Map(next.charts.map((c) => [c.id, c]))
  const added = next.charts.filter((c) => !before.has(c.id)).map((c) => name(next, c))
  const removed = (prev?.charts ?? []).filter((c) => !after.has(c.id)).map((c) => name(prev, c))
  const rerated = next.charts
    .filter((c) => before.has(c.id) && before.get(c.id).lv !== c.lv)
    .map((c) => `${name(prev, before.get(c.id))} → ${MODE_SHORT[c.m]}${c.lv}`)
  return { added, removed, rerated }
}

export function checkCatalog(file, { missingTitles, unmatched, sdCount, sdWithSkills, bytes }) {
  const errors = []
  if (missingTitles.length) errors.push(`PHOENIX 2 title charts missing from the catalog: ${missingTitles.map((e) => e.label).join(', ')}`)
  const unrated = file.charts.filter((c) => !(c.lv >= 1))
  if (unrated.length) errors.push(`${unrated.length} chart(s) have no level: ${unrated.map((c) => c.id).join(', ')}`)
  if (sdWithSkills / sdCount < MIN_SKILL_SHARE) errors.push(`Only ${sdWithSkills}/${sdCount} S/D charts have skill data (need ≥ ${MIN_SKILL_SHARE * 100}%)`)
  if (bytes > MAX_BYTES) errors.push(`charts.json would be ${bytes} bytes (budget ${MAX_BYTES})`)
  if (unmatched.length > MAX_UNMATCHED) errors.push(`${unmatched.length} PIU Scores rows did not join (max ${MAX_UNMATCHED}) — did the CSV change?`)
  return errors
}

export function renderReport({ file, diff, stats, unmatched, warnings, errors }) {
  const modes = {}
  for (const c of file.charts) modes[c.m] = (modes[c.m] ?? 0) + 1
  const lines = [
    `# Pump data — ${file.meta.game} ${file.meta.patch} (${file.meta.builtAt})`,
    '',
    `Songs ${file.songs.length} · charts ${file.charts.length} (${Object.entries(modes).map(([m, n]) => `${m} ${n}`).join(', ')}) · titles ${file.titles.length}`,
    '',
    '## Changes since the committed charts.json',
    `New (${diff.added.length}): ${diff.added.slice(0, 40).join(', ')}${diff.added.length > 40 ? ' …' : ''}`,
    `Removed (${diff.removed.length}): ${diff.removed.join(', ')}`,
    `Re-rated (${diff.rerated.length}): ${diff.rerated.join(', ')}`,
    '',
    '## Skills',
    ...stats.map((s) =>
      `${s.skill.padEnd(8)} threshold ${s.threshold === null ? '—' : Number.isFinite(s.threshold) ? s.threshold.toFixed(3) : '∞'} · title charts tagged before forcing ${s.titleHit}/${s.titleCount} · charts tagged ${s.tagged} (${Math.round((s.tagged / file.charts.length) * 100)}%)`),
    '',
    `## Unmatched PIU Scores rows (${unmatched.length})`,
    ...unmatched.map((r) => `- ${r.song} ${r.mode}${r.level}`),
    '',
    `## Warnings (${warnings.length})`,
    ...warnings.map((w) => `- ${w}`),
  ]
  if (errors.length) lines.push('', `## FAILED CHECKS (${errors.length})`, ...errors.map((e) => `- ${e}`))
  return lines.join('\n')
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/piu-data/encode.test.mjs scripts/piu-data/report.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Write the build entry and its README**

Create `scripts/piu-data/build.mjs`:

```js
#!/usr/bin/env node
// Builds src/apps/pump/data/charts.json. Run with `npm run piu:data`; see README.md.
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import initSqlJs from 'sql.js'
import { PIUSCORES, PUMPOUT } from './sources.mjs'
import { fetchCached } from './cache.mjs'
import { readPumpout } from './pumpout.mjs'
import { readPiuScores } from './piuscores.mjs'
import { joinCoverage } from './join.mjs'
import { resolveLadders } from './titles.mjs'
import { computeThresholds, skillStats, skillsFor } from './skills.mjs'
import { encodeCatalog, stringifyCatalog } from './encode.mjs'
import { checkCatalog, diffCatalogs, renderReport } from './report.mjs'

const OUT = 'src/apps/pump/data/charts.json'
const today = new Date().toISOString().slice(0, 10)

const SQL = await initSqlJs()
const db = new SQL.Database(await fetchCached(PUMPOUT.url, `pumpout-${PUMPOUT.commit.slice(0, 7)}.db`))
const { songs, charts } = readPumpout(db, PUMPOUT)

const csv = await fetchCached(PIUSCORES.url, `piuscores-${today}.csv`, { refresh: true })
const rows = readPiuScores(csv.toString('utf8'))
const { byChart, unmatched } = joinCoverage(charts, songs, rows)

const ladders = JSON.parse(await readFile(new URL('./ladders.json', import.meta.url), 'utf8'))
const { titles, forced, gimmickFrom, missing } = resolveLadders(ladders, new Set(charts.map((c) => c.id)))

const thresholds = computeThresholds(charts, byChart, forced)
const skillsById = new Map(charts.map((c) => [c.id, skillsFor(c, byChart.get(c.id), thresholds, forced.get(c.id))]))

const { file, warnings } = encodeCatalog({
  songs, charts, byChart, skillsById, gimmickFrom, titles,
  meta: {
    game: 'PHOENIX 2',
    patch: PUMPOUT.patch,
    builtAt: today,
    sources: [
      { name: PUMPOUT.name, url: PUMPOUT.repo, ref: PUMPOUT.commit },
      { name: PIUSCORES.name, url: PIUSCORES.site, ref: `chart export ${today}` },
      { name: 'piucenter.com', url: 'https://www.piucenter.com', ref: 'skill analysis, via PIU Scores' },
    ],
  },
})
const text = stringifyCatalog(file)
const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : null
const sd = charts.filter((c) => c.mode !== 'HDB')
const errors = checkCatalog(file, {
  missingTitles: missing,
  unmatched,
  sdCount: sd.length,
  sdWithSkills: sd.filter((c) => byChart.has(c.id)).length,
  bytes: Buffer.byteLength(text),
})

console.log(renderReport({
  file, diff: diffCatalogs(prev, file),
  stats: skillStats(charts, byChart, thresholds, forced, skillsById),
  unmatched, warnings, errors,
}))
if (errors.length) {
  console.error(`\n${errors.length} check(s) failed — ${OUT} was not written.`)
  process.exit(1)
}
await writeFile(OUT, text)
console.log(`\nWrote ${OUT} (${Buffer.byteLength(text)} bytes).`)
```

Create `scripts/piu-data/README.md`:

````markdown
# Pump data build

`npm run piu:data` writes `src/apps/pump/data/charts.json` (committed) and prints a report.

Inputs (`sources.mjs`):
- **pumpout-db-updates**: one SQLite file per patch, pinned to a commit. Cached in `.cache/piu-data/`.
- **PIU Scores chart export**: fetched fresh every run; a dated copy is kept in `.cache/piu-data/`.
- **`ladders.json`**: the skill-title charts as pumpout chart IDs, each with its source.

## After an Andamiro patch

1. When pumpout-db-updates has the new patch, set `PUMPOUT.commit`, `file`, `version` (the new `version.versionId`), `prevVersion` and `patch` in `sources.mjs`. Find the IDs with any SQLite viewer:
   ```sql
   SELECT versionId, internalTitle FROM version ORDER BY sortOrder DESC LIMIT 3
   ```
2. Run `npm run piu:data` and read the report:
   - new, removed and re-rated charts;
   - unmatched PIU Scores rows;
   - per-skill threshold stats;
   - warnings.
3. If the patch notes change a title ladder, update `ladders.json` with the new pumpout chart IDs and cite the source.
4. Run `npm test`. The data tests check the committed file.
5. Commit `charts.json` (plus `sources.mjs` and `ladders.json`) on a branch and open a PR.

If any check fails, the build stops and leaves the committed `charts.json` as it was.
````

- [ ] **Step 6: Run the real build**

Run: `npm run piu:data`
Expected: the report prints, then `Wrote src/apps/pump/data/charts.json (N bytes).` with N ≤ 600000. Check the report against these values from the 2026-10-14 prototype:
- Songs about 669. Charts **5,325**: S 2,752 · D 1,783 · HDB 790. Titles 90.
- Unmatched PIU Scores rows: **0**.
- One warning: `1948 D: no pumpout level, using PIU Scores D29`.
- Gimmick tagged on **22** charts. Twist, run, bracket, half and drill each tag every one of their title charts after forcing.
- First build: "New" lists everything; "Removed" and "Re-rated" are empty.

If the run fails a check, read the FAILED CHECKS list. Fix the input or code it names, then rerun. Don't loosen a check to make it pass.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm test`
Expected: PASS.

```bash
git add scripts/piu-data/encode.mjs scripts/piu-data/encode.test.mjs scripts/piu-data/report.mjs scripts/piu-data/report.test.mjs scripts/piu-data/build.mjs scripts/piu-data/README.md src/apps/pump/data/charts.json
git commit -m "feat(pump): build charts.json from pumpout and PIU Scores" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: App data layer

**Files:**
- Create: `src/apps/pump/data/types.ts`, `src/apps/pump/data/schema.ts`, `src/apps/pump/data/catalog.ts`, `src/apps/pump/data/catalog.test.ts`, `src/apps/pump/lib/normalize.ts`, `src/apps/pump/lib/normalize.test.ts`, `src/apps/pump/lib/labels.ts`, `src/apps/pump/lib/labels.test.ts`

**Interfaces:**
- Consumes: the committed `charts.json` (Task 7).
- Produces:
  - Constants: `SKILLS`, `COMPUTED_SKILLS`, `MODES`, `SONG_TYPES`, `SERIES`, `TRACKS`.
  - Types: `SkillId`, `ComputedSkill`, `Mode`, `SongType`, `Series`, `Track`, `Song`, `Chart`, `Title`, `CatalogMeta`, `Catalog`.
  - `chartsFileSchema`, `ChartsFile`.
  - `decodeCatalog(file: ChartsFile): Catalog`, `getCatalog(): Catalog`.
  - `fold(s): string`, `tokens(q): string[]`.
  - `MODE_SHORT`, `MODE_LABEL`, `SONG_TYPE_LABEL`, `levelLabel`, `modesLabel`, `chartLine2`, `chartFacts`, `titleName`.

- [ ] **Step 1: Write the types, schema, normalize and labels (no behaviour to test yet in types/schema)**

Create `src/apps/pump/data/types.ts`:

```ts
/** Fixed order. Bit i of a chart's `sk` mask in charts.json is SKILLS[i]. */
export const SKILLS = ['half', 'run', 'twist', 'bracket', 'drill', 'gimmick'] as const
export type SkillId = (typeof SKILLS)[number]

/** Skills with a coverage score (gimmick comes only from title lists). */
export const COMPUTED_SKILLS = ['half', 'run', 'twist', 'bracket', 'drill'] as const
export type ComputedSkill = (typeof COMPUTED_SKILLS)[number]

export const MODES = ['S', 'D', 'HDB'] as const
export type Mode = (typeof MODES)[number]

export const SONG_TYPES = ['ARCADE', 'SHORTCUT', 'REMIX', 'FULLSONG'] as const
export type SongType = (typeof SONG_TYPES)[number]

/** PHOENIX 2's Series Zone groups, oldest first. */
export const SERIES = ['1st~ZERO', 'NX~NXA', 'FIESTA~FIESTA 2', 'PRIME', 'PRIME 2', 'XX', 'PHOENIX', 'PHOENIX 2'] as const
export type Series = (typeof SERIES)[number]

/** PHOENIX 2 skill-title tracks, in the official title page's order. */
export const TRACKS = ['TWIST S', 'TWIST D', 'RUN S', 'RUN D', 'DRILL', 'GIMMICK', 'SLOW', 'HALF', 'BRACKET'] as const
export type Track = (typeof TRACKS)[number]

export interface Song {
  title: string
  titleKo?: string
  artist: string
  type: SongType
  channel?: string
  series: Series
  bpm?: [number, number]
  /** fold(title + titleKo + artist), for search */
  search: string
}

export interface Chart {
  /** pumpout chart id — stable across data rebuilds */
  id: number
  song: Song
  mode: Mode
  level: number
  /** PHOENIX level, only when it differs */
  prevLevel?: number
  /** empty = no skill data */
  skills: SkillId[]
  /** 0–100 per computed skill; absent = no skill data */
  coverage?: Record<ComputedSkill, number>
  /** piucenter top-3 badges */
  badges: string[]
  /** e.g. "PHOENIX 2 SLOW Lv.2"; non-empty means tagged gimmick */
  gimmickFrom: string[]
  premium: boolean
  steamLink: boolean
  stepArtist?: string
  /** PHOENIX 2 title ids this chart unlocks */
  titleIds: string[]
}

export interface Title {
  id: string
  track: Track
  lv: number
  chart: Chart
}

export interface CatalogMeta {
  game: string
  patch: string
  builtAt: string
  sources: { name: string; url: string; ref: string }[]
}

export interface Catalog {
  meta: CatalogMeta
  charts: Chart[]
  byId: Map<number, Chart>
  titles: Title[]
  /** every level that exists in the data, ascending */
  levels: number[]
}
```

Create `src/apps/pump/data/schema.ts`:

```ts
import { z } from 'zod'
import { MODES, SERIES, SONG_TYPES, TRACKS } from '@/apps/pump/data/types'

/**
 * The compact charts.json written by scripts/piu-data/build.mjs. Short keys
 * keep it under the 600 KB budget; decodeCatalog() expands it.
 */
export const chartsFileSchema = z.object({
  meta: z.object({
    game: z.string(),
    patch: z.string(),
    builtAt: z.string(),
    sources: z.array(z.object({ name: z.string(), url: z.string(), ref: z.string() })),
    badgeNames: z.array(z.string()),
    stepArtists: z.array(z.string()),
  }),
  songs: z.array(
    z.object({
      t: z.string(), // title
      k: z.string().optional(), // Korean title
      a: z.string(), // artist
      y: z.enum(SONG_TYPES), // song type
      ch: z.string().optional(), // channel
      se: z.enum(SERIES), // series (debut group)
      bpm: z.tuple([z.number(), z.number()]).optional(),
    }),
  ),
  charts: z.array(
    z.object({
      id: z.number().int(),
      s: z.number().int().nonnegative(), // song index
      m: z.enum(MODES),
      lv: z.number().int().min(1),
      p: z.number().int().optional(), // PHOENIX level when it changed
      sk: z.number().int().min(0).max(63), // skill bitmask, SKILLS order
      cov: z.array(z.number().int().min(0).max(100)).length(5).optional(),
      b: z.array(z.number().int().nonnegative()).optional(), // badge indexes
      g: z.array(z.string()).optional(), // gimmick ladders
      f: z.number().int().min(0).max(3).optional(), // 1 premium, 2 steam link
      by: z.number().int().nonnegative().optional(), // step artist index
    }),
  ),
  titles: z.array(
    z.object({ id: z.string(), track: z.enum(TRACKS), lv: z.number().int().min(1).max(10), chart: z.number().int() }),
  ),
})

export type ChartsFile = z.infer<typeof chartsFileSchema>
```

Create `src/apps/pump/lib/normalize.ts`:

```ts
/**
 * Search form of a string: NFKD (folds accents, full-width forms and Korean
 * compatibility jamo), combining marks stripped, lower-cased. Hangul stays
 * decomposed, so a half-typed syllable is a prefix of the full one.
 */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Folded, whitespace-separated search tokens; tokens with no letter or digit are dropped. */
export function tokens(query: string): string[] {
  return fold(query)
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
}
```

Create `src/apps/pump/lib/labels.ts`:

```ts
import type { Chart, Mode, SongType } from '@/apps/pump/data/types'

export const MODE_SHORT: Record<Mode, string> = { S: 'S', D: 'D', HDB: 'HD' }
export const MODE_LABEL: Record<Mode, string> = { S: 'Single', D: 'Double', HDB: 'Half-Double' }
export const SONG_TYPE_LABEL: Record<SongType, string> = {
  ARCADE: 'Arcade',
  SHORTCUT: 'Short Cut',
  REMIX: 'Remix',
  FULLSONG: 'Full Song',
}

export function levelLabel([from, to]: readonly [number, number]): string {
  return from === to ? `Lv ${from}` : `Lv ${from}–${to}`
}

export function modesLabel(modes: readonly Mode[]): string {
  return modes.map((m) => MODE_SHORT[m]).join(' or ')
}

/** Row line 2: artist · song type (only when not Arcade) · series. */
export function chartLine2(c: Chart): string {
  return [c.song.artist, c.song.type !== 'ARCADE' ? SONG_TYPE_LABEL[c.song.type] : null, c.song.series]
    .filter(Boolean)
    .join(' · ')
}

/** Chart sheet facts: song type · channel · series · BPM · step artist. */
export function chartFacts(c: Chart): string {
  const bpm = c.song.bpm
  const bpmText = bpm
    ? Math.round(bpm[0]) === Math.round(bpm[1])
      ? `${Math.round(bpm[0])} BPM`
      : `${Math.round(bpm[0])}–${Math.round(bpm[1])} BPM`
    : null
  return [SONG_TYPE_LABEL[c.song.type], c.song.channel, c.song.series, bpmText, c.stepArtist ? `steps by ${c.stepArtist}` : null]
    .filter(Boolean)
    .join(' · ')
}

export function titleName(t: { track: string; lv: number }): string {
  return `${t.track} Lv.${t.lv}`
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/apps/pump/lib/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fold, tokens } from './normalize'

describe('fold', () => {
  it('ignores case, accents and full-width forms', () => {
    expect(fold('Café')).toBe('cafe')
    expect(fold('ＢＥＥ')).toBe('bee')
  })
})

describe('tokens', () => {
  it('splits on whitespace and drops punctuation-only tokens', () => {
    expect(tokens('  Final   Audition ')).toEqual(['final', 'audition'])
    expect(tokens(' - ')).toEqual([])
    expect(tokens('8 6')).toEqual(['8', '6'])
  })
})

describe('half-typed Korean (research-ui §3.3)', () => {
  const hay = fold('사랑 한글')
  it.each(['ㅅ', '사', '사라', '사랑', '하', '한', '한ㄱ', '한그', '한글'])('matches %s', (q) => {
    expect(tokens(q).every((t) => hay.includes(t))).toBe(true)
  })
})
```

Create `src/apps/pump/lib/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Chart } from '@/apps/pump/data/types'
import { chartFacts, chartLine2, levelLabel, modesLabel, titleName } from './labels'

const chart = {
  song: { title: 'Gargoyle', artist: 'SHK', type: 'FULLSONG', channel: 'ORIGINAL', series: 'XX', bpm: [150, 150], search: '' },
  stepArtist: 'FEFEMZ',
} as unknown as Chart

describe('labels', () => {
  it('formats levels and modes', () => {
    expect(levelLabel([19, 19])).toBe('Lv 19')
    expect(levelLabel([18, 20])).toBe('Lv 18–20')
    expect(modesLabel(['S', 'HDB'])).toBe('S or HD')
  })
  it('writes line 2 with the song type only when it is not Arcade', () => {
    expect(chartLine2(chart)).toBe('SHK · Full Song · XX')
    expect(chartLine2({ ...chart, song: { ...chart.song, type: 'ARCADE' } })).toBe('SHK · XX')
  })
  it('writes the chart facts, with a BPM range when it varies', () => {
    expect(chartFacts(chart)).toBe('Full Song · ORIGINAL · XX · 150 BPM · steps by FEFEMZ')
    expect(chartFacts({ ...chart, stepArtist: undefined, song: { ...chart.song, bpm: [90, 180] } })).toBe(
      'Full Song · ORIGINAL · XX · 90–180 BPM',
    )
  })
  it('names a title', () => {
    expect(titleName({ track: 'TWIST D', lv: 7 })).toBe('TWIST D Lv.7')
  })
})
```

Create `src/apps/pump/data/catalog.test.ts`:

```ts
import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chartsFileSchema } from './schema'
import { decodeCatalog, getCatalog } from './catalog'
import { fold } from '@/apps/pump/lib/normalize'
import { TRACKS } from './types'

const PATH = 'src/apps/pump/data/charts.json'

describe('decodeCatalog', () => {
  const file = chartsFileSchema.parse({
    meta: { game: 'PHOENIX 2', patch: '1.01.0', builtAt: '2026-10-14', sources: [], badgeNames: ['Runs', 'Twists'], stepArtists: ['BanYa'] },
    songs: [{ t: 'Bee', k: '벌', a: 'BanYa', y: 'ARCADE', ch: 'ORIGINAL', se: 'NX~NXA', bpm: [147, 147] }],
    charts: [
      { id: 10, s: 0, m: 'S', lv: 19, p: 18, sk: 0b100110, cov: [0, 50, 25, 0, 0], b: [0, 1], g: ['PHOENIX 2 SLOW Lv.1'], f: 1, by: 0 },
      { id: 11, s: 0, m: 'HDB', lv: 20, sk: 0, f: 2 },
    ],
    titles: [{ id: 'RUN_S_5', track: 'RUN S', lv: 5, chart: 10 }],
  })
  const cat = decodeCatalog(file)

  it('expands a compact chart', () => {
    const c = cat.byId.get(10)!
    expect(c).toMatchObject({
      mode: 'S', level: 19, prevLevel: 18, skills: ['run', 'twist', 'gimmick'], badges: ['Runs', 'Twists'],
      gimmickFrom: ['PHOENIX 2 SLOW Lv.1'], premium: true, steamLink: false, stepArtist: 'BanYa', titleIds: ['RUN_S_5'],
    })
    expect(c.coverage).toEqual({ half: 0, run: 50, twist: 25, bracket: 0, drill: 0 })
    expect(c.song).toMatchObject({ title: 'Bee', titleKo: '벌', type: 'ARCADE', series: 'NX~NXA', bpm: [147, 147] })
  })
  it('flags Steam Link charts and leaves them without skill data', () => {
    expect(cat.byId.get(11)).toMatchObject({ steamLink: true, premium: false, skills: [], badges: [], coverage: undefined })
  })
  it('links titles to charts and lists the levels present', () => {
    expect(cat.titles[0].chart.id).toBe(10)
    expect(cat.levels).toEqual([19, 20])
  })
  it('folds title, Korean title and artist into one search key', () => {
    expect(cat.byId.get(10)!.song.search).toBe(fold('Bee 벌 BanYa'))
  })
})

describe('committed charts.json', () => {
  const file = chartsFileSchema.parse(JSON.parse(readFileSync(PATH, 'utf8')))
  const cat = decodeCatalog(file)

  it('stays within the 600 KB budget', () => {
    expect(statSync(PATH).size).toBeLessThanOrEqual(600_000)
  })
  it('has the 90 PHOENIX 2 titles, 10 per track, each resolving to a chart', () => {
    expect(cat.titles).toHaveLength(90)
    for (const track of TRACKS) expect(cat.titles.filter((t) => t.track === track)).toHaveLength(10)
    expect(cat.titles.every((t) => t.chart !== undefined)).toBe(true)
  })
  it('tags the 22 gimmick charts, matched by chart id across re-rates', () => {
    expect(cat.charts.filter((c) => c.skills.includes('gimmick'))).toHaveLength(22)
    expect(cat.byId.get(1017)).toMatchObject({ mode: 'D', level: 23 }) // Take Out [SLOW] Lv.9
    expect(cat.byId.get(1017)!.skills).toContain('gimmick')
  })
  it('has only S, D and HDB charts, and every HDB chart is Steam Link', () => {
    expect(new Set(cat.charts.map((c) => c.mode))).toEqual(new Set(['S', 'D', 'HDB']))
    expect(cat.charts.filter((c) => c.mode === 'HDB').every((c) => c.steamLink)).toBe(true)
  })
  it('loads the same data through getCatalog', () => {
    expect(getCatalog().charts).toHaveLength(file.charts.length)
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/apps/pump`
Expected: FAIL. `normalize.test.ts` and `labels.test.ts` pass once their modules exist, but `catalog.test.ts` fails: the module `./catalog` can't be found.

- [ ] **Step 4: Implement the catalog**

Create `src/apps/pump/data/catalog.ts`:

```ts
import raw from './charts.json?raw'
import type { ChartsFile } from '@/apps/pump/data/schema'
import { COMPUTED_SKILLS, SKILLS, type Catalog, type Chart, type ComputedSkill, type Song, type Title } from '@/apps/pump/data/types'
import { fold } from '@/apps/pump/lib/normalize'

/** Expand the compact charts.json into typed objects (done once per app start). */
export function decodeCatalog(file: ChartsFile): Catalog {
  const songs: Song[] = file.songs.map((s) => ({
    title: s.t,
    titleKo: s.k,
    artist: s.a,
    type: s.y,
    channel: s.ch,
    series: s.se,
    bpm: s.bpm,
    search: fold([s.t, s.k ?? '', s.a].join(' ')),
  }))
  const titleIds = new Map<number, string[]>()
  for (const t of file.titles) titleIds.set(t.chart, [...(titleIds.get(t.chart) ?? []), t.id])

  const charts: Chart[] = file.charts.map((c) => ({
    id: c.id,
    song: songs[c.s],
    mode: c.m,
    level: c.lv,
    prevLevel: c.p,
    skills: SKILLS.filter((_, i) => (c.sk & (1 << i)) !== 0),
    coverage: c.cov
      ? (Object.fromEntries(COMPUTED_SKILLS.map((s, i) => [s, c.cov![i]])) as Record<ComputedSkill, number>)
      : undefined,
    badges: (c.b ?? []).map((i) => file.meta.badgeNames[i]),
    gimmickFrom: c.g ?? [],
    premium: ((c.f ?? 0) & 1) !== 0,
    steamLink: ((c.f ?? 0) & 2) !== 0,
    stepArtist: c.by === undefined ? undefined : file.meta.stepArtists[c.by],
    titleIds: titleIds.get(c.id) ?? [],
  }))
  const byId = new Map(charts.map((c) => [c.id, c]))
  const titles: Title[] = file.titles.map((t) => ({ id: t.id, track: t.track, lv: t.lv, chart: byId.get(t.chart)! }))
  const levels = [...new Set(charts.map((c) => c.level))].sort((a, b) => a - b)
  const { game, patch, builtAt, sources } = file.meta
  return { meta: { game, patch, builtAt, sources }, charts, byId, titles, levels }
}

let cached: Catalog | null = null

/**
 * The bundled catalog. charts.json is imported as text (`?raw`) so TypeScript
 * never infers a type from 5,000 rows; it is validated by catalog.test.ts.
 */
export function getCatalog(): Catalog {
  if (!cached) cached = decodeCatalog(JSON.parse(raw) as ChartsFile)
  return cached
}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/apps/pump` then `npx tsc --noEmit`
Expected: PASS (normalize 11, labels 4, catalog 9), and tsc reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/apps/pump/data src/apps/pump/lib/normalize.ts src/apps/pump/lib/normalize.test.ts src/apps/pump/lib/labels.ts src/apps/pump/lib/labels.test.ts
git commit -m "feat(pump): typed catalog decoded from charts.json" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Search and filters

**Files:**
- Create: `src/apps/pump/lib/__fixtures__/charts.ts`, `src/apps/pump/lib/search.ts`, `src/apps/pump/lib/filters.ts`, `src/apps/pump/lib/filters.test.ts`

**Interfaces:**
- Consumes: `Chart`, `Mode`, `SkillId`, `SongType`, `Series`, the constant lists (Task 8); `tokens` (Task 8); `levelLabel`, `modesLabel`, `SONG_TYPE_LABEL` (Task 8).
- Produces:
  - `makeSong(over)`, `makeChart(over)`: test fixtures.
  - `matchesSearch(chart, toks): boolean`
  - `interface Filters { modes: Mode[]; level: [number, number] | null; skills: SkillId[]; skillsAll: boolean; types: SongType[]; series: Series[]; titleOnly: boolean; steamLink: boolean; hidePremium: boolean; q: string }`
  - `defaultFilters`
  - `applyFilters(charts, f): Chart[]` keeps the input order.
  - `facetCounts(charts, f): FacetCounts`
  - `removalSuggestions(charts, f, max = 3): Removal[]`
  - `toggleValue(list, v)`, `withSteamLink(f, on)`

- [ ] **Step 1: Write the fixtures and the failing tests**

Create `src/apps/pump/lib/__fixtures__/charts.ts`:

```ts
import type { Chart, Song } from '@/apps/pump/data/types'
import { fold } from '@/apps/pump/lib/normalize'

export function makeSong(over: Partial<Omit<Song, 'search'>> = {}): Song {
  const s = { title: 'Song', artist: 'Artist', type: 'ARCADE', series: 'XX', ...over } as Omit<Song, 'search'>
  return { ...s, search: fold([s.title, s.titleKo ?? '', s.artist].join(' ')) }
}

let nextId = 1

export function makeChart(over: Partial<Chart> = {}): Chart {
  return {
    id: nextId++,
    song: makeSong(),
    mode: 'S',
    level: 10,
    skills: [],
    badges: [],
    gimmickFrom: [],
    premium: false,
    steamLink: false,
    titleIds: [],
    ...over,
  }
}
```

Create `src/apps/pump/lib/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeChart, makeSong } from './__fixtures__/charts'
import { applyFilters, defaultFilters, facetCounts, removalSuggestions, toggleValue, withSteamLink, type Filters } from './filters'

const bee = makeSong({ title: 'Bee', artist: 'BanYa', series: 'NX~NXA' })
const conflict = makeSong({ title: 'Conflict', artist: 'Siromaru + Cranky', series: 'XX', type: 'ARCADE' })
const jupin = makeSong({ title: 'Jupin', titleKo: '주핀', artist: 'Nato', series: 'PRIME 2', type: 'SHORTCUT' })

const charts = [
  makeChart({ id: 1, song: bee, mode: 'S', level: 19, skills: ['run'] }),
  makeChart({ id: 2, song: bee, mode: 'D', level: 20, skills: ['run', 'twist'], titleIds: ['RUN_D_4'] }),
  makeChart({ id: 3, song: conflict, mode: 'D', level: 21, skills: ['twist', 'bracket'], premium: true }),
  makeChart({ id: 4, song: jupin, mode: 'S', level: 20, skills: ['run'] }),
  makeChart({ id: 5, song: bee, mode: 'HDB', level: 20, steamLink: true }),
]
const f = (over: Partial<Filters>): Filters => ({ ...defaultFilters, ...over })
const ids = (cs: { id: number }[]) => cs.map((c) => c.id)

describe('applyFilters', () => {
  it('shows everything except Steam Link charts by default, keeping order', () => {
    expect(ids(applyFilters(charts, defaultFilters))).toEqual([1, 2, 3, 4])
    expect(ids(applyFilters(charts, f({ steamLink: true })))).toEqual([1, 2, 3, 4, 5])
  })
  it('ORs values within a facet and ANDs facets', () => {
    expect(ids(applyFilters(charts, f({ modes: ['S', 'D'], level: [20, 21] })))).toEqual([2, 3, 4])
    expect(ids(applyFilters(charts, f({ modes: ['D'], level: [20, 20] })))).toEqual([2])
  })
  it('combines skills with any by default and all on request', () => {
    expect(ids(applyFilters(charts, f({ skills: ['twist', 'bracket'] })))).toEqual([2, 3])
    expect(ids(applyFilters(charts, f({ skills: ['twist', 'bracket'], skillsAll: true })))).toEqual([3])
  })
  it('filters song type, series, title charts and Premium', () => {
    expect(ids(applyFilters(charts, f({ types: ['SHORTCUT'] })))).toEqual([4])
    expect(ids(applyFilters(charts, f({ series: ['NX~NXA', 'XX'] })))).toEqual([1, 2, 3])
    expect(ids(applyFilters(charts, f({ titleOnly: true })))).toEqual([2])
    expect(ids(applyFilters(charts, f({ hidePremium: true })))).toEqual([1, 2, 4])
  })
  it('searches title, Korean title and artist, every token required', () => {
    expect(ids(applyFilters(charts, f({ q: 'banya' })))).toEqual([1, 2])
    expect(ids(applyFilters(charts, f({ q: '주' })))).toEqual([4])
    expect(ids(applyFilters(charts, f({ q: 'bee nato' })))).toEqual([])
    expect(ids(applyFilters(charts, f({ q: '  -  ' })))).toEqual([1, 2, 3, 4]) // blank-ish query = no search
  })
})

describe('facetCounts', () => {
  it('counts each option with all the other facets applied', () => {
    const c = facetCounts(charts, f({ modes: ['D'], skills: ['run'] }))
    expect(c.modes).toEqual({ S: 2, D: 1, HDB: 0 }) // modes ignored, skills=run applied
    expect(c.skills.twist).toBe(2) // skills ignored, modes=D applied: charts 2 and 3
    expect(c.series['NX~NXA']).toBe(1) // series ignored, modes=D + skills=run applied: chart 2
  })
})

describe('removalSuggestions', () => {
  it('offers the best removals first, with counts, and only ones that help', () => {
    const s = removalSuggestions(charts, f({ modes: ['S'], skills: ['bracket'], level: [19, 19] }))
    expect(s.map((r) => [r.label, r.count])).toEqual([
      ['bracket', 1],
    ])
    expect(removalSuggestions(charts, f({ q: 'zzz' })).map((r) => r.label)).toEqual(['"zzz"'])
  })
})

describe('helpers', () => {
  it('toggles a value in a list', () => {
    expect(toggleValue(['S'], 'D')).toEqual(['S', 'D'])
    expect(toggleValue(['S', 'D'], 'S')).toEqual(['D'])
  })
  it('drops the HD mode when Steam Link is turned off', () => {
    expect(withSteamLink(f({ steamLink: true, modes: ['D', 'HDB'] }), false)).toMatchObject({ steamLink: false, modes: ['D'] })
    expect(withSteamLink(f({ modes: ['D'] }), true)).toMatchObject({ steamLink: true, modes: ['D'] })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/apps/pump/lib/filters.test.ts`
Expected: FAIL. The module `./filters` can't be found.

- [ ] **Step 3: Implement**

Create `src/apps/pump/lib/search.ts`:

```ts
import type { Chart } from '@/apps/pump/data/types'

/** Every token (from tokens()) appears in the chart's folded title, Korean title or artist. */
export function matchesSearch(chart: Chart, toks: readonly string[]): boolean {
  return toks.every((t) => chart.song.search.includes(t))
}
```

Create `src/apps/pump/lib/filters.ts`:

```ts
import { MODES, SERIES, SKILLS, SONG_TYPES, type Chart, type Mode, type Series, type SkillId, type SongType } from '@/apps/pump/data/types'
import { tokens } from '@/apps/pump/lib/normalize'
import { matchesSearch } from '@/apps/pump/lib/search'
import { levelLabel, modesLabel, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'

/** Live filter state. An empty list means "no restriction" for that facet. */
export interface Filters {
  modes: Mode[]
  level: [number, number] | null
  skills: SkillId[]
  /** skills combine with AND instead of OR */
  skillsAll: boolean
  types: SongType[]
  series: Series[]
  titleOnly: boolean
  /** show Steam Link content (HD mode, RISE songs); off hides it */
  steamLink: boolean
  hidePremium: boolean
  q: string
}

export const defaultFilters: Filters = {
  modes: [],
  level: null,
  skills: [],
  skillsAll: false,
  types: [],
  series: [],
  titleOnly: false,
  steamLink: false,
  hidePremium: false,
  q: '',
}

type Facet = 'modes' | 'level' | 'skills' | 'types' | 'series' | 'titleOnly' | 'hidePremium' | 'q'

/** Does the chart pass every active facet (except `skip`, used for option counts)? */
export function passes(c: Chart, f: Filters, toks: readonly string[], skip?: Facet): boolean {
  if (!f.steamLink && c.steamLink) return false
  if (skip !== 'modes' && f.modes.length > 0 && !f.modes.includes(c.mode)) return false
  if (skip !== 'level' && f.level && (c.level < f.level[0] || c.level > f.level[1])) return false
  if (skip !== 'skills' && f.skills.length > 0) {
    const has = (s: SkillId) => c.skills.includes(s)
    if (f.skillsAll ? !f.skills.every(has) : !f.skills.some(has)) return false
  }
  if (skip !== 'types' && f.types.length > 0 && !f.types.includes(c.song.type)) return false
  if (skip !== 'series' && f.series.length > 0 && !f.series.includes(c.song.series)) return false
  if (skip !== 'titleOnly' && f.titleOnly && c.titleIds.length === 0) return false
  if (skip !== 'hidePremium' && f.hidePremium && c.premium) return false
  if (skip !== 'q' && toks.length > 0 && !matchesSearch(c, toks)) return false
  return true
}

/** The charts that pass, in their input order. */
export function applyFilters(charts: readonly Chart[], f: Filters): Chart[] {
  const toks = tokens(f.q)
  return charts.filter((c) => passes(c, f, toks))
}

export interface FacetCounts {
  modes: Record<Mode, number>
  skills: Record<SkillId, number>
  types: Record<SongType, number>
  series: Record<Series, number>
}

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
}

/** For each option: how many charts it would show, with all the other facets applied. */
export function facetCounts(charts: readonly Chart[], f: Filters): FacetCounts {
  const toks = tokens(f.q)
  const out: FacetCounts = { modes: zeros(MODES), skills: zeros(SKILLS), types: zeros(SONG_TYPES), series: zeros(SERIES) }
  for (const c of charts) {
    if (passes(c, f, toks, 'modes')) out.modes[c.mode]++
    if (passes(c, f, toks, 'skills')) for (const s of c.skills) out.skills[s]++
    if (passes(c, f, toks, 'types')) out.types[c.song.type]++
    if (passes(c, f, toks, 'series')) out.series[c.song.series]++
  }
  return out
}

export interface Removal {
  label: string
  next: Filters
  count: number
}

/** Zero-results helper: each active filter value, the filters without it, and what that would show. */
export function removalSuggestions(charts: readonly Chart[], f: Filters, max = 3): Removal[] {
  const options: { label: string; next: Filters }[] = []
  if (f.modes.length) options.push({ label: modesLabel(f.modes), next: { ...f, modes: [] } })
  if (f.level) options.push({ label: levelLabel(f.level), next: { ...f, level: null } })
  for (const s of f.skills) options.push({ label: s, next: { ...f, skills: f.skills.filter((x) => x !== s) } })
  if (f.types.length) options.push({ label: f.types.map((t) => SONG_TYPE_LABEL[t]).join(' or '), next: { ...f, types: [] } })
  if (f.series.length) options.push({ label: f.series.join(' or '), next: { ...f, series: [] } })
  if (f.titleOnly) options.push({ label: 'title charts only', next: { ...f, titleOnly: false } })
  if (f.hidePremium) options.push({ label: 'hide Premium', next: { ...f, hidePremium: false } })
  if (f.q.trim()) options.push({ label: `"${f.q.trim()}"`, next: { ...f, q: '' } })
  return options
    .map((o) => ({ ...o, count: applyFilters(charts, o.next).length }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
}

export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

/** Turning Steam Link off also drops the HD mode, so the list never empties out silently. */
export function withSteamLink(f: Filters, on: boolean): Filters {
  return { ...f, steamLink: on, modes: on ? f.modes : f.modes.filter((m) => m !== 'HDB') }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/apps/pump/lib/filters.test.ts`
Expected: PASS (9 tests).

Check the `removalSuggestions` case by hand if it fails. With `modes: ['S'], skills: ['bracket'], level: [19, 19]`:
- removing S → skills=bracket + Lv 19 → 0;
- removing Lv 19 → S + bracket → 0;
- removing bracket → S + Lv 19 → chart 1 → **1**.

So only `bracket` is offered.

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/lib/__fixtures__ src/apps/pump/lib/search.ts src/apps/pump/lib/filters.ts src/apps/pump/lib/filters.test.ts
git commit -m "feat(pump): search, filters, facet counts and removal suggestions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: URL state, level range and summary

**Files:**
- Create: `src/apps/pump/lib/url-state.ts`, `src/apps/pump/lib/url-state.test.ts`, `src/apps/pump/lib/level-range.ts`, `src/apps/pump/lib/level-range.test.ts`, `src/apps/pump/lib/summary.ts`, `src/apps/pump/lib/summary.test.ts`

**Interfaces:**
- Consumes: `Filters`, `defaultFilters` (Task 9); the constant lists (Task 8); `levelLabel`, `modesLabel`, `SONG_TYPE_LABEL` (Task 8).
- Produces:
  - `FILTER_KEYS`, `SHEET_KEYS = ['f', 'c', 'a']`
  - `parseLevel(raw): [number, number] | null`
  - `parseFilters(p: URLSearchParams): Filters`
  - `serializeFilters(f): string`: canonical, no leading `?`, commas unescaped.
  - `withFilters(current, f): URLSearchParams`
  - `hasFilterParams(p): boolean`
  - `mergeLiveFilters(current, live: string): URLSearchParams`
  - `paramsAfterClose(current, live: string): URLSearchParams`
  - `nextLevelRange(value, anchor, tapped): { value, anchor }`
  - `summarize(f): string`, `activeFacetCount(f): number`

- [ ] **Step 1: Write the failing tests**

Create `src/apps/pump/lib/url-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { defaultFilters, type Filters } from './filters'
import { hasFilterParams, mergeLiveFilters, paramsAfterClose, parseFilters, parseLevel, serializeFilters, withFilters } from './url-state'

const p = (s: string) => new URLSearchParams(s)
const full: Filters = {
  modes: ['S', 'D'], level: [18, 20], skills: ['twist', 'bracket'], skillsAll: true, types: ['SHORTCUT'],
  series: ['FIESTA~FIESTA 2', 'XX'], titleOnly: true, steamLink: true, hidePremium: true, q: 'vook',
}

describe('serializeFilters / parseFilters', () => {
  it('writes a canonical, readable query', () => {
    expect(serializeFilters({ ...full, skills: ['bracket', 'twist'], series: ['XX', 'FIESTA~FIESTA 2'] })).toBe(
      'm=S,D&lv=18-20&sk=twist,bracket&all=1&ty=shortcut&v=fiesta,xx&tc=1&sl=1&np=1&q=vook',
    )
    expect(serializeFilters(defaultFilters)).toBe('')
    expect(serializeFilters({ ...defaultFilters, level: [19, 19] })).toBe('lv=19')
  })
  it('round-trips', () => {
    expect(parseFilters(p(serializeFilters(full)))).toEqual(full)
  })
  it('keeps the search text as typed, but omits a blank one', () => {
    expect(parseFilters(p(serializeFilters({ ...defaultFilters, q: 'final ' }))).q).toBe('final ')
    expect(serializeFilters({ ...defaultFilters, q: '   ' })).toBe('')
  })
  it('drops unknown and malformed values instead of throwing', () => {
    expect(parseFilters(p('m=X,s&lv=abc&sk=jump,RUN&ty=nope&v=zzz&all=yes'))).toEqual({ ...defaultFilters, modes: ['S'], skills: ['run'] })
  })
  it('keeps the HD mode only while Steam Link is shown', () => {
    expect(parseFilters(p('m=HDB,D')).modes).toEqual(['D'])
    expect(parseFilters(p('m=HDB,D&sl=1')).modes).toEqual(['D', 'HDB'])
    expect(serializeFilters({ ...defaultFilters, modes: ['HDB'] })).toBe('')
  })
})

describe('parseLevel', () => {
  it('normalises ranges and rejects nonsense', () => {
    expect(parseLevel('29-18')).toEqual([18, 29])
    expect(parseLevel('19')).toEqual([19, 19])
    expect(parseLevel('0')).toBeNull()
    expect(parseLevel('abc')).toBeNull()
    expect(parseLevel('18-')).toBeNull()
    expect(parseLevel(null)).toBeNull()
  })
})

describe('params helpers', () => {
  it('replaces filter params and keeps UI params', () => {
    const next = withFilters(p('tab=titles&f=1&m=S&q=bee'), { ...defaultFilters, modes: ['D'] })
    expect(Object.fromEntries(next)).toEqual({ tab: 'titles', f: '1', m: 'D' })
  })
  it('knows when the URL carries filters', () => {
    expect(hasFilterParams(p('tab=titles'))).toBe(false)
    expect(hasFilterParams(p('lv=19'))).toBe(true)
  })
  it('re-applies live filters but keeps the current search text', () => {
    const next = mergeLiveFilters(p('m=S&q=bee&tab=titles&f=1'), 'm=D&lv=20')
    expect(Object.fromEntries(next)).toEqual({ q: 'bee', tab: 'titles', f: '1', m: 'D', lv: '20' })
  })
  it('after a sheet closes: live filters back, sheet params gone', () => {
    const next = paramsAfterClose(p('m=S&f=1&c=12&a=1'), 'sk=twist')
    expect(Object.fromEntries(next)).toEqual({ sk: 'twist' })
  })
})
```

Create `src/apps/pump/lib/level-range.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { nextLevelRange } from './level-range'

describe('nextLevelRange', () => {
  it('first tap picks one level and waits for a second', () => {
    expect(nextLevelRange(null, null, 18)).toEqual({ value: [18, 18], anchor: 18 })
  })
  it('second tap makes the inclusive range, either direction', () => {
    expect(nextLevelRange([18, 18], 18, 20)).toEqual({ value: [18, 20], anchor: null })
    expect(nextLevelRange([20, 20], 20, 18)).toEqual({ value: [18, 20], anchor: null })
  })
  it('a third tap starts over', () => {
    expect(nextLevelRange([18, 20], null, 22)).toEqual({ value: [22, 22], anchor: 22 })
  })
  it('tapping the only selected level clears it', () => {
    expect(nextLevelRange([19, 19], 19, 19)).toEqual({ value: null, anchor: null })
  })
  it('a single level restored from the URL acts as the first tap', () => {
    expect(nextLevelRange([19, 19], null, 21)).toEqual({ value: [19, 21], anchor: null })
    expect(nextLevelRange([19, 19], null, 19)).toEqual({ value: null, anchor: null })
  })
})
```

Create `src/apps/pump/lib/summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { defaultFilters } from './filters'
import { activeFacetCount, summarize } from './summary'

describe('summarize', () => {
  it('says what is shown, spelling out or/and', () => {
    expect(summarize(defaultFilters)).toBe('All charts')
    expect(summarize({ ...defaultFilters, modes: ['S', 'D'], level: [18, 20], skills: ['twist', 'bracket'] })).toBe(
      'S or D · Lv 18–20 · twist or bracket',
    )
    expect(summarize({ ...defaultFilters, skills: ['twist', 'run'], skillsAll: true, types: ['SHORTCUT'], titleOnly: true, q: ' vook ' })).toBe(
      'twist and run · Short Cut · title charts · "vook"',
    )
  })
})

describe('activeFacetCount', () => {
  it('counts active facets, not values, and ignores search', () => {
    expect(activeFacetCount(defaultFilters)).toBe(0)
    expect(activeFacetCount({ ...defaultFilters, modes: ['S', 'D'], skills: ['run'], steamLink: true, q: 'x' })).toBe(3)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/apps/pump/lib/url-state.test.ts src/apps/pump/lib/level-range.test.ts src/apps/pump/lib/summary.test.ts`
Expected: FAIL. The three modules can't be found.

- [ ] **Step 3: Implement**

Create `src/apps/pump/lib/url-state.ts`:

```ts
import { MODES, SERIES, SKILLS, SONG_TYPES, type Series, type SongType } from '@/apps/pump/data/types'
import type { Filters } from '@/apps/pump/lib/filters'

/** Query params that hold filters. Everything else (tab, f, c, a) is UI state. */
export const FILTER_KEYS = ['m', 'lv', 'sk', 'all', 'ty', 'v', 'tc', 'sl', 'np', 'q'] as const
/** Params that mean "a sheet is open". */
export const SHEET_KEYS = ['f', 'c', 'a'] as const

const TYPE_CODE: Record<SongType, string> = { ARCADE: 'arcade', SHORTCUT: 'shortcut', REMIX: 'remix', FULLSONG: 'fullsong' }
const SERIES_CODE: Record<Series, string> = {
  '1st~ZERO': '1st', 'NX~NXA': 'nx', 'FIESTA~FIESTA 2': 'fiesta', PRIME: 'prime',
  'PRIME 2': 'prime2', XX: 'xx', PHOENIX: 'phoenix', 'PHOENIX 2': 'phoenix2',
}

function list(p: URLSearchParams, key: string): Set<string> {
  return new Set((p.get(key) ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}

/** "18-20" or "19" → [from, to] (ordered); anything else → null. */
export function parseLevel(raw: string | null): [number, number] | null {
  const m = raw?.match(/^(\d{1,2})(?:-(\d{1,2}))?$/)
  if (!m) return null
  const a = Number(m[1])
  const b = m[2] === undefined ? a : Number(m[2])
  if (a < 1 || b < 1) return null
  return [Math.min(a, b), Math.max(a, b)]
}

/** Forgiving: unknown values are dropped; lists come back in canonical order. */
export function parseFilters(p: URLSearchParams): Filters {
  const steamLink = p.get('sl') === '1'
  const m = list(p, 'm')
  const sk = list(p, 'sk')
  const ty = list(p, 'ty')
  const v = list(p, 'v')
  return {
    modes: MODES.filter((x) => m.has(x.toLowerCase()) && (x !== 'HDB' || steamLink)),
    level: parseLevel(p.get('lv')),
    skills: SKILLS.filter((x) => sk.has(x)),
    skillsAll: p.get('all') === '1',
    types: SONG_TYPES.filter((x) => ty.has(TYPE_CODE[x])),
    series: SERIES.filter((x) => v.has(SERIES_CODE[x])),
    titleOnly: p.get('tc') === '1',
    steamLink,
    hidePremium: p.get('np') === '1',
    q: p.get('q') ?? '',
  }
}

/** Canonical query string (no leading "?"): fixed key and value order, defaults omitted. */
export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams()
  const modes = MODES.filter((x) => f.modes.includes(x) && (x !== 'HDB' || f.steamLink))
  if (modes.length) p.set('m', modes.join(','))
  if (f.level) p.set('lv', f.level[0] === f.level[1] ? String(f.level[0]) : `${f.level[0]}-${f.level[1]}`)
  const skills = SKILLS.filter((x) => f.skills.includes(x))
  if (skills.length) p.set('sk', skills.join(','))
  if (f.skillsAll) p.set('all', '1')
  const types = SONG_TYPES.filter((x) => f.types.includes(x))
  if (types.length) p.set('ty', types.map((x) => TYPE_CODE[x]).join(','))
  const series = SERIES.filter((x) => f.series.includes(x))
  if (series.length) p.set('v', series.map((x) => SERIES_CODE[x]).join(','))
  if (f.titleOnly) p.set('tc', '1')
  if (f.steamLink) p.set('sl', '1')
  if (f.hidePremium) p.set('np', '1')
  if (f.q.trim()) p.set('q', f.q)
  return p.toString().replace(/%2C/g, ',')
}

/** `current` with its filter params replaced by `f`; UI params (tab, sheets) untouched. */
export function withFilters(current: URLSearchParams, f: Filters): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of FILTER_KEYS) next.delete(k)
  for (const [k, v] of new URLSearchParams(serializeFilters(f))) next.set(k, v)
  return next
}

export function hasFilterParams(p: URLSearchParams): boolean {
  return FILTER_KEYS.some((k) => p.has(k))
}

/** `current` with the filters (but not the search text) taken from the stored `live` query. */
export function mergeLiveFilters(current: URLSearchParams, live: string): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const k of FILTER_KEYS) if (k !== 'q') next.delete(k)
  for (const [k, v] of new URLSearchParams(live)) if (k !== 'q') next.set(k, v)
  return next
}

/**
 * The URL after a sheet closes. Filter taps inside the Filters sheet replaced
 * the entry it pushed, so the entry Back lands on still holds the filters from
 * before; re-apply the live ones and drop every sheet param.
 */
export function paramsAfterClose(current: URLSearchParams, live: string): URLSearchParams {
  const next = mergeLiveFilters(current, live)
  for (const k of SHEET_KEYS) next.delete(k)
  return next
}
```

Create `src/apps/pump/lib/level-range.ts`:

```ts
export type LevelRange = [number, number] | null

/**
 * Level grid taps: first tap picks one level, the second makes the inclusive
 * range, a third starts over. Tapping the only selected level clears it. A
 * single level that is already selected (e.g. restored from the URL) counts
 * as the first tap.
 */
export function nextLevelRange(value: LevelRange, anchor: number | null, tapped: number): { value: LevelRange; anchor: number | null } {
  const first = anchor ?? (value && value[0] === value[1] ? value[0] : null)
  if (first !== null) {
    if (tapped === first) return { value: null, anchor: null }
    return { value: [Math.min(first, tapped), Math.max(first, tapped)], anchor: null }
  }
  return { value: [tapped, tapped], anchor: tapped }
}
```

Create `src/apps/pump/lib/summary.ts`:

```ts
import type { Filters } from '@/apps/pump/lib/filters'
import { levelLabel, modesLabel, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'

/** One line describing the filters, e.g. "S or D · Lv 18–20 · twist or bracket". Also a preset's default name. */
export function summarize(f: Filters): string {
  const parts: string[] = []
  if (f.modes.length) parts.push(modesLabel(f.modes))
  if (f.level) parts.push(levelLabel(f.level))
  if (f.skills.length) parts.push(f.skills.join(f.skillsAll ? ' and ' : ' or '))
  if (f.types.length) parts.push(f.types.map((t) => SONG_TYPE_LABEL[t]).join(' or '))
  if (f.series.length) parts.push(f.series.join(' or '))
  if (f.titleOnly) parts.push('title charts')
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`)
  return parts.length ? parts.join(' · ') : 'All charts'
}

/** Number shown on the Filters button: active facets (search excluded). */
export function activeFacetCount(f: Filters): number {
  return [
    f.modes.length > 0,
    f.level !== null,
    f.skills.length > 0,
    f.types.length > 0,
    f.series.length > 0,
    f.titleOnly,
    f.steamLink,
    f.hidePremium,
  ].filter(Boolean).length
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/apps/pump/lib/url-state.test.ts src/apps/pump/lib/level-range.test.ts src/apps/pump/lib/summary.test.ts`
Expected: PASS (url-state 10, level-range 5, summary 2).

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/lib/url-state.ts src/apps/pump/lib/url-state.test.ts src/apps/pump/lib/level-range.ts src/apps/pump/lib/level-range.test.ts src/apps/pump/lib/summary.ts src/apps/pump/lib/summary.test.ts
git commit -m "feat(pump): URL filter state, level range taps and summary line" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Ordering and title progress

**Files:**
- Create: `src/apps/pump/lib/order.ts`, `src/apps/pump/lib/order.test.ts`, `src/apps/pump/lib/titles.ts`, `src/apps/pump/lib/titles.test.ts`

**Interfaces:**
- Consumes: `Chart`, `Title`, `Track`, `TRACKS`, `SkillId` (Task 8); `makeChart`, `makeSong` (Task 9).
- Produces:
  - `sortCharts(charts): Chart[]` orders by level, then title, then mode S < D < HDB, then id.
  - `type ListRow = { kind: 'header'; key: string; level: number; count: number } | { kind: 'chart'; key: string; chart: Chart }`
  - `toRows(sorted): ListRow[]`
  - `rowSkills(chart, selected, max = 2): SkillId[]`
  - `interface TrackView { track: Track; titles: Title[]; earned: number; next: Title | null }`
  - `trackViews(titles, earned: ReadonlySet<string>): TrackView[]`
  - `earnedCount(titles, earned): number`

- [ ] **Step 1: Write the failing tests**

Create `src/apps/pump/lib/order.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeChart, makeSong } from './__fixtures__/charts'
import { rowSkills, sortCharts, toRows } from './order'

const a = makeSong({ title: 'apple' })
const b = makeSong({ title: 'Banana' })

describe('sortCharts', () => {
  it('orders by level, then title (case-insensitive), then S, D, HD', () => {
    const cs = [
      makeChart({ id: 1, song: b, level: 20, mode: 'S' }),
      makeChart({ id: 2, song: a, level: 20, mode: 'D' }),
      makeChart({ id: 3, song: a, level: 20, mode: 'S' }),
      makeChart({ id: 4, song: b, level: 19, mode: 'D' }),
    ]
    expect(sortCharts(cs).map((c) => c.id)).toEqual([4, 3, 2, 1])
  })
})

describe('toRows', () => {
  it('puts a header with a count before each level', () => {
    const cs = sortCharts([makeChart({ id: 1, level: 19 }), makeChart({ id: 2, level: 20 }), makeChart({ id: 3, level: 20 })])
    expect(toRows(cs).map((r) => (r.kind === 'header' ? `Lv${r.level}:${r.count}` : r.chart.id))).toEqual(['Lv19:1', 1, 'Lv20:2', 2, 3])
  })
})

describe('rowSkills', () => {
  const c = makeChart({ skills: ['run', 'twist', 'bracket', 'gimmick'], coverage: { half: 0, run: 30, twist: 70, bracket: 10, drill: 0 } })
  it('shows gimmick first, then the strongest skills', () => {
    expect(rowSkills(c, [])).toEqual(['gimmick', 'twist'])
  })
  it('puts selected skills first', () => {
    expect(rowSkills(c, ['bracket'])).toEqual(['bracket', 'gimmick'])
  })
})
```

Create `src/apps/pump/lib/titles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Title } from '@/apps/pump/data/types'
import { makeChart } from './__fixtures__/charts'
import { earnedCount, trackViews } from './titles'

const t = (track: Title['track'], lv: number): Title => ({ id: `${track.replace(/ /g, '_')}_${lv}`, track, lv, chart: makeChart() })
const titles = [t('HALF', 2), t('HALF', 1), t('TWIST S', 1)]

describe('trackViews', () => {
  it('lists all 9 tracks in official order, levels ascending, with progress and the next title', () => {
    const views = trackViews(titles, new Set(['HALF_1']))
    expect(views.map((v) => v.track)).toEqual(['TWIST S', 'TWIST D', 'RUN S', 'RUN D', 'DRILL', 'GIMMICK', 'SLOW', 'HALF', 'BRACKET'])
    const half = views.find((v) => v.track === 'HALF')!
    expect(half.titles.map((x) => x.lv)).toEqual([1, 2])
    expect(half.earned).toBe(1)
    expect(half.next?.id).toBe('HALF_2')
  })
  it('has no next title once a track is complete', () => {
    expect(trackViews(titles, new Set(['TWIST_S_1'])).find((v) => v.track === 'TWIST S')!.next).toBeNull()
  })
})

describe('earnedCount', () => {
  it('ignores stored ids that are no longer in the data', () => {
    expect(earnedCount(titles, new Set(['HALF_1', 'OLD_TITLE_9']))).toBe(1)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/apps/pump/lib/order.test.ts src/apps/pump/lib/titles.test.ts`
Expected: FAIL. The modules `./order` and `./titles` can't be found.

- [ ] **Step 3: Implement**

Create `src/apps/pump/lib/order.ts`:

```ts
import type { Chart, Mode, SkillId } from '@/apps/pump/data/types'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
const MODE_ORDER: Record<Mode, number> = { S: 0, D: 1, HDB: 2 }

/** List order: level, then title, then S before D before HD. Sort once; filtering keeps the order. */
export function sortCharts(charts: readonly Chart[]): Chart[] {
  return [...charts].sort(
    (a, b) =>
      a.level - b.level ||
      collator.compare(a.song.title, b.song.title) ||
      MODE_ORDER[a.mode] - MODE_ORDER[b.mode] ||
      a.id - b.id,
  )
}

export type ListRow =
  | { kind: 'header'; key: string; level: number; count: number }
  | { kind: 'chart'; key: string; chart: Chart }

/** Sorted charts → rows with a "Lv 19 · 51" header before each level. */
export function toRows(sorted: readonly Chart[]): ListRow[] {
  const rows: ListRow[] = []
  let header: Extract<ListRow, { kind: 'header' }> | null = null
  for (const c of sorted) {
    if (!header || header.level !== c.level) {
      header = { kind: 'header', key: `lv-${c.level}`, level: c.level, count: 0 }
      rows.push(header)
    }
    header.count++
    rows.push({ kind: 'chart', key: `c-${c.id}`, chart: c })
  }
  return rows
}

/** Up to `max` skill tags for a row: selected skills first, then gimmick, then by coverage. */
export function rowSkills(chart: Chart, selected: readonly SkillId[], max = 2): SkillId[] {
  const strength = (s: SkillId) => (s === 'gimmick' ? 101 : (chart.coverage?.[s] ?? 0))
  return [...chart.skills]
    .sort((a, b) => Number(selected.includes(b)) - Number(selected.includes(a)) || strength(b) - strength(a))
    .slice(0, max)
}
```

Create `src/apps/pump/lib/titles.ts`:

```ts
import { TRACKS, type Title, type Track } from '@/apps/pump/data/types'

export interface TrackView {
  track: Track
  titles: Title[]
  earned: number
  /** first title not yet earned, or null when the track is complete */
  next: Title | null
}

/** The Titles tab: every track in official order, Lv.1 → 10. */
export function trackViews(titles: readonly Title[], earned: ReadonlySet<string>): TrackView[] {
  return TRACKS.map((track) => {
    const list = titles.filter((t) => t.track === track).sort((a, b) => a.lv - b.lv)
    return {
      track,
      titles: list,
      earned: list.filter((t) => earned.has(t.id)).length,
      next: list.find((t) => !earned.has(t.id)) ?? null,
    }
  })
}

/** Earned titles that still exist in the data (stored ids from older data are ignored, not deleted). */
export function earnedCount(titles: readonly Title[], earned: ReadonlySet<string>): number {
  return titles.filter((t) => earned.has(t.id)).length
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/apps/pump/lib/order.test.ts src/apps/pump/lib/titles.test.ts`
Expected: PASS (order 4, titles 3).

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/lib/order.ts src/apps/pump/lib/order.test.ts src/apps/pump/lib/titles.ts src/apps/pump/lib/titles.test.ts
git commit -m "feat(pump): list order, level rows and title progress" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Pump store and backup

**Files:**
- Create: `src/apps/pump/store/usePumpStore.ts`, `src/apps/pump/store/usePumpStore.test.ts`
- Modify: `src/settings/backup.ts`, `src/settings/backup.test.ts`

**Interfaces:**
- Produces:
  - `PUMP_STORAGE_KEY = 'pump-store'`, `MAX_PRESETS = 12`
  - `interface Preset { id: string; name: string; query: string }`
  - `usePumpStore` with:
    - state: `lastFilters: string`, `presets: Preset[]`, `earnedTitles: string[]`
    - actions: `setLastFilters(q)`, `savePreset(name, query): boolean`, `deletePreset(id)`, `toggleTitle(id)`, `setEarnedTitles(ids)`
  - `BackupV2.apps.pump?: { earnedTitles: string[] }`

- [ ] **Step 1: Write the failing tests**

Create `src/apps/pump/store/usePumpStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_PRESETS, PUMP_STORAGE_KEY, usePumpStore } from './usePumpStore'

beforeEach(() => {
  usePumpStore.setState({ lastFilters: '', presets: [], earnedTitles: [] })
})

describe('usePumpStore', () => {
  it('remembers the last filters', () => {
    usePumpStore.getState().setLastFilters('m=D&lv=20-22')
    expect(usePumpStore.getState().lastFilters).toBe('m=D&lv=20-22')
  })
  it('saves up to 12 presets and deletes them', () => {
    const { savePreset } = usePumpStore.getState()
    for (let i = 0; i < MAX_PRESETS; i++) expect(savePreset(` P${i} `, `lv=${i + 1}`)).toBe(true)
    expect(savePreset('one too many', 'lv=20')).toBe(false)
    const { presets } = usePumpStore.getState()
    expect(presets).toHaveLength(MAX_PRESETS)
    expect(presets[0]).toMatchObject({ name: 'P0', query: 'lv=1' })
    usePumpStore.getState().deletePreset(presets[0].id)
    expect(usePumpStore.getState().presets).toHaveLength(MAX_PRESETS - 1)
  })
  it('toggles earned titles', () => {
    const { toggleTitle } = usePumpStore.getState()
    toggleTitle('HALF_1')
    toggleTitle('TWIST_D_7')
    toggleTitle('HALF_1')
    expect(usePumpStore.getState().earnedTitles).toEqual(['TWIST_D_7'])
  })
  it('persists only the three data fields', () => {
    usePumpStore.getState().toggleTitle('RUN_S_1')
    const stored = JSON.parse(localStorage.getItem(PUMP_STORAGE_KEY)!)
    expect(Object.keys(stored.state).sort()).toEqual(['earnedTitles', 'lastFilters', 'presets'])
  })
  it('falls back field by field when stored data is malformed', async () => {
    localStorage.setItem(PUMP_STORAGE_KEY, JSON.stringify({ state: { lastFilters: 5, presets: 'x', earnedTitles: ['A'] }, version: 1 }))
    await usePumpStore.persist.rehydrate()
    expect(usePumpStore.getState()).toMatchObject({ lastFilters: '', presets: [], earnedTitles: ['A'] })
  })
})
```

In `src/settings/backup.test.ts`, replace the two import lines at the top with:

```ts
import { describe, expect, it } from 'vitest'
import { applyBackup, buildBackup, parseBackup } from './backup'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'
```

Then append this block at the end of the file:

```ts
describe('backup and Pump earned titles', () => {
  it('still imports a v2 file made before Pump existed', () => {
    const r = parseBackup(JSON.stringify(v2))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.apps.pump).toBeUndefined()
  })
  it('round-trips earned titles', () => {
    usePumpStore.setState({ earnedTitles: ['HALF_1', 'TWIST_D_7'] })
    const r = parseBackup(JSON.stringify(buildBackup()))
    expect(r.ok).toBe(true)
    usePumpStore.setState({ earnedTitles: [] })
    // No appearance: applyTheme() needs a DOM, and these tests run in node.
    if (r.ok) applyBackup({ ...r.data, appearance: undefined })
    expect(usePumpStore.getState().earnedTitles).toEqual(['HALF_1', 'TWIST_D_7'])
  })
  it('rejects a malformed pump section', () => {
    const bad = { ...v2, apps: { ...v2.apps, pump: { earnedTitles: 'HALF_1' } } }
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/apps/pump/store src/settings/backup.test.ts`
Expected: FAIL. The module `./usePumpStore` can't be found.

- [ ] **Step 3: Implement the store**

Create `src/apps/pump/store/usePumpStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { z } from 'zod'
import { uid } from '@/shared/lib/utils'

/**
 * Pump's saved state: the last filters (restored when Pump opens with none),
 * named presets and earned titles. Live filters themselves live in the URL.
 * Earned titles are included in Settings → backup (settings/backup.ts).
 */

export const PUMP_STORAGE_KEY = 'pump-store'
export const MAX_PRESETS = 12

export interface Preset {
  id: string
  name: string
  /** serializeFilters() output, without the search text */
  query: string
}

const persistedSchema = z.object({
  lastFilters: z.string().catch(''),
  presets: z.array(z.object({ id: z.string(), name: z.string(), query: z.string() })).max(MAX_PRESETS).catch([]),
  earnedTitles: z.array(z.string()).catch([]),
})

interface PumpState extends z.infer<typeof persistedSchema> {
  setLastFilters(query: string): void
  /** false when there are already MAX_PRESETS presets */
  savePreset(name: string, query: string): boolean
  deletePreset(id: string): void
  toggleTitle(id: string): void
  setEarnedTitles(ids: string[]): void
}

export const usePumpStore = create<PumpState>()(
  persist(
    (set, get) => ({
      lastFilters: '',
      presets: [],
      earnedTitles: [],

      setLastFilters(query) {
        if (get().lastFilters !== query) set({ lastFilters: query })
      },

      savePreset(name, query) {
        const { presets } = get()
        if (presets.length >= MAX_PRESETS) return false
        set({ presets: [...presets, { id: uid(), name: name.trim(), query }] })
        return true
      },

      deletePreset(id) {
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }))
      },

      toggleTitle(id) {
        set((s) => ({
          earnedTitles: s.earnedTitles.includes(id) ? s.earnedTitles.filter((t) => t !== id) : [...s.earnedTitles, id],
        }))
      },

      setEarnedTitles(ids) {
        set({ earnedTitles: [...new Set(ids)] })
      },
    }),
    {
      name: PUMP_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ lastFilters: s.lastFilters, presets: s.presets, earnedTitles: s.earnedTitles }),
      // Validate what comes back from localStorage; a bad field falls back to its default.
      merge: (persisted, current) => {
        const r = persistedSchema.safeParse(persisted ?? {})
        return r.success ? { ...current, ...r.data } : current
      },
    },
  ),
)
```

- [ ] **Step 4: Add Pump to the backup**

In `src/settings/backup.ts`, apply these changes:

1. Add the import after the existing `useSplitStore` import:

```ts
import { usePumpStore } from '@/apps/pump/store/usePumpStore'
```

2. Add this schema after `splitDataSchema`:

```ts
const pumpDataSchema = z.object({
  earnedTitles: z.array(z.string()),
})
```

3. Change `backupV2Schema`'s `apps` line to:

```ts
  apps: z.object({ split: splitDataSchema, pump: pumpDataSchema.optional() }),
```

4. Replace `buildBackup` and `applyBackup` with:

```ts
export function buildBackup(): BackupV2 {
  const { knownNames, nights, promotedNames } = useSplitStore.getState()
  const { earnedTitles } = usePumpStore.getState()
  const { palette, mode, custom } = getStoredTheme()
  return {
    version: 2,
    apps: { split: { knownNames, nights, promotedNames }, pump: { earnedTitles } },
    appearance: { palette, mode, custom },
  }
}

export function applyBackup(b: BackupV2): void {
  useSplitStore.setState({
    knownNames: b.apps.split.knownNames,
    nights: b.apps.split.nights,
    promotedNames: b.apps.split.promotedNames,
  })
  if (b.apps.pump) usePumpStore.getState().setEarnedTitles(b.apps.pump.earnedTitles)
  if (b.appearance) applyTheme(b.appearance)
}
```

5. Update the doc comment at the top of the file: replace "currently just the `split` app plus the shared appearance/theme choice" with "the `split` app, Pump's earned titles and the shared appearance/theme choice".

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/apps/pump/store src/settings/backup.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: all PASS; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/apps/pump/store src/settings/backup.ts src/settings/backup.test.ts
git commit -m "feat(pump): persisted presets and earned titles, included in backup" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Shared UI changes

Three small, backward-compatible changes to shared components used by Split and Hub.

**Files:**
- Modify: `src/shared/ui/dialog.tsx`, `src/shared/components/BottomBar.tsx`, `src/shared/components/PageHeader.tsx`

**Interfaces:**
- Produces:
  - `BottomBar` accepts `style?: React.CSSProperties`.
  - `PageHeader` is a `forwardRef<HTMLElement>`, accepts `children` (rendered under the title row) and `subtitle?: React.ReactNode`.
  - The Dialog close button is 44×44, and the sheet animations respect `prefers-reduced-motion`.

- [ ] **Step 1: Dialog — 44 px close target and reduced motion**

In `src/shared/ui/dialog.tsx`:

1. In `DialogOverlay`, append `motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none` to the class string, so it reads:

```tsx
      'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',
```

2. In `DialogContent`, append the same two classes to the end of the content class string (before the closing quote):

```tsx
        'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',
```

3. Replace the close button element with a 44×44 hit area around the same icon:

```tsx
      <DialogPrimitive.Close className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
```

- [ ] **Step 2: BottomBar — optional style**

Replace `src/shared/components/BottomBar.tsx` with:

```tsx
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/utils'

interface BottomBarProps {
  children: React.ReactNode
  className?: string
  /** e.g. a transform that lifts the bar above the on-screen keyboard */
  style?: React.CSSProperties
}

/**
 * Fixed bottom action bar. Rendered into <body> so it stays put while the page
 * slides: a transformed ancestor would otherwise become its containing block.
 */
export function BottomBar({ children, className, style }: BottomBarProps) {
  return createPortal(
    <div
      style={style}
      className={cn('fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur', className)}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 3: PageHeader — ref, children slot, ReactNode subtitle**

Replace `src/shared/components/PageHeader.tsx` with:

```tsx
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  backTo?: string
  actions?: React.ReactNode
  className?: string
  /** rendered under the title row, inside the sticky header (e.g. tabs) */
  children?: React.ReactNode
}

/** Sticky top bar used across pages. */
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, subtitle, backTo, actions, className, children },
  ref,
) {
  return (
    <header ref={ref} className={cn('sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur', className)}>
      <div className="flex items-center gap-2">
        {backTo && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
            <Link to={backTo} aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </header>
  )
})
```

- [ ] **Step 4: Type check, test, and look at an existing dialog**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

Start the dev server (preview `dev` from `.claude/launch.json`, port 5173). At 390×844, open Split → a Nomnom → "Add item". Check that the dialog still slides up and its ✕ sits in the top-right with a larger hit area. Turn on reduced motion in the OS or DevTools (Rendering → Emulate CSS `prefers-reduced-motion: reduce`), then open the dialog again. It should appear without sliding.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/dialog.tsx src/shared/components/BottomBar.tsx src/shared/components/PageHeader.tsx
git commit -m "fix(shared): 44px dialog close, reduced-motion sheets; header ref and slot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 14: Pump hooks

The repo has no DOM tests, so these hooks are thin. Their logic lives in `url-state.ts` (Task 10), which is tested. Read Review Focus item 1 before writing them.

**Files:**
- Create: `src/apps/pump/hooks/useSheetParam.ts`, `src/apps/pump/hooks/usePumpFilters.ts`, `src/apps/pump/hooks/useKeyboardInset.ts`

**Interfaces:**
- Consumes: `parseFilters`, `serializeFilters`, `withFilters`, `hasFilterParams`, `mergeLiveFilters`, `paramsAfterClose` (Task 10); `usePumpStore` (Task 12); `Filters` (Task 9).
- Produces:
  - `type SheetKey = 'f' | 'c' | 'a'`
  - `historyUserState(): { pumpSheet?: SheetKey } | undefined`
  - `useSheetParam(key): { value: string | null; open(v?: string): void; close(): void }`
  - `type PumpTab = 'charts' | 'titles'`
  - `usePumpFilters(): { filters: Filters; setFilters(f: Filters): void; tab: PumpTab; setTab(t: PumpTab): void }`
  - `useKeyboardInset(): number`

- [ ] **Step 1: Write `useSheetParam`**

Create `src/apps/pump/hooks/useSheetParam.ts`:

```ts
import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paramsAfterClose, parseFilters, serializeFilters, SHEET_KEYS } from '@/apps/pump/lib/url-state'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'

export type SheetKey = (typeof SHEET_KEYS)[number]

interface PumpHistoryState {
  pumpSheet?: SheetKey
}

/** React Router keeps navigate()'s `state` under `usr` in window.history.state. */
export function historyUserState(): PumpHistoryState | undefined {
  return (window.history.state as { usr?: PumpHistoryState } | null)?.usr ?? undefined
}

/**
 * A sheet whose open state is a URL param (f = Filters, c = chart id, a = About).
 * Opening pushes one history entry, so the phone's Back closes the sheet.
 *
 * Filters sheet: taps inside it replace the pushed entry (keeping its state
 * marker), so the entry below still holds the filters from before it opened.
 * When it closes, by any route, the live filters (mirrored in lastFilters)
 * are re-applied to the entry Back landed on.
 */
export function useSheetParam(key: SheetKey) {
  const [params, setParams] = useSearchParams()
  const value = params.get(key)

  const open = useCallback(
    (v = '1') => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const k of SHEET_KEYS) next.delete(k)
          next.set(key, v)
          return next
        },
        { state: { pumpSheet: key } satisfies PumpHistoryState },
      )
    },
    [key, setParams],
  )

  const close = useCallback(() => {
    if (historyUserState()?.pumpSheet === key) {
      window.history.back()
    } else {
      // Opened from a link: there is no pushed entry to go back to.
      setParams((prev) => paramsAfterClose(prev, usePumpStore.getState().lastFilters), { replace: true })
    }
  }, [key, setParams])

  const was = useRef<string | null>(null)
  useEffect(() => {
    const before = was.current
    was.current = value
    if (key !== 'f') return
    if (before === null && value !== null) {
      // Opening: make the stored live filters match what is on screen now.
      usePumpStore.getState().setLastFilters(serializeFilters({ ...parseFilters(params), q: '' }))
    } else if (before !== null && value === null) {
      const next = paramsAfterClose(params, usePumpStore.getState().lastFilters)
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }
  }, [key, value, params, setParams])

  return { value, open, close }
}
```

- [ ] **Step 2: Write `usePumpFilters`**

Create `src/apps/pump/hooks/usePumpFilters.ts`:

```ts
import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters } from '@/apps/pump/lib/filters'
import { hasFilterParams, mergeLiveFilters, parseFilters, serializeFilters, withFilters } from '@/apps/pump/lib/url-state'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'
import { historyUserState } from '@/apps/pump/hooks/useSheetParam'

export type PumpTab = 'charts' | 'titles'

/**
 * The URL query is the live filter state. Every change replaces the current
 * history entry (Back never steps through filters) and keeps its state, so a
 * sheet's "pushed by me" marker survives. Changes are mirrored into
 * lastFilters, which is restored when Pump opens with no filters.
 */
export function usePumpFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const tab: PumpTab = params.get('tab') === 'titles' ? 'titles' : 'charts'
  const setLastFilters = usePumpStore((s) => s.setLastFilters)

  const setFilters = useCallback(
    (next: Filters) => {
      setParams((prev) => withFilters(prev, next), { replace: true, state: historyUserState() })
      setLastFilters(serializeFilters({ ...next, q: '' }))
    },
    [setParams, setLastFilters],
  )

  const setTab = useCallback(
    (t: PumpTab) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (t === 'titles') next.set('tab', 'titles')
          else next.delete('tab')
          return next
        },
        { replace: true, state: historyUserState() },
      )
    },
    [setParams],
  )

  // Arriving with no filters in the URL: bring back the last ones (once).
  useEffect(() => {
    if (hasFilterParams(params) || params.has('f') || params.has('c')) return
    const last = usePumpStore.getState().lastFilters
    if (last) setParams((prev) => mergeLiveFilters(prev, last), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { filters, setFilters, tab, setTab }
}
```

- [ ] **Step 3: Write `useKeyboardInset`**

Create `src/apps/pump/hooks/useKeyboardInset.ts`:

```ts
import { useEffect, useState } from 'react'

/**
 * How many CSS px the on-screen keyboard covers at the bottom of the layout
 * viewport. iOS Safari and Chrome Android 108+ resize only the visual
 * viewport, so a fixed bottom bar would sit under the keyboard without this.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}
```

- [ ] **Step 4: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS. The hooks are exercised in Task 20.

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/hooks
git commit -m "feat(pump): URL-backed filter and sheet hooks, keyboard inset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Chart list components

**Files:**
- Create: `src/apps/pump/components/LevelBadge.tsx`, `src/apps/pump/components/SkillTag.tsx`, `src/apps/pump/components/ChartRow.tsx`, `src/apps/pump/components/ChartList.tsx`, `src/apps/pump/components/EmptyResults.tsx`

**Interfaces:**
- Consumes: `Chart`, `Mode`, `SkillId` (Task 8); `MODE_SHORT`, `chartLine2` (Task 8); `ListRow`, `rowSkills` (Task 11); `Filters`, `Removal` (Task 9).
- Produces:
  - `<LevelBadge mode level className? />`
  - `<SkillTag skill active? />`
  - `<ChartRow chart selectedSkills earned onOpen />`, `ROW_HEIGHT = 64`
  - `<ChartList rows selectedSkills earned onOpen />` (memo), `HEADER_HEIGHT = 32`
  - `<EmptyResults suggestions onApply onClear />`

- [ ] **Step 1: Write the badge, tag and row**

Create `src/apps/pump/components/LevelBadge.tsx`:

```tsx
import type { Mode } from '@/apps/pump/data/types'
import { MODE_SHORT } from '@/apps/pump/lib/labels'
import { cn } from '@/shared/lib/utils'

/** "S19" / "D19" / "HD19". Mode shows by letter and shape (outline, fill, dashed), never colour alone. */
export function LevelBadge({ mode, level, className }: { mode: Mode; level: number; className?: string }) {
  return (
    <span
      className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[13px] font-bold tabular-nums',
        mode === 'S' && 'border-2 border-primary text-foreground',
        mode === 'D' && 'bg-primary text-primary-foreground',
        mode === 'HDB' && 'border-2 border-dashed border-primary text-foreground',
        className,
      )}
    >
      {MODE_SHORT[mode]}
      {level}
    </span>
  )
}
```

Create `src/apps/pump/components/SkillTag.tsx`:

```tsx
import type { SkillId } from '@/apps/pump/data/types'
import { cn } from '@/shared/lib/utils'

export function SkillTag({ skill, active }: { skill: SkillId; active?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none',
        active ? 'bg-primary/20 text-foreground' : 'bg-secondary text-secondary-foreground',
      )}
    >
      {skill}
    </span>
  )
}
```

Create `src/apps/pump/components/ChartRow.tsx`:

```tsx
import { Gem, Trophy } from 'lucide-react'
import type { Chart, SkillId } from '@/apps/pump/data/types'
import { chartLine2 } from '@/apps/pump/lib/labels'
import { rowSkills } from '@/apps/pump/lib/order'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { SkillTag } from '@/apps/pump/components/SkillTag'
import { cn } from '@/shared/lib/utils'

export const ROW_HEIGHT = 64

interface ChartRowProps {
  chart: Chart
  selectedSkills: readonly SkillId[]
  /** the chart unlocks a title the user has ticked */
  earned: boolean
  onOpen(id: number): void
}

/** One chart: the whole 64 px row opens the chart sheet. */
export function ChartRow({ chart, selectedSkills, earned, onOpen }: ChartRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chart.id)}
      className="flex h-16 w-full items-center gap-3 border-b border-border text-left active:bg-secondary/60"
    >
      <LevelBadge mode={chart.mode} level={chart.level} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {chart.song.title}
          {chart.song.titleKo && <span className="ml-1.5 font-normal text-muted-foreground">{chart.song.titleKo}</span>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{chartLine2(chart)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {rowSkills(chart, selectedSkills).map((s) => (
          <SkillTag key={s} skill={s} active={selectedSkills.includes(s)} />
        ))}
        {chart.titleIds.length > 0 && (
          <Trophy className={cn('h-4 w-4', earned ? 'text-primary' : 'text-muted-foreground')} aria-label={earned ? 'Title chart, earned' : 'Title chart'} />
        )}
        {chart.premium && <Gem className="h-4 w-4 text-muted-foreground" aria-label="Premium mode only" />}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Write the virtualised list**

Create `src/apps/pump/components/ChartList.tsx`:

```tsx
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual'
import type { SkillId } from '@/apps/pump/data/types'
import type { ListRow } from '@/apps/pump/lib/order'
import { ChartRow, ROW_HEIGHT } from '@/apps/pump/components/ChartRow'

export const HEADER_HEIGHT = 32

interface ChartListProps {
  rows: ListRow[]
  selectedSkills: readonly SkillId[]
  earned: ReadonlySet<string>
  onOpen(id: number): void
}

/**
 * Window-scrolled virtual list (~60 rows in the DOM). The level header of the
 * section in view sticks under the page header (--pump-head, set by PumpHeader),
 * using TanStack Virtual's sticky pattern: the active header is always rendered
 * and positioned sticky; everything else is absolute.
 */
export const ChartList = memo(function ChartList({ rows, selectedSkills, earned, onOpen }: ChartListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
  }, [rows.length])

  const stickyIndexes = useMemo(() => rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])), [rows])
  const activeSticky = useRef(0)
  const rangeExtractor = useCallback(
    (range: Range) => {
      activeSticky.current = [...stickyIndexes].reverse().find((i) => range.startIndex >= i) ?? 0
      const next = new Set([activeSticky.current, ...defaultRangeExtractor(range)])
      return [...next].sort((a, b) => a - b)
    },
    [stickyIndexes],
  )

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => (rows[i].kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 8,
    scrollMargin,
    rangeExtractor,
  })

  return (
    <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => {
        const row = rows[item.index]
        const sticky = activeSticky.current === item.index
        const style: React.CSSProperties = sticky
          ? { position: 'sticky', top: 'var(--pump-head, 0px)', zIndex: 1 }
          : { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }
        return (
          <div key={row.key} style={{ ...style, height: item.size }}>
            {row.kind === 'header' ? (
              <div className="flex h-8 items-center bg-background/95 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                Lv {row.level} · {row.count}
              </div>
            ) : (
              <ChartRow
                chart={row.chart}
                selectedSkills={selectedSkills}
                earned={row.chart.titleIds.some((id) => earned.has(id))}
                onOpen={onOpen}
              />
            )}
          </div>
        )
      })}
    </div>
  )
})
```

- [ ] **Step 3: Write the empty state**

Create `src/apps/pump/components/EmptyResults.tsx`:

```tsx
import type { Filters, Removal } from '@/apps/pump/lib/filters'
import { Button } from '@/shared/ui/button'

/** No charts match: offer the removals that would bring charts back, with counts. */
export function EmptyResults({ suggestions, onApply, onClear }: { suggestions: Removal[]; onApply(f: Filters): void; onClear(): void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
      <p className="font-medium">No charts match.</p>
      {suggestions.map((s) => (
        <Button key={s.label} variant="outline" className="justify-between" onClick={() => onApply(s.next)}>
          <span className="truncate">Remove {s.label}</span>
          <span className="tabular-nums text-muted-foreground">→ {s.count.toLocaleString()} charts</span>
        </Button>
      ))}
      <Button variant="ghost" onClick={onClear}>
        Clear all
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/components/LevelBadge.tsx src/apps/pump/components/SkillTag.tsx src/apps/pump/components/ChartRow.tsx src/apps/pump/components/ChartList.tsx src/apps/pump/components/EmptyResults.tsx
git commit -m "feat(pump): virtualised chart list with sticky level headers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Bottom dock

**Files:**
- Create: `src/apps/pump/components/Chip.tsx`, `src/apps/pump/components/FilterDock.tsx`

**Interfaces:**
- Consumes: `Filters`, `defaultFilters`, `toggleValue` (Task 9); `MODE_SHORT`, `levelLabel` (Task 8); `useKeyboardInset` (Task 14); `BottomBar` with `style` (Task 13).
- Produces:
  - `<Chip pressed? active? label? onClick>…</Chip>`
  - `<FilterDock filters activeCount onChange onOpenFilters />`, where `onOpenFilters(focus?: 'level')`

- [ ] **Step 1: Write the chip**

Create `src/apps/pump/components/Chip.tsx`:

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ChipProps {
  /** toggle state; when set the chip is a toggle button with a checkmark */
  pressed?: boolean
  /** filled look without toggle semantics (e.g. a removable skill) */
  active?: boolean
  /** accessible name when the visible text isn't enough */
  label?: string
  onClick(): void
  children: React.ReactNode
}

/** 36 px pill whose hit area extends to 44 px. */
export function Chip({ pressed, active, label, onClick, children }: ChipProps) {
  const on = pressed ?? active ?? false
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
      )}
    >
      {pressed && <Check className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Write the dock**

Create `src/apps/pump/components/FilterDock.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Mode } from '@/apps/pump/data/types'
import { defaultFilters, toggleValue, type Filters } from '@/apps/pump/lib/filters'
import { levelLabel, MODE_SHORT } from '@/apps/pump/lib/labels'
import { useKeyboardInset } from '@/apps/pump/hooks/useKeyboardInset'
import { Chip } from '@/apps/pump/components/Chip'
import { BottomBar } from '@/shared/components/BottomBar'
import { Button } from '@/shared/ui/button'

interface FilterDockProps {
  filters: Filters
  activeCount: number
  onChange(f: Filters): void
  onOpenFilters(focus?: 'level'): void
}

/** Thumb-zone bar: promoted chips (mode, level, selected skills, Clear), search, Filters (n). */
export function FilterDock({ filters, activeCount, onChange, onOpenFilters }: FilterDockProps) {
  const inset = useKeyboardInset()
  // Local text so typing never waits on the URL; external changes (Clear, presets) sync back in.
  const [text, setText] = useState(filters.q)
  useEffect(() => setText(filters.q), [filters.q])
  const modes: Mode[] = filters.steamLink ? ['S', 'D', 'HDB'] : ['S', 'D']
  const anyActive = activeCount > 0 || filters.q.trim() !== ''

  return (
    <BottomBar style={inset > 0 ? { transform: `translateY(-${inset}px)` } : undefined}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        {modes.map((m) => (
          <Chip key={m} pressed={filters.modes.includes(m)} onClick={() => onChange({ ...filters, modes: toggleValue(filters.modes, m) })}>
            {MODE_SHORT[m]}
          </Chip>
        ))}
        <Chip active={filters.level !== null} onClick={() => onOpenFilters('level')}>
          {filters.level ? levelLabel(filters.level) : 'Any level'}
        </Chip>
        {filters.skills.map((s) => (
          <Chip key={s} active label={`Remove ${s}`} onClick={() => onChange({ ...filters, skills: filters.skills.filter((x) => x !== s) })}>
            {s}
            <X className="h-3.5 w-3.5" aria-hidden />
          </Chip>
        ))}
        {anyActive && <Chip onClick={() => onChange({ ...defaultFilters })}>Clear</Chip>}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search title or artist</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search title, artist"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onChange({ ...filters, q: e.target.value })
            }}
            className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button variant="outline" className="shrink-0" onClick={() => onOpenFilters()}>
          <SlidersHorizontal aria-hidden />
          Filters
          {activeCount > 0 && <span className="tabular-nums">{activeCount}</span>}
        </Button>
      </div>
    </BottomBar>
  )
}
```

- [ ] **Step 3: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/pump/components/Chip.tsx src/apps/pump/components/FilterDock.tsx
git commit -m "feat(pump): bottom dock with promoted chips and search" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Filters sheet

**Files:**
- Create: `src/apps/pump/components/SheetGrabber.tsx`, `src/apps/pump/components/FacetGroup.tsx`, `src/apps/pump/components/LevelGrid.tsx`, `src/apps/pump/components/AnyAllSwitch.tsx`, `src/apps/pump/components/PresetBar.tsx`, `src/apps/pump/components/FilterSheet.tsx`

**Interfaces:**
- Consumes: Dialog (Task 13); `Filters`, `defaultFilters`, `toggleValue`, `withSteamLink`, `FacetCounts` (Task 9); `nextLevelRange` (Task 10); `levelLabel`, `MODE_LABEL`, `SONG_TYPE_LABEL` (Task 8); `Preset` (Task 12).
- Produces:
  - `<SheetGrabber onDismiss />`
  - `<FacetGroup id label options selected onToggle scroll? children? />`
  - `<LevelGrid levels value onChange />`
  - `<AnyAllSwitch all onChange />`
  - `<PresetBar presets activeQuery defaultName full onApply onSave onDelete />`
  - `<FilterSheet open focus onClose filters onChange counts resultCount levels presets activeQuery defaultPresetName presetsFull onApplyPreset onSavePreset onDeletePreset />`

- [ ] **Step 1: Write the small building blocks**

Create `src/apps/pump/components/SheetGrabber.tsx`:

```tsx
import { useRef } from 'react'

/** Grab handle: a downward swipe of 80 px or more dismisses the sheet. Back and ✕ do too. */
export function SheetGrabber({ onDismiss }: { onDismiss(): void }) {
  const startY = useRef<number | null>(null)
  return (
    <div
      aria-hidden
      className="-mx-5 -mt-5 flex h-7 shrink-0 touch-none items-center justify-center"
      onPointerDown={(e) => {
        startY.current = e.clientY
      }}
      onPointerUp={(e) => {
        if (startY.current !== null && e.clientY - startY.current >= 80) onDismiss()
        startY.current = null
      }}
      onPointerCancel={() => {
        startY.current = null
      }}
    >
      <span className="h-1.5 w-10 rounded-full bg-border" />
    </div>
  )
}
```

Create `src/apps/pump/components/FacetGroup.tsx`:

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface FacetOption<V extends string> {
  value: V
  label: string
  count?: number
}

interface FacetGroupProps<V extends string> {
  id: string
  label: string
  options: FacetOption<V>[]
  selected: readonly V[]
  onToggle(value: V): void
  /** one sideways-scrolling row instead of wrapping */
  scroll?: boolean
  /** extra control on the label row (e.g. the any/all switch) */
  children?: React.ReactNode
}

/** A labelled group of toggle chips (`aria-pressed`, checkmark when on); the label never changes with state. */
export function FacetGroup<V extends string>({ id, label, options, selected, onToggle, scroll, children }: FacetGroupProps<V>) {
  return (
    <section id={`facet-${id}`} role="group" aria-labelledby={`facet-${id}-label`} className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id={`facet-${id}-label`} className="text-sm font-semibold">
          {label}
        </h3>
        {children}
      </div>
      <div className={cn('flex gap-2', scroll ? '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]' : 'flex-wrap')}>
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
                o.count === 0 && !on && 'opacity-60',
              )}
            >
              {on && <Check className="h-4 w-4" aria-hidden />}
              {o.label}
              {o.count !== undefined && (
                <span className={cn('text-xs tabular-nums', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{o.count.toLocaleString()}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

Create `src/apps/pump/components/LevelGrid.tsx`:

```tsx
import { useState } from 'react'
import { nextLevelRange, type LevelRange } from '@/apps/pump/lib/level-range'
import { levelLabel } from '@/apps/pump/lib/labels'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

/** Every level in the data, 7 per row, 44 px cells. Tap a level, then another for a range. */
export function LevelGrid({ levels, value, onChange }: { levels: number[]; value: LevelRange; onChange(v: LevelRange): void }) {
  const [anchor, setAnchor] = useState<number | null>(null)
  return (
    <section id="facet-level" role="group" aria-labelledby="facet-level-label" className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id="facet-level-label" className="text-sm font-semibold">
          Level · {value ? levelLabel(value) : 'any'}
        </h3>
        {value && (
          <Button
            variant="ghost"
            onClick={() => {
              setAnchor(null)
              onChange(null)
            }}
          >
            Any level
          </Button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {levels.map((n) => {
          const on = value !== null && n >= value[0] && n <= value[1]
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = nextLevelRange(value, anchor, n)
                setAnchor(next.anchor)
                onChange(next.value)
              }}
              className={cn(
                'h-11 rounded-lg border text-sm font-semibold tabular-nums',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

Create `src/apps/pump/components/AnyAllSwitch.tsx`:

```tsx
import { cn } from '@/shared/lib/utils'

/** Skills combine with "any of" (OR) or "all of" (AND). */
export function AnyAllSwitch({ all, onChange }: { all: boolean; onChange(all: boolean): void }) {
  return (
    <div role="group" aria-label="Combine skills" className="inline-flex rounded-lg border border-border p-0.5">
      {[false, true].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={all === v}
          onClick={() => onChange(v)}
          className={cn('h-10 rounded-md px-3 text-sm', all === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
        >
          {v ? 'all of' : 'any of'}
        </button>
      ))}
    </div>
  )
}
```

Create `src/apps/pump/components/PresetBar.tsx`:

```tsx
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Preset } from '@/apps/pump/store/usePumpStore'
import { Chip } from '@/apps/pump/components/Chip'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface PresetBarProps {
  presets: Preset[]
  /** serializeFilters() of what is applied now (no search text) */
  activeQuery: string
  defaultName: string
  full: boolean
  onApply(p: Preset): void
  onSave(name: string): void
  onDelete(id: string): void
}

/** Saved filters: tap to apply; "Save current" names the current filters; Edit shows ✕ to delete. */
export function PresetBar({ presets, activeQuery, defaultName, full, onApply, onSave, onDelete }: PresetBarProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState<string | null>(null)

  if (name !== null) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(name.trim() || defaultName)
          setName(null)
        }}
      >
        <Input autoFocus aria-label="Preset name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={() => setName(null)}>
          Cancel
        </Button>
      </form>
    )
  }

  return (
    <section aria-label="Presets" className="space-y-1">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
        {presets.map((p) =>
          editing ? (
            <Chip key={p.id} active label={`Delete preset ${p.name}`} onClick={() => onDelete(p.id)}>
              {p.name}
              <X className="h-3.5 w-3.5" aria-hidden />
            </Chip>
          ) : (
            <Chip key={p.id} pressed={p.query === activeQuery} onClick={() => onApply(p)}>
              {p.name}
            </Chip>
          ),
        )}
        {!editing && (
          <Chip onClick={() => setName(full ? null : defaultName)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Save current
          </Chip>
        )}
        {presets.length > 0 && <Chip onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</Chip>}
      </div>
      {full && !editing && <p className="text-xs text-muted-foreground">12 presets is the limit. Edit to delete one first.</p>}
    </section>
  )
}
```

- [ ] **Step 2: Write the sheet**

Create `src/apps/pump/components/FilterSheet.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { SERIES, SKILLS, SONG_TYPES, type Mode } from '@/apps/pump/data/types'
import { defaultFilters, toggleValue, withSteamLink, type FacetCounts, type Filters } from '@/apps/pump/lib/filters'
import { MODE_LABEL, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'
import type { Preset } from '@/apps/pump/store/usePumpStore'
import { AnyAllSwitch } from '@/apps/pump/components/AnyAllSwitch'
import { FacetGroup } from '@/apps/pump/components/FacetGroup'
import { LevelGrid } from '@/apps/pump/components/LevelGrid'
import { PresetBar } from '@/apps/pump/components/PresetBar'
import { SheetGrabber } from '@/apps/pump/components/SheetGrabber'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

type Flag = 'tc' | 'sl' | 'np'

interface FilterSheetProps {
  open: boolean
  /** the sheet param: '1', or 'level' to scroll to the level grid */
  focus: string | null
  onClose(): void
  filters: Filters
  onChange(f: Filters): void
  counts: FacetCounts
  resultCount: number
  levels: number[]
  presets: Preset[]
  activeQuery: string
  defaultPresetName: string
  presetsFull: boolean
  onApplyPreset(p: Preset): void
  onSavePreset(name: string): void
  onDeletePreset(id: string): void
}

/** Every facet, applied live; the footer button shows the live count and closes. */
export function FilterSheet(props: FilterSheetProps) {
  const { open, focus, onClose, filters: f, onChange, counts } = props
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (open && focus === 'level') {
      requestAnimationFrame(() => document.getElementById('facet-level')?.scrollIntoView({ block: 'start' }))
    }
  }, [open, focus])

  const modes: Mode[] = f.steamLink ? ['S', 'D', 'HDB'] : ['S', 'D']
  const flags: Flag[] = [...(f.titleOnly ? ['tc' as const] : []), ...(f.steamLink ? ['sl' as const] : []), ...(f.hidePremium ? ['np' as const] : [])]
  const toggleFlag = (flag: Flag) =>
    onChange(flag === 'sl' ? withSteamLink(f, !f.steamLink) : flag === 'tc' ? { ...f, titleOnly: !f.titleOnly } : { ...f, hidePremium: !f.hidePremium })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="gap-5 pb-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <SheetGrabber onDismiss={onClose} />
        <div className="-mt-3 flex items-center gap-2 pr-10">
          <DialogTitle ref={titleRef} tabIndex={-1} className="flex-1 outline-none">
            Filters
          </DialogTitle>
          <Button variant="ghost" onClick={() => onChange({ ...defaultFilters, q: f.q })}>
            Reset
          </Button>
        </div>

        <PresetBar
          presets={props.presets}
          activeQuery={props.activeQuery}
          defaultName={props.defaultPresetName}
          full={props.presetsFull}
          onApply={props.onApplyPreset}
          onSave={props.onSavePreset}
          onDelete={props.onDeletePreset}
        />

        <FacetGroup
          id="mode"
          label="Mode · any of"
          options={modes.map((m) => ({ value: m, label: MODE_LABEL[m], count: counts.modes[m] }))}
          selected={f.modes}
          onToggle={(m) => onChange({ ...f, modes: toggleValue(f.modes, m) })}
        />

        <LevelGrid levels={props.levels} value={f.level} onChange={(level) => onChange({ ...f, level })} />

        <FacetGroup
          id="skills"
          label={`Skills · ${f.skillsAll ? 'all of' : 'any of'}`}
          options={SKILLS.map((s) => ({ value: s, label: s, count: counts.skills[s] }))}
          selected={f.skills}
          onToggle={(s) => onChange({ ...f, skills: toggleValue(f.skills, s) })}
        >
          <AnyAllSwitch all={f.skillsAll} onChange={(skillsAll) => onChange({ ...f, skillsAll })} />
        </FacetGroup>

        <FacetGroup
          id="type"
          label="Song type · any of"
          options={SONG_TYPES.map((t) => ({ value: t, label: SONG_TYPE_LABEL[t], count: counts.types[t] }))}
          selected={f.types}
          onToggle={(t) => onChange({ ...f, types: toggleValue(f.types, t) })}
        />

        <FacetGroup
          id="version"
          label="Version · any of"
          scroll
          options={SERIES.map((s) => ({ value: s, label: s, count: counts.series[s] }))}
          selected={f.series}
          onToggle={(s) => onChange({ ...f, series: toggleValue(f.series, s) })}
        />

        <FacetGroup
          id="more"
          label="More"
          options={[
            { value: 'tc', label: 'Title charts only' },
            { value: 'sl', label: 'Show Steam Link charts' },
            { value: 'np', label: 'Hide Premium-mode charts' },
          ]}
          selected={flags}
          onToggle={toggleFlag}
        />

        <div className="sticky bottom-0 -mx-5 border-t border-border bg-card px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <Button className="w-full" onClick={onClose}>
            Show {props.resultCount.toLocaleString()} charts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/pump/components/SheetGrabber.tsx src/apps/pump/components/FacetGroup.tsx src/apps/pump/components/LevelGrid.tsx src/apps/pump/components/AnyAllSwitch.tsx src/apps/pump/components/PresetBar.tsx src/apps/pump/components/FilterSheet.tsx
git commit -m "feat(pump): filters sheet with level grid, any/all skills and presets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Chart sheet, title tick and About dialog

**Files:**
- Create: `src/apps/pump/components/EarnedToggle.tsx`, `src/apps/pump/components/ChartSheet.tsx`, `src/apps/pump/components/AboutDialog.tsx`

**Interfaces:**
- Consumes: Dialog (Task 13); `Chart`, `Title`, `CatalogMeta`, `COMPUTED_SKILLS` (Task 8); `chartFacts`, `titleName`, `MODE_SHORT` (Task 8); `LevelBadge` (Task 15); `SheetGrabber` (Task 17).
- Produces:
  - `<EarnedToggle title earned onToggle />`, a 44×44 toggle button.
  - `<ChartSheet chart titles earned onToggleTitle onClose />`
  - `<AboutDialog open meta onClose />`

- [ ] **Step 1: Write the tick**

Create `src/apps/pump/components/EarnedToggle.tsx`:

```tsx
import { Check } from 'lucide-react'
import type { Title } from '@/apps/pump/data/types'
import { titleName } from '@/apps/pump/lib/labels'
import { cn } from '@/shared/lib/utils'

/** 44×44 tick for "I have earned this title". */
export function EarnedToggle({ title, earned, onToggle }: { title: Title; earned: boolean; onToggle(id: string): void }) {
  return (
    <button
      type="button"
      aria-pressed={earned}
      aria-label={`Earned ${titleName(title)}`}
      onClick={() => onToggle(title.id)}
      className="grid h-11 w-11 shrink-0 place-items-center"
    >
      <span
        className={cn(
          'grid h-6 w-6 place-items-center rounded-md border-2',
          earned ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60',
        )}
      >
        {earned && <Check className="h-4 w-4" aria-hidden />}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Write the chart sheet**

Create `src/apps/pump/components/ChartSheet.tsx`:

```tsx
import { useRef } from 'react'
import { Trophy } from 'lucide-react'
import { COMPUTED_SKILLS, type Chart, type ComputedSkill, type Title } from '@/apps/pump/data/types'
import { chartFacts, MODE_SHORT, titleName } from '@/apps/pump/lib/labels'
import { EarnedToggle } from '@/apps/pump/components/EarnedToggle'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { SheetGrabber } from '@/apps/pump/components/SheetGrabber'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

function SkillBar({ skill, pct, tagged }: { skill: ComputedSkill; pct: number; tagged: boolean }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm" aria-label={`${skill} ${pct}%${tagged ? ', tagged' : ''}`}>
      <span className={cn(tagged ? 'font-semibold' : 'text-muted-foreground')}>{skill}</span>
      <span className="h-2 rounded-full bg-secondary">
        <span className={cn('block h-2 rounded-full', tagged ? 'bg-primary' : 'bg-muted-foreground/50')} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

interface ChartSheetProps {
  chart: Chart | null
  titles: Title[]
  earned: ReadonlySet<string>
  onToggleTitle(id: string): void
  onClose(): void
}

/** One chart's details, over the list (which keeps its scroll position). */
export function ChartSheet({ chart, titles, earned, onToggleTitle, onClose }: ChartSheetProps) {
  // Keep the last chart on screen while the sheet animates closed.
  const last = useRef<Chart | null>(null)
  if (chart) last.current = chart
  const c = chart ?? last.current
  const titleRef = useRef<HTMLHeadingElement>(null)
  const unlocks = c ? titles.filter((t) => c.titleIds.includes(t.id)) : []

  return (
    <Dialog open={chart !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <SheetGrabber onDismiss={onClose} />
        {c && (
          <>
            <div className="-mt-3 flex items-center gap-3 pr-10">
              <LevelBadge mode={c.mode} level={c.level} />
              <div className="min-w-0">
                <DialogTitle ref={titleRef} tabIndex={-1} className="leading-snug outline-none">
                  {c.song.title}
                </DialogTitle>
                {c.song.titleKo && <p className="text-sm text-muted-foreground">{c.song.titleKo}</p>}
                <p className="text-sm text-muted-foreground">{c.song.artist}</p>
              </div>
            </div>
            <p className="text-sm">{chartFacts(c)}</p>
            {c.prevLevel !== undefined && (
              <p className="text-sm text-muted-foreground">
                Was {MODE_SHORT[c.mode]}
                {c.prevLevel} in PHOENIX
              </p>
            )}
            {(c.premium || c.steamLink) && (
              <p className="text-sm text-muted-foreground">
                {[c.premium && 'Premium mode only', c.steamLink && 'Needs Steam Link'].filter(Boolean).join(' · ')}
              </p>
            )}
            {c.coverage ? (
              <section aria-label="How much of this chart is each skill" className="space-y-1.5">
                {COMPUTED_SKILLS.map((s) => (
                  <SkillBar key={s} skill={s} pct={c.coverage![s]} tagged={c.skills.includes(s)} />
                ))}
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">No skill data for this chart{c.steamLink ? ' (Steam Link)' : ''}.</p>
            )}
            {c.gimmickFrom.length > 0 && (
              <p className="text-sm">
                <span className="font-semibold">Gimmick</span> · {c.gimmickFrom.join(' · ')}
              </p>
            )}
            {c.badges.length > 0 && <p className="text-xs text-muted-foreground">piucenter: {c.badges.join(', ')}</p>}
            {unlocks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 border-t border-border pt-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden />
                <span className="flex-1 text-sm">{titleName(t)} · needs SSS</span>
                <EarnedToggle title={t} earned={earned.has(t.id)} onToggle={onToggleTitle} />
              </div>
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Write the About dialog**

Create `src/apps/pump/components/AboutDialog.tsx`:

```tsx
import type { CatalogMeta } from '@/apps/pump/data/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

const shortRef = (ref: string) => (/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref)
const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Data version, sources and credits (spec §Licensing). */
export function AboutDialog({ open, meta, onClose }: { open: boolean; meta: CatalogMeta; onClose(): void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>About this data</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          {meta.game} v{meta.patch} · built {formatDay(meta.builtAt)}
        </p>
        <ul className="space-y-1 text-sm">
          {meta.sources.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                {s.name}
              </a>{' '}
              <span className="text-muted-foreground">· {shortRef(s.ref)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Chart data: Pump Out (Haru-kaze, AnyhowStep) and pumpout-db-updates (aaaaaa2493). Skill tags are computed from
          piucenter.com&apos;s step analysis (maxwshen), via PIU Scores (DrMurloc). Gimmick tags come from official title lists.
        </p>
        <p className="text-sm text-muted-foreground">Not affiliated with Andamiro.</p>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/pump/components/EarnedToggle.tsx src/apps/pump/components/ChartSheet.tsx src/apps/pump/components/AboutDialog.tsx
git commit -m "feat(pump): chart sheet with skill bars and title tick; about dialog" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Titles tab

**Files:**
- Create: `src/apps/pump/components/TitleTrack.tsx`, `src/apps/pump/components/TitlesTab.tsx`

**Interfaces:**
- Consumes: `TrackView` (Task 11); `EarnedToggle` (Task 18); `LevelBadge` (Task 15).
- Produces:
  - `<TitleTrack view earned onToggle onOpen />`
  - `<TitlesTab views earned onToggle onOpen />`

- [ ] **Step 1: Write the components**

Create `src/apps/pump/components/TitleTrack.tsx`:

```tsx
import type { TrackView } from '@/apps/pump/lib/titles'
import { EarnedToggle } from '@/apps/pump/components/EarnedToggle'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'

interface TitleTrackProps {
  view: TrackView
  earned: ReadonlySet<string>
  onToggle(id: string): void
  onOpen(chartId: number): void
}

/** One skill-title track: Lv.1 → 10, a tick per title, "next" on the first unearned one. */
export function TitleTrack({ view, earned, onToggle, onOpen }: TitleTrackProps) {
  const headingId = `track-${view.track.replace(/ /g, '-')}`
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
        <span>{view.track}</span>
        <span className="tabular-nums text-muted-foreground">
          {view.earned} / {view.titles.length}
        </span>
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {view.titles.map((t) => (
          <li key={t.id} className="flex items-center pr-3">
            <EarnedToggle title={t} earned={earned.has(t.id)} onToggle={onToggle} />
            <button type="button" onClick={() => onOpen(t.chart.id)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
              <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">Lv.{t.lv}</span>
              <LevelBadge mode={t.chart.mode} level={t.chart.level} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.chart.song.title}</span>
              {view.next?.id === t.id && (
                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-foreground">next</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Create `src/apps/pump/components/TitlesTab.tsx`:

```tsx
import type { TrackView } from '@/apps/pump/lib/titles'
import { TitleTrack } from '@/apps/pump/components/TitleTrack'

interface TitlesTabProps {
  views: TrackView[]
  earned: ReadonlySet<string>
  onToggle(id: string): void
  onOpen(chartId: number): void
}

/** PHOENIX 2's nine skill-title tracks with your progress. */
export function TitlesTab({ views, earned, onToggle, onOpen }: TitlesTabProps) {
  return (
    <div className="space-y-6">
      {views.map((v) => (
        <TitleTrack key={v.track} view={v} earned={earned} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type check and test**

Run: `npx tsc --noEmit` then `npm test`
Expected: clean; all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/apps/pump/components/TitleTrack.tsx src/apps/pump/components/TitlesTab.tsx
git commit -m "feat(pump): titles tab with per-track progress" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Wire Pump into Nook

**Files:**
- Create: `src/apps/pump/components/PumpHeader.tsx`, `src/apps/pump/components/PumpSkeleton.tsx`, `src/apps/pump/pages/PumpHome.tsx`, `src/apps/pump/routes.tsx`
- Modify: `src/App.tsx`, `src/launcher/registry.ts`

**Interfaces:**
- Consumes: everything from Tasks 8–19.
- Produces: the `/pump` route, the launcher tile, and `PumpHome` (default export).

- [ ] **Step 1: Write the header and the loading skeleton**

Create `src/apps/pump/components/PumpHeader.tsx`:

```tsx
import { useLayoutEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import type { PumpTab } from '@/apps/pump/hooks/usePumpFilters'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface PumpHeaderProps {
  tab: PumpTab
  onTab(t: PumpTab): void
  subtitle: React.ReactNode
  onInfo(): void
}

/** Sticky header with Charts | Titles tabs. Publishes its height as --pump-head for the sticky level headers. */
export function PumpHeader({ tab, onTab, subtitle, onInfo }: PumpHeaderProps) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--pump-head', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <PageHeader
      ref={ref}
      title="Pump"
      subtitle={subtitle}
      backTo="/"
      actions={
        <Button variant="ghost" size="icon" aria-label="About this data" onClick={onInfo}>
          <Info className="h-5 w-5" />
        </Button>
      }
    >
      <div role="group" aria-label="View" className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5">
        {(['charts', 'titles'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => onTab(t)}
            className={cn('h-10 rounded-md text-sm font-semibold transition-colors', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            {t === 'charts' ? 'Charts' : 'Titles'}
          </button>
        ))}
      </div>
    </PageHeader>
  )
}
```

Create `src/apps/pump/components/PumpSkeleton.tsx`:

```tsx
/** Shown while the Pump chunk (page + chart data) loads. */
export function PumpSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4" aria-busy="true" aria-label="Loading charts">
      <div className="mb-4 h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="mb-2 h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write the page**

Create `src/apps/pump/pages/PumpHome.tsx`:

```tsx
import { useCallback, useDeferredValue, useMemo } from 'react'
import { getCatalog } from '@/apps/pump/data/catalog'
import { applyFilters, defaultFilters, facetCounts, removalSuggestions } from '@/apps/pump/lib/filters'
import { sortCharts, toRows } from '@/apps/pump/lib/order'
import { activeFacetCount, summarize } from '@/apps/pump/lib/summary'
import { earnedCount, trackViews } from '@/apps/pump/lib/titles'
import { parseFilters, serializeFilters } from '@/apps/pump/lib/url-state'
import { MAX_PRESETS, usePumpStore } from '@/apps/pump/store/usePumpStore'
import { usePumpFilters } from '@/apps/pump/hooks/usePumpFilters'
import { useSheetParam } from '@/apps/pump/hooks/useSheetParam'
import { AboutDialog } from '@/apps/pump/components/AboutDialog'
import { ChartList } from '@/apps/pump/components/ChartList'
import { ChartSheet } from '@/apps/pump/components/ChartSheet'
import { EmptyResults } from '@/apps/pump/components/EmptyResults'
import { FilterDock } from '@/apps/pump/components/FilterDock'
import { FilterSheet } from '@/apps/pump/components/FilterSheet'
import { PumpHeader } from '@/apps/pump/components/PumpHeader'
import { TitlesTab } from '@/apps/pump/components/TitlesTab'

/** Pump: every PHOENIX 2 chart, filtered one-handed; plus the skill-title tracks. */
export default function PumpHome() {
  const catalog = getCatalog()
  const sorted = useMemo(() => sortCharts(catalog.charts), [catalog])
  const { filters, setFilters, tab, setTab } = usePumpFilters()
  const filterSheet = useSheetParam('f')
  const chartSheet = useSheetParam('c')
  const about = useSheetParam('a')

  const earnedList = usePumpStore((s) => s.earnedTitles)
  const earned = useMemo(() => new Set(earnedList), [earnedList])
  const presets = usePumpStore((s) => s.presets)
  const { toggleTitle, savePreset, deletePreset } = usePumpStore.getState()

  // The list follows a deferred copy, so typing and chip taps stay responsive.
  const deferred = useDeferredValue(filters)
  const results = useMemo(() => applyFilters(sorted, deferred), [sorted, deferred])
  const rows = useMemo(() => toRows(results), [results])
  const songCount = useMemo(() => new Set(results.map((c) => c.song)).size, [results])
  const suggestions = useMemo(() => (results.length === 0 ? removalSuggestions(sorted, deferred) : []), [results, sorted, deferred])

  // The sheet shows live numbers for the current (not deferred) filters.
  const counts = useMemo(() => facetCounts(sorted, filters), [sorted, filters])
  const sheetCount = useMemo(() => applyFilters(sorted, filters).length, [sorted, filters])
  const liveQuery = serializeFilters({ ...filters, q: '' })

  const views = useMemo(() => trackViews(catalog.titles, earned), [catalog, earned])
  const openChart = chartSheet.open
  const onOpen = useCallback((id: number) => openChart(String(id)), [openChart])
  const chart = chartSheet.value ? (catalog.byId.get(Number(chartSheet.value)) ?? null) : null

  const subtitle =
    tab === 'charts' ? (
      <span role="status">
        {results.length.toLocaleString()} charts · {songCount.toLocaleString()} songs
      </span>
    ) : (
      `${earnedCount(catalog.titles, earned)} / ${catalog.titles.length} earned`
    )

  return (
    <div className="mx-auto max-w-lg px-4 pb-44">
      <PumpHeader tab={tab} onTab={setTab} subtitle={subtitle} onInfo={() => about.open()} />

      {tab === 'charts' ? (
        <>
          {results.length > 0 ? (
            <ChartList rows={rows} selectedSkills={deferred.skills} earned={earned} onOpen={onOpen} />
          ) : (
            <EmptyResults suggestions={suggestions} onApply={setFilters} onClear={() => setFilters({ ...defaultFilters })} />
          )}
          <FilterDock
            filters={filters}
            activeCount={activeFacetCount(filters)}
            onChange={setFilters}
            onOpenFilters={(focus) => filterSheet.open(focus ?? '1')}
          />
        </>
      ) : (
        <TitlesTab views={views} earned={earned} onToggle={toggleTitle} onOpen={onOpen} />
      )}

      <FilterSheet
        open={filterSheet.value !== null}
        focus={filterSheet.value}
        onClose={filterSheet.close}
        filters={filters}
        onChange={setFilters}
        counts={counts}
        resultCount={sheetCount}
        levels={catalog.levels}
        presets={presets}
        activeQuery={liveQuery}
        defaultPresetName={summarize({ ...filters, q: '' })}
        presetsFull={presets.length >= MAX_PRESETS}
        onApplyPreset={(p) => setFilters({ ...parseFilters(new URLSearchParams(p.query)), q: filters.q })}
        onSavePreset={(name) => savePreset(name, liveQuery)}
        onDeletePreset={deletePreset}
      />
      <ChartSheet chart={chart} titles={catalog.titles} earned={earned} onToggleTitle={toggleTitle} onClose={chartSheet.close} />
      <AboutDialog open={about.value !== null} meta={catalog.meta} onClose={about.close} />
    </div>
  )
}
```

- [ ] **Step 3: Add the route, mount it, and add the launcher tile**

Create `src/apps/pump/routes.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { PumpSkeleton } from '@/apps/pump/components/PumpSkeleton'

// The page and its ~500 KB of chart data load only when Pump opens.
const PumpHome = lazy(() => import('@/apps/pump/pages/PumpHome'))

/** Route elements for the Pump app, mounted under /pump in App.tsx. */
export const pumpRoutes = (
  <>
    <Route
      path="/pump"
      element={
        <Suspense fallback={<PumpSkeleton />}>
          <PumpHome />
        </Suspense>
      }
    />
  </>
)
```

In `src/App.tsx`:
- Add `import { pumpRoutes } from '@/apps/pump/routes'` after the `hubRoutes` import.
- Add `{pumpRoutes}` after `{hubRoutes}` inside `<Routes>`.

Replace `src/launcher/registry.ts` with:

```ts
import { Footprints, LayoutDashboard, Receipt, type LucideIcon } from 'lucide-react'

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
  {
    id: 'hub',
    name: 'Hub',
    description: "What I'm working on",
    icon: LayoutDashboard,
    to: '/hub',
  },
  {
    id: 'pump',
    name: 'Pump',
    description: 'Find charts to play',
    icon: Footprints,
    to: '/pump',
  },
]
```

- [ ] **Step 4: Type check, test, build**

Run: `npx tsc --noEmit`, then `npm test`, then `npm run build`
Expected: clean; all PASS. The build prints a separate `PumpHome-*.js` chunk under 2 MiB. Workbox's `maximumFileSizeToCacheInBytes` default is 2 MiB; if the chunk is bigger, stop and report it rather than raising the limit.

- [ ] **Step 5: Check it in the browser**

Start the dev preview (`dev`, port 5173). In the Browser pane at 390×844, check each item. Use `read_page` and `read_console_messages` for evidence and fix anything that fails before moving on.

1. The launcher shows a **Pump** tile with the footprints icon; tapping it shows the skeleton briefly, then the list.
2. The subtitle reads about "4,535 charts · … songs". Steam Link charts are hidden by default.
3. Scroll: the level header ("Lv 12 · …") sticks under the page header, and the next one replaces it. The DOM holds no more than ~80 rows (`document.querySelectorAll('button.h-16').length`).
4. Tap **D**, then the level chip → the sheet opens scrolled to Level. Tap 20, then 22 → the summary label shows "Level · Lv 20–22" and the footer count updates live.
5. Tap **twist** in Skills, then press the browser's **Back** → the sheet closes and the list shows D, Lv 20–22, twist (**Review Focus 1**). Reopen the sheet, add **bracket**, close with ✕ → both skills still apply.
6. Turn on "Show Steam Link charts", tap **HD** in the dock, then turn Steam Link off in the sheet → the HD chip disappears and the list isn't empty (**Review Focus 2**).
7. Type `vook` → the list narrows as you type. Type `zzzz` → "No charts match." with "Remove …" suggestions; tapping one brings charts back.
8. Tap a row → the chart sheet shows facts, skill bars and any title with an **earned** tick. Back closes it, and the list hasn't moved.
9. **Titles** tab → 9 tracks. Tick TWIST D Lv.1 → "1 / 90 earned", and the track shows "1 / 10". Tap a title row → its chart sheet opens.
10. Save a preset ("Save current"), clear the filters, tap the preset → the filters return. Edit → ✕ deletes it.
11. Reload the page with no query (`#/pump`) → the last filters come back; the search text doesn't.
12. Open (i) → the About dialog shows "PHOENIX 2 v1.01.0 · built …" and the three sources.
13. Light and dark themes: switch in Settings and recheck steps 2, 4 and 8. Badges, chips and bars stay readable.

Take a screenshot of the Charts tab, the Filters sheet, the chart sheet and the Titles tab for the PR.

- [ ] **Step 6: Commit**

```bash
git add src/apps/pump/components/PumpHeader.tsx src/apps/pump/components/PumpSkeleton.tsx src/apps/pump/pages/PumpHome.tsx src/apps/pump/routes.tsx src/App.tsx src/launcher/registry.ts
git commit -m "feat(pump): Pump page, lazy route and launcher tile" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Phone checks, docs and ship prep

**Files:**
- Modify: `README.md`
- Create: `docs/features/2026-10-piu-chart-filter/permission-messages.md`

- [ ] **Step 1: README**

Add a Pump section to `README.md` after the Hub section, in the same style:

```markdown
## Pump

Every PHOENIX 2 Pump It Up chart, filtered one-handed at the arcade: mode, level range, skills (half, run, twist, bracket, drill, gimmick), song type, version and search, plus the nine skill-title tracks with earned ticks. Works offline; the chart data is bundled.

- Data: `npm run piu:data` rebuilds `src/apps/pump/data/charts.json` from pumpout-db-updates and the PIU Scores export. See `scripts/piu-data/README.md`.
- Design: `docs/features/2026-10-piu-chart-filter/spec.md`.
```

- [ ] **Step 2: Draft the two permission messages**

Create `docs/features/2026-10-piu-chart-filter/permission-messages.md`. It holds two short drafts the user will send themselves:
- one to aaaaaa2493, as an issue on `aaaaaa2493/pumpout-db-updates`;
- one to DrMurloc, as an issue on `DrMurloc/PumpItUpScoreTracker`, or through the PIU Scores About page's contact.

Each draft says:
- what Pump is: a free, personal, offline chart filter in a hobby PWA;
- exactly which derived fields are shipped (titles, artists, levels, modes, flags, skill tags and coverage percentages; no step data);
- how they're credited (the About dialog text);
- that the repo is public;
- a plain question: "Are you OK with this? Happy to change the credit or remove anything."

Keep each under 150 words. Don't send anything.

- [ ] **Step 3: Phone checks (with the user)**

Ask the user to do these on their phone against the deployed branch preview, or on `npm run dev -- --host` on the same Wi-Fi:
1. Focus the search box: the bottom bar rises above the keyboard and doesn't flicker. If it misbehaves, note it; the spec's fallback is moving search to the header.
2. One-handed: chips, Filters and search are reachable with the thumb.
3. Back closes sheets; Back on the plain list leaves Pump.
4. Install to the home screen, open Pump once, then turn on airplane mode, close the app and reopen it: the list loads.
5. Tick a title, close the app, reopen it: the tick is still there.
6. In a dim room, in the dark theme, the badges, chips and bars are readable.

Record the results in the PR description.

- [ ] **Step 4: Run Lighthouse (mobile) on `#/pump`**

Expected: no console errors. Interaction to Next Paint on chip taps ≤ 200 ms (use the Performance panel's interaction track if Lighthouse can't trigger taps). The DOM stays small while scrolling.

- [ ] **Step 5: Commit, then open the PR (do not merge)**

```bash
git add README.md docs/features/2026-10-piu-chart-filter/permission-messages.md
git commit -m "docs(pump): README section and data permission drafts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Open a PR from `feature/piu-charts` to `main`. Its description includes:
- the four screenshots;
- the phone-check results;
- the `npm run piu:data` report summary (counts, the per-skill tag shares, warnings);
- the note: **"Do not merge until both data maintainers have answered (permission-messages.md)."**

- [ ] **Step 6: After the PR exists**

- Update the "Nook Split, Explained" storyboard artifact with a Pump chapter. Use real screenshots, following the recipe in the explainer memory.
- Run the `wrap` skill so `now/bill-splitter.md` names the PR, what waits on the user (send the two messages, the phone checks, merging) and the open data warnings: U Got Me Rocking D6/D5, and 1948 D29 taken from PIU Scores.
