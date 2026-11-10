# Pump chart videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link each Pump chart sheet to the NEVSISTER YouTube video of that exact chart, from a static, committed video list.

**Architecture:** A new build step, `npm run piu:videos`, lists NEVSISTER's uploads (public playlist page plus its continuation requests), parses each title, matches it to the charts in the committed `charts.json` and writes `src/apps/pump/data/videos.json`. The app loads that file lazily the first time a chart sheet opens. It then turns the sheet's song art into a youtube.com link with a ▶ badge and a caption.

**Tech Stack:** Node 20 ESM scripts (no new dependencies), Vitest (node environment, pure logic only), React + Tailwind, zod, lucide-react.

**Spec:** [`spec.md`](spec.md)

## Global Constraints

- No new npm dependencies. Node 20 (`node:sqlite` is not available). npm only.
- `charts.json` is unchanged and stays ≤ 600,000 bytes. Videos live only in `src/apps/pump/data/videos.json`, which is committed and loaded with a dynamic `import('./videos.json?raw')`.
- Channel: `UCicVRsgv4iIhZGZcbx7xUkw` (uploads playlist `UUicVRsgv4iIhZGZcbx7xUkw`), name `NEVSISTER`, URL `https://www.youtube.com/@NEVSISTER`.
- The lister waits 250 ms between requests. Its dated cache is `.cache/piu-data/nevsister-YYYY-MM-DD.json`.
- The build fails without writing if fewer than 10,000 videos are listed or singles and doubles together are below 95 % coverage.
- Mix labels are exactly `PHOENIX 2`, `PHOENIX`, `RISE` and `XX`. RISE videos match half-doubles only.
- Link: `https://www.youtube.com/watch?v=<id>`, `target="_blank" rel="noreferrer"`. No CSP change and no embedded player.
- Caption copy: `Watch {MODE_SHORT}{level} on YouTube · NEVSISTER · {mix}`, plus ` · left side` or ` · right side` for a two-chart singles video.
- Commits use `feat(pump): …`, `docs(pump): …` or `chore(pump): …` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Sheet opened offline before the videos chunk is cached.** The import rejects. The sheet must still open, with no link, and the next open must retry. Pinned by `createVideoLoader` tests (Task 4).
2. **Picking a sibling chart inside an open sheet.** The link must switch to the new chart's video, or disappear when it has none. Checked in the browser (Task 4, Step 7).
3. **YouTube serves a consent or bot page with no `ytInitialData`.** The lister throws `YouTube page format changed` and nothing is written. Pinned by a lister test (Task 1).
4. **Curly quotes and other odd characters in titles,** e.g. `Reincarnate in “A”`. They must fold to the same key as the catalog title. Pinned by a `songKeys` test (Task 2).
5. **Two catalog songs sharing a loose key,** e.g. `Underworld` and `Underworld (PIU Edit.)`. The loose key must not match either song. Pinned by a matcher test (Task 3).

---

### Task 1: YouTube playlist lister

**Files:**
- Create: `scripts/piu-data/youtube.mjs`
- Modify: `scripts/piu-data/sources.mjs` (add `NEVSISTER`)
- Test: `scripts/piu-data/youtube.test.mjs`

**Interfaces:**
- Produces: `listPlaylist(listId: string, opts?: { fetch?: typeof fetch, pauseMs?: number, onPage?: (page: number, count: number) => void }) => Promise<{ id: string, title: string }[]>`. Order is page order, so an uploads list comes newest first.
- Produces: `NEVSISTER = { name: 'NEVSISTER', channelId: 'UCicVRsgv4iIhZGZcbx7xUkw', url: 'https://www.youtube.com/@NEVSISTER', uploads: 'UUicVRsgv4iIhZGZcbx7xUkw' }` in `sources.mjs`.

- [ ] **Step 1: Write the failing tests**

The fake fetch answers a GET of `https://www.youtube.com/playlist?list=L1` with HTML containing `"INNERTUBE_CLIENT_VERSION":"2.20261101.00.00"` and `var ytInitialData = {…};</script>`. That JSON nests two `lockupViewModel`s (`contentId: 'a1'` / `metadata.lockupMetadataViewModel.title.content: 'First'`, and `'a2'` / `'Second'`) and a `continuationCommand: { token: 'T1' }`. A POST to `https://www.youtube.com/youtubei/v1/browse?prettyPrint=false` answers JSON with one lockup (`'a3'`, `'Third'`) and no token.

```js
it('walks the page and its continuations in order', async () => {
  expect(await listPlaylist('L1', { fetch: fake, pauseMs: 0 })).toEqual([
    { id: 'a1', title: 'First' }, { id: 'a2', title: 'Second' }, { id: 'a3', title: 'Third' },
  ])
  const body = JSON.parse(fake.mock.calls[1][1].body)
  expect(body).toMatchObject({ continuation: 'T1', context: { client: { clientName: 'WEB', clientVersion: '2.20261101.00.00' } } })
})
it('throws when the page has no ytInitialData', async () => {
  await expect(listPlaylist('L1', { fetch: page('<html>consent</html>'), pauseMs: 0 })).rejects.toThrow('YouTube page format changed')
})
it('throws on an HTTP error', async () => {
  await expect(listPlaylist('L1', { fetch: status(429), pauseMs: 0 })).rejects.toThrow('HTTP 429')
})
```

- [ ] **Step 2: Run `npx vitest run scripts/piu-data/youtube.test.mjs`.** Expected: FAIL (module not found).

- [ ] **Step 3: Implement `listPlaylist` in `youtube.mjs` and add `NEVSISTER` to `sources.mjs`**

Send `Accept-Language: en-US,en;q=0.9` and a desktop Chrome `User-Agent`. Collect by walking the JSON tree: a `lockupViewModel` with a `contentId` is a video, and the last `continuationCommand.token` seen is the next page. Port it from the spike (`list-playlist.mjs` in the session scratchpad).

- [ ] **Step 4: Run the test again.** Expected: 3 passed.

- [ ] **Step 5: Commit** `feat(pump): list a YouTube playlist without an API key`

---

### Task 2: Video title parser and song keys

**Files:**
- Create: `scripts/piu-data/video-titles.mjs`
- Test: `scripts/piu-data/video-titles.test.mjs`

**Interfaces:**
- Produces: `MIXES = ['PHOENIX 2', 'PHOENIX', 'RISE', 'XX']`
- Produces: `parseVideoTitle(title: string) => null | { song: string, type: 'ARCADE'|'SHORTCUT'|'FULLSONG', codes: { mode: 'S'|'D'|'HDB', level: number }[], mix: Mix, era: 'P2'|'P1'|'XX', rank: number, moved: { mode: 'S'|'D', level: number }[] }`. `song` is the raw song text; `era` says which level the codes are in; `moved` holds the XX levels a PHOENIX title notes as changed.
- Produces: `songKeys(title: string) => string[]`: distinct match keys, strictest first; `[0]` is the exact key.

Tags (first match wins; spaces in the Korean tags are optional):

| Tag | rank | mix | era | Notes |
|---|---|---|---|---|
| `PUMP IT UP PHOENIX 2` | 0 | PHOENIX 2 | P2 | |
| `PUMP IT UP PHOENIX` with `PNX1 ` in the title | 0.5 | PHOENIX 2 | P2 | |
| `펌프 잇 업 2026` | 1 | PHOENIX 2 | P2 | drop `Artist - ` |
| `PUMP IT UP PHOENIX` | 2 | PHOENIX | P1 | `moved` from `XX S19` / `pre S14 → S15` |
| `펌프 잇 업 2023`, `펌프 잇 업 2024` | 3 | PHOENIX | P1 | drop `Artist - ` |
| `PUMP IT UP RISE` | 4 | RISE | P2 | keep HD codes only; none → `null` |
| `PUMP IT UP XX` | 5 | XX | XX | |
| `펌프잇업 20주년` | 6 | XX | XX | drop `Artist - ` |

Return `null` for any other tag, and for a head (the title before ` | `) matching `/mirror|compare|random skin|random step|\bbga\b|\b(sp|dp)\d|co-?op|\b[456]k\b|\?\?/i`, or with no code group. A code group is `(S|D|HDB|HD)\d{1,2}` joined by `&`, and it must be followed by a space, `(`, `|` or the end. `HD` maps to `HDB`.

- [ ] **Step 1: Write the failing tests** (`it.each` over real titles from the spike)

```js
expect(parseVideoTitle('[PUMP IT UP PHOENIX] Sarabande (사라반드) D21 | RUN D LV.6 Title'))
  .toMatchObject({ mix: 'PHOENIX', era: 'P1', rank: 2, type: 'ARCADE', codes: [{ mode: 'D', level: 21 }] })
expect(parseVideoTitle('[PUMP IT UP PHOENIX] Mr. Larpus (미스터 라푸스) D19 (PNX1 D18, XX D17)'))
  .toMatchObject({ mix: 'PHOENIX 2', era: 'P2', rank: 0.5 })
expect(parseVideoTitle('[PUMP IT UP PHOENIX] Sarabande(사라반드) - SHORT CUT - S17 & S19 (Phoenix Modified ver.)'))
  .toMatchObject({ type: 'SHORTCUT', codes: [{ mode: 'S', level: 17 }, { mode: 'S', level: 19 }] })
expect(songKeys(parseVideoTitle('[펌프 잇 업 2024] MAX(맥스) - Sarabande(사라반드) S4 & S7').song)[0]).toBe('sarabande')
expect(parseVideoTitle('[펌프 잇 업 2026] Camellia & Nanahira - Can I friend you on Bassbook? lol (베이스라인 하고있니? ㅎ) S4 & S7'))
  .toMatchObject({ mix: 'PHOENIX 2', era: 'P2' })
expect(parseVideoTitle('[PUMP IT UP RISE] Lucky Star (럭키 스타) HD18')).toMatchObject({ mix: 'RISE', codes: [{ mode: 'HDB', level: 18 }] })
expect(parseVideoTitle('[PUMP IT UP RISE] PHYSALIS (피살리스) S22 (0.4.1 Update)')).toBeNull()
expect(parseVideoTitle('[PUMP IT UP XX] Radetzky Can Can S8 & S13(Update for 2.05) | PIU XX 2.05 Update').codes).toHaveLength(2)
expect(parseVideoTitle('[PUMP IT UP PHOENIX] Night Duty (야근) S17 & S20 (XX S19 / SLOW LV.4 TITLE)').moved).toEqual([{ mode: 'S', level: 19 }])
expect(parseVideoTitle('[PUMP IT UP PHOENIX] Last Rebirth(라스트 리버스) D17 (pre D16 → D17 / Phoenix Modified ver.)').moved).toEqual([{ mode: 'D', level: 16 }])
// null: mirror, play session, co-op, ?? level, EZ2ON 6K, BGA (no code), gimmick compare
for (const t of ['[PUMP IT UP XX] Bad Apple!! feat. Nomico - FULL SONG - D22(HALF LV.8) Mirror Pattern',
  '[PIU PHOENIX] NEVSIST - Dopplelganger(도플갱어) S20 PERFECT GAME 1,000,000 Score',
  '[PUMP IT UP PHOENIX] Sarabande(사라반드) CO-OP X2 (Phoenix Modified ver.)', '[PUMP IT UP PHOENIX] 1948 D?? RS (Random Step)',
  '[PUMP IT UP RISE] JUSTITIA (유스티티아) 6K D27 (EZ2ON REBOOT : R DLC)', '[PUMP IT UP XX] Radetzky Can Can(라젠스키 캉캉) BGA',
  '[PUMP IT UP PHOENIX] KUGUTSU(꼭두각시) S25 Gimmick Remove Part Compare | 기믹 제거 버전 비교']) expect(parseVideoTitle(t)).toBeNull()

expect(songKeys('Sarabande (사라반드)')[0]).toBe('sarabande')
expect(songKeys('조깅(Jogging)')).toContain('jogging')
expect(songKeys('%X(Percent X)')).toContain('percentx')
expect(songKeys('Underworld(언더월드) ft.Skizzo (PIU Edit.)')).toContain('underworld')
expect(songKeys('Underworld (PIU Edit.)')).toContain('underworld')
expect(songKeys('Canon D FULL Song MIX')).toContain('canond')
expect(songKeys('Dement ~After Legend~')).toContain('dement')
expect(songKeys('Reincarnate in “A” (리인카네이트 인 “A”)')[0]).toBe(songKeys('Reincarnate in "A"')[0])
```

- [ ] **Step 2: Run `npx vitest run scripts/piu-data/video-titles.test.mjs`.** Expected: FAIL.

- [ ] **Step 3: Implement both functions in `video-titles.mjs`**

Port `keys()` and the parse loop from the spike's `match2.mjs`. The key fold is NFKD, combining marks dropped, lower-cased, then everything except `\p{L}\p{N}` removed. Variants, in order: Hangul brackets removed; that minus a trailing `full song (mix)` / `short cut` / `remix`; all brackets removed (`()`, `（）`, `〈〉`, `<>`, `~~`, `[]`); that minus ` ft.`/` feat.` onward; that minus the trailing type words. A title whose unbracketed text holds Hangul also gets each Latin bracket content as a key. Strip `- SHORT CUT -` / `- FULL SONG -` from `song` after reading `type`.

- [ ] **Step 4: Run the tests again.** Expected: all pass.

- [ ] **Step 5: Commit** `feat(pump): parse NEVSISTER chart video titles`

---

### Task 3: Matcher, overrides, checks and encoding

**Files:**
- Create: `scripts/piu-data/video-match.mjs`
- Test: `scripts/piu-data/video-match.test.mjs`

**Interfaces:**
- Consumes: `parseVideoTitle`, `songKeys`, `MIXES` (Task 2).
- Produces: `matchVideos(file: ChartsFile, videos: { id, title }[]) => { picks: Map<number, Pick>, unknownSongs: Map<string, number>, parsed: number }`, where `Pick = { v: string, mix: Mix, side?: 'L'|'R', title: string }`.
- Produces: `applyOverrides(picks, overrides: Record<string, null | { v: string, mix: Mix, side?: 'L'|'R' }>) => { picks, applied: number }`
- Produces: `videoCoverage(file, picks) => Record<'S'|'D'|'HDB', { yes: number, total: number }>`
- Produces: `checkVideos({ listed: number, coverage }) => string[]` (error messages; empty means OK)
- Produces: `encodeVideos(picks, meta: { builtAt: string, listed: number }) => VideosFile`, shape `{ meta: { builtAt, channel: 'NEVSISTER', url, listed }, mixes: MIXES, v: { [chartId]: [videoId, mixIndex] | [videoId, mixIndex, 'L'|'R'] } }` with keys in ascending chart-id order.
- Produces: `stringifyVideos(file) => string`: one `v` entry per line, for readable diffs.

Matching rules:
- **Song lookup:** first the exact key (`songKeys(song)[0]`) with the same type. Then each looser key, but only when it maps to exactly one song of that type. A `REMIX` catalog song also answers `ARCADE` videos.
- **Index** each parsed video under `(songIndex, era, mode, level)` for each of its codes.
- **Chart lookup:** P2 videos at `lv`, plus P1 videos at `p ?? lv`. If neither exists, use XX videos at `p ?? lv`, unless a P1 video of that song lists `{ mode, level: p ?? lv }` in `moved`. RISE videos (era P2) can only carry HDB codes, so they only reach half-doubles.
- **Ordering:** best `rank`, then a solo video before a shared one, then the earlier position in `videos` (newer).
- **Side:** only when the picked video has exactly two `S` codes. The chart's code with the lower level is `'L'`, the higher `'R'`; equal levels get no side.

- [ ] **Step 1: Write the failing tests** against a small catalog fixture (`songs`: Sarabande ARCADE, Sarabande SHORTCUT, Mr. Larpus, Night Duty, Jogging, Lucky Star, Underworld, Underworld (PIU Edit.), Banya Remix [REMIX])

```js
it('picks Sarabande D21 from its PHOENIX video', () => expect(pick(chartD21)).toMatchObject({ v: 'F9jchbo1OFI', mix: 'PHOENIX' }))
it('prefers a PHOENIX 2 video over a PHOENIX one', …)                 // Sarabande S12: P2 'p2s12' beats PHOENIX 'p1s12'
it('matches a re-rated chart by its PHOENIX level', …)                // Mr. Larpus D19 p18, only video 'Mr. Larpus D18' (PHOENIX) → picked
it('prefers the PNX1-noted video over the PHOENIX-level one', …)      // adds 'Mr. Larpus D19 (PNX1 D18)' → that one wins
it('gives the lower level the left side', …)                          // SHORT CUT 'S17 & S19': S17 → 'L', S19 → 'R'
it('prefers a solo video, then the newest, within a mix', …)
it('falls back to an XX video', …)                                    // Jogging D22 ← '[PUMP IT UP XX] 조깅(Jogging) D22 | …', mix 'XX'
it('blocks an XX video whose level a PHOENIX title says moved', …)    // Night Duty S19: XX 'Night Duty S19' ignored
it('matches a half-double only from RISE', …)                         // Lucky Star HDB18
it('ignores a loose key shared by two songs', …)                      // 'Underworld ft.X (Foo) D20' → no pick, counted in unknownSongs
it('lets an ARCADE-typed video reach a REMIX song', …)
it('applies overrides: null drops, an object replaces', …)            // applied === 2
it('counts coverage by mode', …)
it('fails the checks below 10,000 videos or 95 % S+D', () => {
  expect(checkVideos({ listed: 9_999, coverage: full })).toHaveLength(1)
  expect(checkVideos({ listed: 12_000, coverage: { S: { yes: 94, total: 100 }, D: { yes: 95, total: 100 }, HDB: { yes: 0, total: 50 } } })).toHaveLength(1)
  expect(checkVideos({ listed: 12_000, coverage: full })).toEqual([])
})
it('encodes picks sorted by chart id with mix indexes and sides', () => {
  expect(encodeVideos(picks, { builtAt: '2026-11-11', listed: 3 }).v).toEqual({ 3: ['xS17', 1, 'L'], 10: ['F9jchbo1OFI', 1] })
})
```

- [ ] **Step 2: Run `npx vitest run scripts/piu-data/video-match.test.mjs`.** Expected: FAIL.

- [ ] **Step 3: Implement the six exports in `video-match.mjs`** (port the spike's index and lookup from `match2.mjs`)

- [ ] **Step 4: Run the tests again.** Expected: all pass.

- [ ] **Step 5: Commit** `feat(pump): match chart videos to the catalog`

---

### Task 4: Build `videos.json`, then show the link in the chart sheet

**Files:**
- Create: `scripts/piu-data/videos.mjs` (CLI), `scripts/piu-data/video-overrides.json` (`{}`), `src/apps/pump/data/videos.json` (generated), `src/apps/pump/data/videos.ts`, `src/apps/pump/lib/video.ts`, `src/apps/pump/hooks/useChartVideo.ts`
- Modify: `package.json` (`"piu:videos": "node scripts/piu-data/videos.mjs"`), `src/apps/pump/data/schema.ts` (add `videosFileSchema`), `src/apps/pump/components/ChartSheet.tsx`, `src/apps/pump/components/AboutDialog.tsx`, `scripts/piu-data/README.md`
- Test: `src/apps/pump/data/videos.test.ts`, `src/apps/pump/lib/video.test.ts`

**Interfaces:**
- Consumes: `listPlaylist`, `NEVSISTER` (Task 1); all Task 3 exports.
- Produces: `videosFileSchema` and `type VideosFile` in `schema.ts`.
- Produces in `videos.ts`: `type VideoMix = 'PHOENIX 2' | 'PHOENIX' | 'RISE' | 'XX'`, `interface ChartVideo { id: string; mix: VideoMix; side?: 'left' | 'right' }`, `decodeVideos(file: VideosFile): Map<number, ChartVideo>`, `createVideoLoader(importer: () => Promise<{ default: string }>): () => Promise<Map<number, ChartVideo>>` (memoised; a rejection clears the memo so the next call retries), and `loadVideos = createVideoLoader(() => import('./videos.json?raw'))`.
- Produces in `lib/video.ts`: `videoUrl(v: ChartVideo): string` and `videoCaption(chart: Pick<Chart, 'mode' | 'level'>, v: ChartVideo): string`.
- Produces in `hooks/useChartVideo.ts`: `useChartVideo(chartId: number | undefined): ChartVideo | undefined`. It returns `undefined` until loaded or on failure, and swallows the error.

- [ ] **Step 1: Write `videos.mjs` and run it**

The CLI reads `charts.json`. It reads `.cache/piu-data/nevsister-<today>.json`, or lists `NEVSISTER.uploads` and saves the list there. It then runs `matchVideos`, `applyOverrides` (`video-overrides.json`) and `checkVideos`, and prints a report: listed and parsed counts, coverage by mode, S/D charts without a video grouped by song, the top 20 unknown video songs, the number of XX picks, and overrides applied. On errors it exits 1 without writing. Otherwise it writes `stringifyVideos(encodeVideos(…))`.

Run: `npm run piu:videos`. Expected: about 12,400 listed; S ≥ 2,701/2,752, D ≥ 1,772/1,783, HDB ≥ 31/790; and `Wrote src/apps/pump/data/videos.json`.

- [ ] **Step 2: Spot-check 20 picks against PIU Scores**

In the browser pane, open 20 PIU Scores chart pages (`https://piuscores.arroweclip.se/Charts/phoenix-2/<slug>/<code>`, with URLs from its export's `ChartUrl` column): at least 8 XX picks, 4 PNX1 or re-rated charts, 4 shared-video sides and 4 PHOENIX picks. Read each page's `youtube.com/embed/<id>` and compare it with ours. A different ID is not automatically wrong, since PIU Scores may pick another upload of the same chart. Open both and confirm the chart and level. Fix real mistakes with `video-overrides.json` and rerun Step 1. Record the results in the PR body.

- [ ] **Step 3: Write the failing app tests**

```ts
// videos.test.ts
it('decodes ids, mixes and sides', () => expect(decodeVideos(fixture).get(3)).toEqual({ id: 'xS17', mix: 'PHOENIX', side: 'left' }))
it('retries after a failed load', async () => {
  const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ default: JSON.stringify(fixture) })
  const load = createVideoLoader(importer)
  await expect(load()).rejects.toThrow('offline')
  expect((await load()).size).toBe(2)
})
describe('committed videos.json', () => {
  it('parses, and every key is a chart in charts.json', …)
  it('links Sarabande D21 to F9jchbo1OFI', …)                 // look the chart up by song title + mode + level, not a hard-coded id
  it('covers at least 95 % of singles and doubles', …)
})
// video.test.ts
expect(videoUrl({ id: 'F9jchbo1OFI', mix: 'PHOENIX' })).toBe('https://www.youtube.com/watch?v=F9jchbo1OFI')
expect(videoCaption({ mode: 'D', level: 21 }, { id: 'x', mix: 'PHOENIX' })).toBe('Watch D21 on YouTube · NEVSISTER · PHOENIX')
expect(videoCaption({ mode: 'S', level: 17 }, { id: 'x', mix: 'XX', side: 'left' })).toBe('Watch S17 on YouTube · NEVSISTER · XX · left side')
expect(videoCaption({ mode: 'HDB', level: 18 }, { id: 'x', mix: 'RISE' })).toBe('Watch HD18 on YouTube · NEVSISTER · RISE')
```

- [ ] **Step 4: Run `npx vitest run src/apps/pump/data/videos.test.ts src/apps/pump/lib/video.test.ts`.** Expected: FAIL.

- [ ] **Step 5: Implement `videosFileSchema`, `videos.ts`, `lib/video.ts` and `useChartVideo`.** Then run the step 4 command again. Expected: pass.

- [ ] **Step 6: Wire up the sheet and About**

- `ChartSheet`: `const video = useChartVideo(c?.id)`. With a video, wrap the `SongArt` and a caption line in a single `<a href={videoUrl(video)} target="_blank" rel="noreferrer" className="block space-y-1.5">`. Overlay the art with a centred `Play` icon (lucide, filled) on a `bg-black/60` circle, h-12 w-12, white. Below it, a `<span className="text-sm text-primary">{videoCaption(c, video)}</span>`. Without a video, render as today.
- `AboutDialog`: add the paragraph `Chart videos: links to NEVSISTER (네브시스터) on YouTube.`, with "NEVSISTER (네브시스터)" linking to `https://www.youtube.com/@NEVSISTER`.

- [ ] **Step 7: Check in the browser**

Start the dev server with `preview_start`. Open Sarabande D21: the ▶ shows and the link is `…watch?v=F9jchbo1OFI`. Tap the S17 chip of Sarabande SHORT CUT: the caption ends with `left side`. Pick a chart with no video (a half-double without a RISE video, e.g. Sarabande HD11): no ▶ and no caption. Check the About credit. Check light and dark mode, with no console errors. Take a screenshot for the PR.

- [ ] **Step 8: Full checks**

Run: `npm test`, then `npm run build`. Expected: all pass. The build output has a separate `videos.json` chunk listed in `dist/sw.js`'s precache, and `charts.json`'s size is unchanged.

- [ ] **Step 9: Commit** `feat(pump): watch a chart's video from its sheet`, including `videos.json`, the overrides file, the README section (*Chart videos*: when to run `piu:videos`, the report, overrides, the thresholds) and `package.json`.

---

### Task 5: Docs sync and PR

**Files:**
- Modify: `docs/features/2026-11-pump-chart-videos/spec.md` (status: approved and built, plus the measured coverage), `docs/features/2026-10-pump-song-art/spec.md` (its "YouTube links" non-goal now points here), and `docs/features/2026-10-piu-chart-filter/spec.md` §Licensing (add NEVSISTER as a link-only source)
- Republish: the explainer "Nook Split, Explained" (https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4). Add the video link to its Pump content with the Task 4 screenshot, and refresh the Synced line.

- [ ] **Step 1:** Grep `docs/` and `README.md` for `YouTube`, `video` and `Sources` to find any other doc that describes the sheet or the data sources, and update each one.
- [ ] **Step 2:** Update the three specs and commit: `docs(pump): chart videos spec built; sources and song-art non-goal`.
- [ ] **Step 3:** Read the explainer, edit it, and republish it to the same URL.
- [ ] **Step 4:** Push `feature/pump-chart-videos` and open the PR. The body covers what, why, coverage, the spot-check table, a screenshot, and test results. End it with the Claude Code line.
