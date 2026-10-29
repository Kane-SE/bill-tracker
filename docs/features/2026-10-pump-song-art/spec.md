# Pump song art — Design

**Date:** 2026-10-28 · **Status:** decisions answered 2026-10-28, awaiting spec review
**Builds on:** [`../2026-10-piu-chart-filter/spec.md`](../2026-10-piu-chart-filter/spec.md) (Pump v1) · **Research:** [`../2026-10-piu-chart-filter/research-thumbnails.md`](../2026-10-piu-chart-filter/research-thumbnails.md) (layouts §3, sources §4, licensing §5) · **Prototype:** branch `prototype/pump-thumbnails`, `npm run dev`, `#/pump?variant=D` and `?variant=E`

## Problem

Pump's chart list is text only. At the cabinet you remember a song by its art (the blue anime one, the red one with the big title) faster than you read its name. The list should show each song's jacket art, and the chart sheet should show it large.

## Decisions

| # | Decision |
|---|---|
| 1 | **Two views of the Charts tab, switched by a button: grid (prototype E, the default) and list (prototype D, banner rows).** Both replace today's text-only rows. Research §3.4 advised against a grid for a hunting task; you chose it after trying all five layouts, and the list view covers fast hunting. |
| 2 | **Grid tile**: art on top with only the `LevelBadge` on it; below the art, the title and the row's icons (skill tags, trophy, gem). Artist, song type and series show in the list view and the chart sheet. |
| 3 | **List row**: today's 64 px row (badge, title, line 2, icons), with the art filling the right 3/5 and fading into the page background, like piugame.com's score cards. |
| 4 | **Chart sheet gets a 16:9 hero image** above the header row, capped at 28vh. |
| 5 | **Source: pumpout's community cards** for every song. Same art as the arcade, but frame grabs, and 4:3 crops for older songs (research §4.2). Built behind one resolver, so official files could replace them per song later. |
| 6 | **Images are hotlinked at runtime, never bundled.** The repo gains one image path per song, a derived fact (research §5). Nothing goes in `public/`, which the PWA precaches. |
| 7 | **Offline: art shows only for songs already seen.** Everything else shows a placeholder: the title's initials on a `secondary` box, same size, so nothing jumps. |
| 8 | **Both permission messages mention the images** before this ships (drafts updated 2026-10-28 in `permission-messages.md`). |
| 9 | **Skill tags get a 3:1 outline** (done on the prototype branch, 2026-10-27): `ring-foreground/40`, or `ring-primary` when the skill is selected. |

**Not blocking:** the cabinet check (research §6 Q6). Next time at the machine, compare a few songs' song-select art with the app's (e.g. Iolite Sky, STAGER, an old BanYa song). It only matters if official files are ever wanted instead of the community cards.

## Screens

All sizes are CSS px at 390 px wide, as in the v1 spec. Every tap target is ≥ 44 px. Colours from tokens only.

### View switch

- One 44×44 icon button in the Pump header, left of the (i) button, shown on the Charts tab only. It shows the icon of the view it switches to (`Rows3` in grid view, `LayoutGrid` in list view), with `aria-label` "Show as list" / "Show as grid".
- The choice is saved in `usePumpStore` (`view: 'grid' | 'list'`, default `'grid'`) and survives restarts. It isn't in the URL, so shared links don't force a layout, and it isn't in the backup.
- Switching keeps the first visible chart in view: the list scrolls to the row (or grid pair) that holds it.

### Grid view

```text
┌──────────────────────────────────────────┐
│ Lv 19 · 51                               │ 32 px sticky header, full width
├────────────────────┬─────────────────────┤
│ ┌────────────────┐ │ ┌─────────────────┐ │
│ │      art       │ │ │      art        │ │ 96 px
│ │┌──┐            │ │ │┌──┐             │ │
│ ││S19│           │ │ ││D19│            │ │ LevelBadge 40×40, bottom-left
│ └────────────────┘ │ └─────────────────┘ │
│ Iolite Sky         │ STAGER              │ title, truncated
│ [twist][run] 🏆    │ [drill] ◆           │ tags + icons, 20 px
└────────────────────┴─────────────────────┘ 148 px tile + 8 px gap = 156 px grid row
```

- **Virtual rows**: `header` (32 px) and `pair` (156 px). Pairs are built inside each level section, so a section with an odd count ends with one tile in the left column. `estimateSize` stays fixed per kind. About 8 tiles show on an 844 px screen.
- **Tile** (one `<button>` that opens the chart sheet; `rounded-lg border bg-card`, `active:bg-secondary/60`):
  - **Art**: full tile width × 96 px, `object-cover`. 4:3 cards lose a strip top and bottom.
  - **LevelBadge** at 40×40, `bottom-1 left-1` on the art. S and HD (outlined) get a `bg-background/85` fill so they read on any art; D keeps its `primary` fill.
  - **Line 1**: title, `text-sm font-semibold`, truncated.
  - **Line 2**: up to 2 `SkillTag`s (selected first), trophy (filled when earned), gem. Empty when the chart has none (1,141 of 5,325 charts), with no box drawn.
  - Worst case measured on the prototype: CHAOS AGAIN S21 (gimmick, drill, trophy, gem) needs 136 of 150 px.

### List view

```text
┌──────────────────────────────────────────┐
│ ┌──┐ Iolite Sky          ░░▒▒▓▓ art ▓▓▓▓ │
│ │S19│ Doin · PRIME 2     ░░▒▒▓[twist]🏆▓ │ 64 px
│ └──┘                     ░░▒▒▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────────┘
  solid background ──fade──▶ art (right 3/5)
```

- Today's `ChartRow` layout and 64 px height, unchanged on the left.
- **Art layer**: `absolute inset-y-0 right-0 w-3/5`, `object-cover`, `aria-hidden`, under a gradient `from-background via-background/80 to-background/10` (left to right). The badge and title sit on solid background, so the badge needs no fill of its own.
- **Icons**: the icon group sits on a `bg-background/85 rounded-md px-1` pad, so the tags and trophy read on any art.
- Line 2 runs into the fade; check its contrast on bright art in both themes (manual checks).

### Chart sheet: hero

- First child of the sheet: the art at `aspect-video w-full max-h-[28vh] rounded-lg`, `loading="eager"`. The header row (badge, title, Korean title, artist) follows.
- Switching to a sibling chart keeps the same song, so the image doesn't reload.
- The prototype's "PROTOTYPE · source" caption is dropped.

### Image states

| State | Show |
|---|---|
| Loading | `bg-secondary` box at the final size (list view: nothing behind the fade). No spinner, no shimmer. |
| Loaded | Shown as is (no fade-in in v1). |
| No path, offline and not cached, or error | Grid and sheet: up to 2 initials of the title, `text-muted-foreground` on `bg-secondary`, `aria-hidden`. List view: no art layer, so the row looks like today's. A failed URL is remembered for the session so remounting rows don't retry it. |

- **Decorative**: `alt=""` everywhere; the title is always next to the art.
- **Dark theme**: `dark:brightness-90` on the image, to soften bright art in a dim arcade.

## Data

### Build

- `scripts/piu-data/pumpout.mjs` reads `songCard` (lowest `sortOrder` per song, live per `songCardVersion` at the pinned version) **by pumpout song ID** during `readSongs`. The prototype keyed by `title|artist` and lost 59 songs to clashes; the build must map 669 / 669.
- The host comes from the file name, as research §4.2 measured: `Phoenix_*` / `Phoenix2_*` → the pumpout-db-updates repo at the pinned commit; everything else → `pumpout.anyhowstep.com/img/card/`.
- The report prints how many songs have art and lists those without. The build fails on a card path that matches neither rule.

### charts.json shape

- `meta.imgHosts: string[]`: URL prefixes, e.g. `["https://pumpout.anyhowstep.com/img/card/", "https://raw.githubusercontent.com/aaaaaa2493/pumpout-db-updates/<sha>/img/"]`.
- Song gains `i?: [hostIndex, fileName]`. About 669 × ~22 bytes ≈ 15 KB, against a file at 523.6 KB and a 600 KB budget.
- `decodeCatalog()` resolves it into `song.image?: string` (full URL).

## Runtime

- **`SongArt`** (`components/SongArt.tsx`): the prototype's component without the prototype comments. Props: `song`, `className`, `eager`. Fixed size via `className`, `decoding="async"`, `loading="lazy"` unless eager.
- **Workbox** (`vite.config.ts`): a `runtimeCaching` entry for both image hosts, `CacheFirst`, cache `pump-art`, `expiration: { maxEntries: 700, maxAgeSeconds: 90 days, purgeOnQuotaError: true }`, `cacheableResponse: { statuses: [0, 200] }`. anyhowstep sends no CORS header, so its responses are opaque (Chrome counts each at about 7 MB of quota); `purgeOnQuotaError` keeps that from breaking the app. No `crossOrigin` attribute, to keep one code path.
- **CSP** (`vercel.json`): add `https://pumpout.anyhowstep.com https://raw.githubusercontent.com` to `img-src`. Dev doesn't enforce the header, so check it on a Vercel preview.
- **Weight**: pumpout cards average about 61 KB, so a first screen costs about 0.5 MB (grid, ~8 tiles) or 0.6 MB (list, ~10 rows), cached after that.

## Files

```text
New:
  src/apps/pump/components/SongArt.tsx
  src/apps/pump/components/ChartTile.tsx    grid tile (from GridPair)
  src/apps/pump/components/ViewToggle.tsx   header button
Modified:
  scripts/piu-data/pumpout.mjs              songCard by song ID → [host, file]
  scripts/piu-data/build.mjs, report.mjs    meta.imgHosts, song.i, art coverage line
  src/apps/pump/data/schema.ts, charts.json imgHosts, i
  src/apps/pump/data/catalog.ts (+test)     decodeCatalog → song.image
  src/apps/pump/lib/order.ts (+test)        pair rows per section
  src/apps/pump/store/usePumpStore.ts (+test)  view: 'grid' | 'list'
  src/apps/pump/components/ChartList.tsx    header | row | pair; keeps the first visible chart on switch
  src/apps/pump/components/ChartRow.tsx     art layer + icon pad (from RowD)
  src/apps/pump/components/ChartSheet.tsx   hero
  src/apps/pump/components/PumpHeader.tsx   ViewToggle on the Charts tab
  src/apps/pump/components/SkillTag.tsx     outline (already on the prototype branch)
  src/apps/pump/components/AboutDialog.tsx  credit: "Song art: Andamiro, via Pump Out and pumpout-db-updates"
  vite.config.ts, vercel.json               runtime cache, CSP
Removed (prototype only, never merged):
  src/apps/pump/prototype/, src/shared/ui/PrototypeSwitcher.tsx, scripts/piu-data/prototype-thumbs.mjs,
  the ?variant= wiring in PumpHome and ChartList
```

## Testing

Vitest, pure logic only, as in v1.

| Area | Tests |
|---|---|
| `pumpout.mjs` songCard | lowest `sortOrder` wins; deleted cards skipped; host rule for `Phoenix_` / `Phoenix2_` / other; unknown shape throws |
| `charts.json` (committed) | passes the schema; every `i[0]` is a valid host index; 669 / 669 songs have art (or the report's exception list matches); size ≤ 600 KB |
| `decodeCatalog` | `image` is host + file; no `i` → no `image` |
| `order.ts` pairing | pairs stay inside a section; an odd section ends with one tile; headers never inside a pair; index of the pair holding a given chart |
| `usePumpStore` | `view` defaults to grid; persisted; bad stored value → grid |

**Manual checks** (screenshots in the PR):
- 390×844, light, dark and a custom palette, both views: S and HD badges read on bright and dark art; skill tags read on the card and on the list's icon pad; line 2 reads where it meets the fade.
- Phone: switch views mid-list (same charts stay in view, choice survives a restart); fling a long list (no jumps, no blank flashes once cached); open a sheet and swipe between sibling charts; airplane mode after viewing some songs (seen art shows, unseen shows initials or no art); dim-room check of the dark theme.
- Vercel preview: no CSP errors in the console; images load from both hosts.
- Lighthouse mobile: INP ≤ 200 ms on chip taps, as in v1.

## Licensing

- The repo gains image paths, not image bytes. The About dialog credits Andamiro for the art and Pump Out / pumpout-db-updates for the paths.
- `pumpout.anyhowstep.com` is AnyhowStep's own server, and GitHub raw serves aaaaaa2493's repo; the aaaaaa2493 message asks about both. If the answer is no, those songs fall back to placeholders.

## Out of scope

- Official Andamiro files (the DrMurloc message asks about the mapping, for later).
- YouTube links, the other half of the Hub idea; not researched yet.
- Bundled or precached art, image resizing, blur-up previews.
- Art on the Titles tab.
