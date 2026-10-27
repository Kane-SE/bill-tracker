# Pump: song thumbnails (jacket art)

Research date: **2026-10-24**. I read every URL on that date with `curl` or WebFetch. For images I read only the headers plus the first 32 bytes, which give the PNG size. I downloaded six images in full to compare them by eye and by SHA-256; they're in the session scratchpad, not the repo. "Measured" means I ran it myself against the cached pumpout DB (`.cache/piu-data/pumpout-ed314a8.db`) or live URLs. Repo citations name a commit SHA and a file path.

Context: `feature/piu-charts`, 669 songs and 5,325 charts in `src/apps/pump/data/charts.json` (523 KB). Today rows have no images (research-ui §1.2: "Rows of 64 px with two lines and no images").

---

## 1. Summary and recommendations

**Answers**
- **The exact arcade image is served publicly by Andamiro, but you can't look it up by song.** P2 song pages on piugame.com use `https://piugame.com/data/song_img2/<32-hex>.png?v=<timestamp>`. Each is a **700×393 PNG** (16:9), 100–400 KB, sent with `Access-Control-Allow-Origin: *` and `Cache-Control: max-age=7200`. You can fetch the file without logging in. But the file name is an opaque hash, and the only pages that pair a hash with a song (leaderboards, "my best scores") need a login (§4.1).
- **pumpout already has an image for every Pump song.** The pinned DB has a `songCard` table, and all **669 of 669** Pump songs have a path in it (measured). 487 resolve on `pumpout.anyhowstep.com` and 182 in `pumpout-db-updates/img/` (measured, 669 HEAD requests). They are community frame grabs from YouTube videos, though, not Andamiro's file. They're 250 px wide, and the 487 older ones are **4:3 crops** of the 16:9 art (§4.2).
- **PIU Scores keeps byte-identical copies of the official images** on its own CDN (`piuimages.arroweclip.se/songs/<TitleAlnum>.png`). STAGER's two files have the same SHA-256. Guessing the URL from the title finds **538 of 608** unique Pump titles (measured). The full mapping is only in its token-gated API v2 (§4.3).
- **Licensing:** the art is Andamiro's (and artists') copyright, and piugame.com says "All rights reserved". Bundling copies into the public repo breaks the spec's "ship only derived facts" rule. A **song → image-URL mapping is a derived fact**; the image bytes are not (§5).

**Recommendations**
1. **Design: option B now, then A.** First a 16:9 hero image at the top of the chart sheet, which loads one image per tap. Then, if you want it, a **64×36 16:9 thumbnail in each row** with the row height kept at 64 px (§3). Skip a grid mode.
2. **Source: hotlink the official `song_img2` URLs at runtime, never bundle them.** Cache the images you have seen with a Workbox runtime cache, so they keep working offline. Show a generated placeholder (series colour + initials) when an image is missing or not cached yet. This is the only option that is *exactly* the arcade image while keeping image bytes out of the repo.
3. **The blocker is the hash → song mapping.** The cleanest way to get it is to **ask DrMurloc** (PIU Scores) whether Pump may use the song → image mapping from its data. Add the question to the permission message you haven't sent yet. If the answer is no, fall back to pumpout's `songCard` paths (community grabs, 100% coverage, same art but not the same file) or to placeholders only.
4. **Don't put images in `public/`.** The PWA's `globPatterns` already precaches every `png`, so 669 images would land in every install (§3.6).

---

## 2. Current state

| What | Where | Notes |
|---|---|---|
| Row | `src/apps/pump/components/ChartRow.tsx` | `ROW_HEIGHT = 64`. One `<button>`: `LevelBadge` (40×40), then title and line 2 (truncated), then up to 2 `SkillTag`s, a trophy and a gem |
| List | `src/apps/pump/components/ChartList.tsx` | `useWindowVirtualizer`, `estimateSize` fixed (header 32, row 64), `overscan: 8`. The comment says about 60 rows are in the DOM. Rows mount and unmount as you scroll |
| Chart sheet | `src/apps/pump/components/ChartSheet.tsx` | Shared `Dialog` bottom sheet. The header row is `LevelBadge` + title + Korean title + artist; facts and skill bars below. No image |
| Data shape | `src/apps/pump/data/schema.ts` | Song: `t, k, a, y, ch, se, bpm`. **No image or game-ID field.** Budget ≤ 600 KB (enforced) |
| Build | `scripts/piu-data/pumpout.mjs` (`readSongs`) | Reads `song`, `songTitle`, `songArtist`, `songCategoryVersion`, `songVersion`, `songBpm`. **Does not read `songCard` or `songGameIdentifier`** |
| pumpout image table | `songCard(songCardId, songId, path, sortOrder)` + `songCardVersion` in the pinned `.db` | 1,100 rows over 1,090 songs. Paths look like `/img/card/20.png`, `/img/card/B28.png`, `/img/card/Phoenix_STAGER.png`, `/img/card/Phoenix2_CALL_ME_BACK.png`. 6 Pump songs have 2 cards; `sortOrder` 0 is the first (measured) |
| In-game ID | `songGameIdentifier` | e.g. `504`, or `17XX_0001` placeholders for P1/P2 songs (research.md §3.2). It does not appear in any official image URL |
| PWA | `vite.config.ts` | `workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']`; no `runtimeCaching` |
| CSP | `vercel.json` | `img-src 'self' data: https://avatars.githubusercontent.com`. **Any remote image host must be added** or production blocks it |

Adding `img` to the song record would cost about 669 × (short key + 30–60 chars), roughly 25–45 KB. That fits the 600 KB budget (523 KB today), but not with much room to spare. An index into a shared prefix table keeps it smaller.

---

## 3. Design

### 3.1 How others present it (what I saw)

- **piugame.com (official)**: on the P2 "best scores" page each song is a card. The song image is the card's CSS `background-image`, and the song name and score sit on top of it (`<div class="in bgfix" style="background-image:url('https://piugame.com/data/song_img2/…png')">` … `<p>STAGER</p>`), in PIU Scores' saved fixture [`BestScores_Phoenix2_Page1.html`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.Tests.E2E/PiuGame/Fixtures/BestScores_Phoenix2_Page1.html). I did not see the live page because it needs a login.
- **The image itself** (viewed: STAGER, Come to Me, Iolite Sky) is a 16:9 title card: the song title is printed in the art, often with BPM and credits ("SONG BY BANYA", "COMPOSED BY DOIN"). So at thumbnail size the art partly does the title's job, but the printed text is unreadable below about 120 px wide.
- **PIU Scores** `/Charts`: one card per chart with the jacket, 114–136 px tall, about 5 per screen (research-ui §8). Its Discord share cards draw jackets 80 px tall ([`SkiaShareCardRenderer.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.Data/Clients/SkiaShareCardRenderer.cs) `JacketHeight = 80`).
- **maimai / DDR fan sites** use jacket grids (research-ui §8). Their jackets are square; PIU's are 16:9.
- **The cabinet**: unverified. I could not see a P2 song-select screen. Treat "the image on piugame.com = the image on the cabinet" as likely but unconfirmed (PIU Scores calls `song_img2` "the source Andamiro image": [`new-charts-json.md`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/docs/design/new-charts-json.md)).

### 3.2 Option A: 16:9 thumbnail in each row (row stays 64 px)

```text
┌──────────────────────────────────────────────┐
│ Lv 19 · 51                                   │ 32 px sticky header
├──────────────────────────────────────────────┤
│ ┌───────┐ ┌──┐ Iolite Sky                 ▣▣ │
│ │ art   │ │S19│ Doin · PRIME 2           🏆 │ 64 px
│ └───────┘ └──┘                               │
│  64×36    40×40                              │
├──────────────────────────────────────────────┤
│ ┌───────┐ ┌──┐ STAGER                     ▣  │
│ │ art   │ │D19│ … · PHOENIX                  │
└──────────────────────────────────────────────┘
```

- **Size**: 64×36 (16:9), `rounded-md`, `object-cover`. It fits inside the 64 px row with 14 px above and below.
- **Cost**: about 76 px of title width. At 390 px that leaves about 150 px for the title next to two skill tags, versus about 226 px today, so long titles truncate sooner. Alternative: **drop the separate badge and put the level on the image** (a 24 px pill in the corner, `bg-background/85`). That keeps the width, but the pill on busy art needs its own contrast check, and the spec says the mode must never be shown by colour alone (the pill still shows the letter).
- **Benefit**: recognition. The title printed in the art is unreadable at 64 px, but the colours and layout are memorable. You spot "the blue anime one" faster than you read "Iolite Sky".
- **One-handed use**: unchanged. The whole row is still one button, and the image is not a separate target.
- **Performance**: the virtualizer keeps about 60 rows mounted, so about 60 `<img>`s, about 10 on screen. Fixed `width`/`height` attributes mean no layout shift. Use `decoding="async"`. `loading="lazy"` adds little because off-screen rows aren't rendered anyway. Fast flings mount and unmount images, so cached files matter more than bytes on the wire.

### 3.3 Option B: hero image in the chart sheet only (rows unchanged)

```text
┌──────────────────────────────────────────────┐
│ ─── (grabber)                            ✕   │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │       16:9 art, full sheet width         │ │ ≈ 200 px tall at 358 px wide
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ ┌──┐ Iolite Sky                              │
│ │S19│ Doin                                   │
│ └──┘                                         │
│ Arcade · World Music · PRIME 2 · BPM 90      │
│ half ▓▓░░░  run ▓▓▓▓░ …                      │
└──────────────────────────────────────────────┘
```

- **Size**: full width × 16:9, about 358×201 at 390 px. The official 700×393 file is about 2× that, which is right for a 2× phone screen.
- **Cost**: it pushes the facts and skill bars down by about 210 px, which may push "Titles this chart unlocks" below the fold on short phones. Mitigation: cap the height at `min(201px, 28vh)`.
- **Requests**: one image per sheet you open. Switching to a sibling chart reuses the same song image.
- **Upside**: the printed title, BPM and credits are readable at this size. Near-zero list risk.

### 3.4 Option C: grid mode (2 columns of 16:9 tiles)

```text
│ Lv 19 · 51                                   │
│ ┌─────────────────┐ ┌─────────────────┐      │
│ │      art        │ │      art        │      │ ≈ 100 px tall tiles
│ │ S19        ▣▣   │ │ D19             │      │
│ └─────────────────┘ └─────────────────┘      │
│ Iolite Sky          STAGER                   │
```

- About 3 rows of 2 = 6 charts per screen, against about 10 today. The title, artist and series line no longer fit, and skill tags shrink.
- It needs a view toggle, virtualizer `lanes: 2`, and headers that span both columns. The DDR and maimai sites do this (research-ui §8), but research-ui §2.1 already rejected grids for a hunting task ("use a plain vertical list, or an image grid only when the category is narrow").
- **Not recommended** for v1.

### 3.5 States (all options)

| State | Show |
|---|---|
| Loading | A `bg-secondary` box at the final size. No spinner and no shimmer (reduced motion) |
| Loaded | Fade in over 120 ms, with `motion-reduce:transition-none` |
| Missing (no mapping) or offline and not cached | **Generated placeholder**: series-tinted background from tokens, plus the first 1–2 letters of the title. Same size, so nothing jumps. `aria-hidden` |
| Error (404, hash changed) | Same placeholder. Use `onError` → set a flag, and remember it for the session so the URL isn't retried on every mount |

- **Dark theme**: the art is often bright, as in the Come to Me card, so it glares in a dim room. Add a `ring-1 ring-border` and, in dark mode only, `brightness-90`. Check it on the phone in the dim-room check that's already planned.
- **Accessibility**: the image is decorative (`alt=""`), because the title is right next to it, and the hero image too.

### 3.6 Offline and PWA cost

| Approach | Weight | Notes |
|---|---|---|
| Precache bundled thumbnails (128×72 WebP) | 669 × about 4–6 KB ≈ **3–4 MB** (estimate, not measured) | Downloaded on install and on every image change. **Licensing blocks this** (§5) |
| Precache pumpout's 250 px PNGs as they are | 669 × 61 KB average (measured on the 203 `img/` files: 12.7 MB / 203) ≈ **41 MB** | Far too big |
| **Runtime cache, CacheFirst** (recommended) | Only what you've viewed. Official files are 100–411 KB each (measured: 111 KB, 319 KB, 411 KB); 669 of them would be about **150 MB** if you somehow viewed every song | Works offline for songs already seen. Set `expiration: { maxEntries: 700, maxAgeSeconds: 90 days }` and `cacheableResponse: { statuses: [0, 200] }` |

- The official files are 700 px PNGs, which is heavy for a 64×36 slot. You can't resize hotlinked images, so option A pays full size per row: about 10 rows × about 250 KB ≈ 2.5 MB on the first screen. That cost is the strongest argument for **B first**.
- Workbox: add a `runtimeCaching` entry matching the image host, with `handler: 'CacheFirst'`. Because the server sends `Access-Control-Allow-Origin: *`, set `crossOrigin="anonymous"` on the `<img>`. Responses are then non-opaque and the quota estimate is accurate. Opaque responses count as about 7 MB each against quota in Chrome. That is widely documented Workbox guidance; I did not re-check it today.
- **CSP**: add the image host to `img-src` in `vercel.json`. Dev does not enforce this header, so a missing entry only shows up in production.
- **Don't** put images in `public/`: the existing `globPatterns` include `png` and would precache them all.

### 3.7 Recommendation

**B, then A as a follow-up, once you've seen B on the phone.** B gives you the real arcade art where it's readable, costs one image per tap, and doesn't change the tuned 64 px list. A adds recognition while scanning, but with hotlinked 700 px files it costs about 2.5 MB per screen and narrows titles. Keep it optional (a "Show art in list" toggle in the Filters sheet's **More** section, off by default) until a thumbnail-sized source exists.

---

## 4. Sources

### 4.0 Table

| Source | Exact arcade art? | Size / format | Song → image mapping | Coverage of the 669 Pump songs | CORS | Stable URL? | Access | Terms |
|---|---|---|---|---|---|---|---|---|
| **piugame.com `song_img2`** (P2) | **Yes** (Andamiro's own file) | 700×393 PNG, 111–411 KB | Hash file name. Pairs appear only on **login-gated** pages | Unverified (expected: every P2 song) | `*` | Hash looks permanent, plus a `?v=` cache-buster that changes per patch (`v=20260903133210` = v1.01 day) | Image public; mapping login-only | Footer: "All rights reserved" |
| phoenix.piugame.com `song_img` (P1) | P1 version of the art | 700×393 PNG, 338 KB (one sampled) | Hash; login-gated | P1 songs only | `*` | P1 online service ended 2026-09-29 (research.md §3.1); host still answers | same | same |
| **PIU Scores CDN** `piuimages.arroweclip.se/songs/<Alnum>.png` | **Copy of the official file** (STAGER: same SHA-256) | 700×393 PNG | Guessable from the title; full map in API v2 (`ImageUrl`, token) | **538 / 608 unique titles** by guess (measured); about 88% | none sent | Set by its import tool; `-p2` suffix on name clashes | Public files, Azure blob | Code MIT; no data or image terms found |
| **pumpout `songCard`** → `pumpout.anyhowstep.com/img/card/…` | Same art, but a **4:3 crop**, from the old Pump Out site | 250×188 PNG | **Already in the pinned DB** (`songCard.path`) | 487 / 669 (measured) | none | Apache, `Last-Modified` 2016 for old cards; personal server | Public | None stated |
| **pumpout `songCard`** → `pumpout-db-updates/img/` | Same art, **frame grab from a YouTube video** | 250×141 PNG (`img/`), 1920×1080 (`img_big/`, 1.6 MB average) | Already in the DB | 182 / 669 (measured); together with the above, **669 / 669** | `*` (raw.githubusercontent) | Pinned by commit SHA | Public repo | Repo has no licence |
| PIU Scores CSV export | — | — | No image column (`ChartExport.cs` has none) | — | none | — | Public | — |
| pumpitup.fandom.com, namu.wiki | Not checked | | | | | | | |

### 4.1 piugame.com (Andamiro)

- **URL shape**: `https://piugame.com/data/song_img2/<md5-like>.png?v=<yyyymmddhhmmss>` on P2 pages, `https://phoenix.piugame.com/data/song_img/<hash>.png?v=…` on P1 pages. Seen in PIU Scores' saved official-page fixtures ([`BestScores_Phoenix2_Page1.html`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.Tests.E2E/PiuGame/Fixtures/BestScores_Phoenix2_Page1.html), [`RecentlyPlayed.html`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.Tests.E2E/PiuGame/Fixtures/RecentlyPlayed.html)).
- **Measured headers** (anonymous, with an `Origin` header): STAGER `…/07e7d5fd7daa31f830fea74250cc2186.png`: `200`, `image/png`, 111,237 bytes, 700×393, `Cache-Control: max-age=7200`, `Access-Control-Allow-Origin: *`, `Last-Modified: Wed, 01 Jul 2026`. Come to Me (`6ab521c3…`) 411,264 bytes; Iolite Sky (`f31f845b…`) 318,576 bytes, both 700×393.
- **All 16:9**, old songs included. Come to Me, a 1st-era BanYa song, is 16:9 on the official site, while pumpout has it at 4:3.
- **No public index.** The "Music List" page is two YouTube embeds (research.md §3.1). Anonymous requests to `/leaderboard/over_ranking.php`, `/top_songs.php` and `/pumbility_ranking.php` return the same 181 KB page with no `song_img2` in it (measured). PIU Scores' sweep script says: "P2 leaderboards are login-gated (anonymous traffic gets a marketing shell with 0 rows)", and it logs in with an owner-authorised account ([`rebuild-oracle.ps1`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/.claude/skills/check-new-charts/scripts/rebuild-oracle.ps1) lines 28–31, 129). Pump's spec puts "Signing in to piugame.com" out of scope.
- **Patch notes** embed only a YouTube thumbnail (`data/editor/thumb-…_Youtube_600x338.png` on [wr_id=349](https://www.piugame.com/phoenix2_notice?wr_id=349)), not per-song art.
- **Stable song ID → image?** No. The hash isn't the pumpout chart ID or `songGameIdentifier`. Whether it is a hash of something you could predict is unverified, and I didn't try.
- **AM.PASS**: PIU Scores' fixtures show the image URLs on piugame.com pages only. I found no separate AM.PASS image host.

### 4.2 pumpout (aaaaaa2493/pumpout-db-updates, plus the original Pump Out)

- The **`songCard`** table in the pinned `db/pumpout-phoenix-2-1.01.db` gives every Pump song a card path. Measured with `readPumpout(version 201)` joined to `songCard`: 669 / 669, with `songCardVersion` operations INSERT 1,964, REVIVE 6, CROSS 5, EXISTS 2, DELETE 1.
- **Where the paths live** (measured, a HEAD request for each of the 669):
  - 487 → `https://pumpout.anyhowstep.com/img/card/<file>`: 200; for these, the repo's `img/` is 404.
  - 182 → `https://raw.githubusercontent.com/aaaaaa2493/pumpout-db-updates/<sha>/img/<file>` (`Phoenix_*` / `Phoenix2_*`): 200; for these, anyhowstep is 404.
- **Provenance of the new ones**: the repo [README](https://github.com/aaaaaa2493/pumpout-db-updates/blob/ed314a8216f9c0dfe7cef29a1de5ce84ec4f1e44/README.md) steps 10 and "How to get images" say to copy images into `img_big` and `img` ("Files in `img` folder should be 250px in width or less"). The images come from "content update teaser videos from [the] Official YouTube channel" via `yt-dlp` + `ffmpeg -ss … -vframes 1`, with the NEVSISTER channel as a fallback. **So these are video frames, not Andamiro's image file.** STAGER compared: the same art as the official file, with a different hash (frame plus downscale).
- **Old cards** (anyhowstep): 250×188 (4:3), `Last-Modified` 2016 for `20.png`. They are centre crops of the art the official site now serves at 16:9 (compared: Come to Me, Iolite Sky). Where the original Pump Out got them is unverified.
- Licence: none (`license: null` from the GitHub API). The repo tree has 203 `img/` files (12.7 MB) and 203 `img_big/` files (337.6 MB) (measured).

### 4.3 PIU Scores (DrMurloc/PumpItUpScoreTracker @ `94522db`, 2026-10-18)

- **Where its images come from**: the official site. For new P2 songs the admin import takes "the source Andamiro image (`song_img2/…`)" and copies it "to the CDN … `piuimages.arroweclip.se/songs/<NameLettersAndDigits>.png`", with a `-p2` suffix when the name is already taken ([`docs/design/new-charts-json.md`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/docs/design/new-charts-json.md), `imageUrl` row). Older songs: `UpdateSongImagesCommand` reads the image off the P1 official leaderboard entries and calls `CopyFromSource` ([`OfficialLeaderboardSaga.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.OfficialMirror/Application/OfficialLeaderboardSaga.cs) lines 434–456: "sourced from the Phoenix 1 site until the Phoenix 2 new-content admin workflow lands"). The host is set in [`AzureBlobFileUploadClient.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker.Data/Clients/AzureBlobFileUploadClient.cs).
- **Verified copy**: `piuimages.arroweclip.se/songs/STAGER.png` and the official STAGER `song_img2` have the same SHA-256 (`21aee1b5…`).
- **Name rule**: `[^a-zA-Z0-9]` removed from the song name (`OfficialLeaderboardSaga.cs` line 432). Applied to Pump's 608 unique titles: 538 hits, 68 misses, 2 timeouts (measured). Misses include titles that differ from PIU Scores' spelling (e.g. `BecouseofYou`, `CanonDFULLSongMIX`), songs added after the import, and `-p2` variants. The mapping should come from PIU Scores' data, not from guessing.
- **API**: v2 returns `ImageUrl` per song and chart ([`CatalogDtos.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/94522db71594c4642c927ddf5b11517c1307889a/ScoreTracker/ScoreTracker/Dtos/ApiV2/CatalogDtos.cs) lines 52, 110), but it needs an account token (research.md §3.3). The public CSV export has no image column.
- **CORS**: the CDN sends no `Access-Control-Allow-Origin` (measured). That's fine for `<img>`, but Workbox would store opaque responses.
- **Bandwidth**: the CDN is DrMurloc's Azure blob, so egress costs him money. Don't hotlink it without asking.

---

## 5. Licensing (facts and trade-offs, not legal advice)

**Facts**
- piugame.com footer: "Copyright (C) Andamiro Co., LTD. All rights reserved. Use of this website signifies your agreement to the Terms of Use" (research.md §3.1, re-read today). A terms page exists at `/bbs/content.php?co_id=provision` (title "서비스 이용약관", Terms of Service). Its body, as served to an anonymous client, has no clause text, only shop chrome and "Copyright © 2001-2013 (주)안다미로|Andamiro. All Rights Reserved.". **I found no clause that permits or forbids hotlinking or reusing song images.**
- The art is Andamiro's, and artists' and licensors' for licensed songs. Iolite Sky's card credits "ILLUSTRATED BY RK".
- Pump's spec: "The repo only gains derived facts … no step data". The repo is public (`Kane-SE/bill-tracker`, per `permission-messages.md`).
- Neither the pumpout repo (`license: null`) nor PIU Scores (MIT for code only) grants any rights to the images. Neither could, since they aren't the owners.

**Options**

| Option | Exact art? | Image bytes in repo or app bundle? | Offline | Risks |
|---|---|---|---|---|
| 1. **Hotlink official `song_img2`**, mapping from PIU Scores (with permission) | Yes | No, only the URL list (a derived fact) | Songs already viewed (runtime cache) | Relies on Andamiro's server and its `?v=` scheme; the hash could change after a patch, so a rebuild picks up new URLs. Hotlinking puts load on Andamiro's server (small for one user). Terms are silent. Needs a CSP change |
| 2. Hotlink the PIU Scores CDN | Yes (copy) | No | Viewed only | DrMurloc's egress bill; needs his OK. Opaque responses (no CORS) |
| 3. Hotlink pumpout cards (anyhowstep + GitHub raw) | Same art, not the same file; 4:3 for 487 songs | No | Viewed only | Two hosts, one a personal 2016 Apache box. GitHub raw isn't meant to be a CDN. The mapping is already in the pinned DB, so it's covered by the existing pumpout permission request if you mention it |
| 4. **Bundle copies** (thumbnails in `public/` or the repo) | Yes or close | **Yes**, redistributed in a public repo and every install | Full | Directly contrary to the "derived facts only" stance; it's the one option that copies Andamiro's art into your repo. Needs Andamiro's permission, not just the maintainers' |
| 5. **Generated placeholders only** | No | No | Full | None. It's the fallback for every option anyway |
| 6. Ask Andamiro | — | — | — | No obvious contact for this; there's a 1:1 inquiry (1:1문의) link on the site. A slow or no answer is likely (unverified) |

**Comparison with the existing stance**: options 1–3 keep the stance (the repo gains a URL per song, which is a derived fact, and the phone fetches the image the way a browser visiting piugame.com would). Option 4 breaks it. Option 1 is the only one that's both exact and keeps image bytes out of the repo.

---

## 6. Open questions for you

1. **Placement**: B (sheet hero) only, or B + A (row thumbnails)? If A, should it be off by default behind a toggle while the source is full-size 700 px PNGs?
2. **Exactness vs certainty**: is pumpout's community grab (same art, 4:3 for old songs, 100% coverage, mapping already in hand) acceptable if PIU Scores says no? Or do you want official-only, with placeholders where it's missing?
3. **Permission message**: add a line to the DrMurloc draft asking to use PIU Scores' song → image URL mapping (and whether hotlinking `piuimages.arroweclip.se` is OK, or only the official URLs)? And a line to the aaaaaa2493 draft mentioning `songCard` paths if option 3 is the fallback?
4. **Offline**: is "art appears offline only for songs you've already opened" fine at the arcade? The alternative (bundling) is the option that copies art into the repo.
5. **Hero height**: cap it at about 28vh so the titles section stays visible on short phones?
6. **Cabinet check**: next time at the machine, does the P2 song select show the same image as piugame.com (e.g. Iolite Sky with "2nd CONTENTS CREATION CONTEST" in the corner)? That's the one claim here I could not verify.

## Sources I could not fully access

- piugame.com leaderboards and "my best scores": login only. I relied on PIU Scores' saved fixtures and scripts.
- The piugame.com Terms of Service body (empty for an anonymous client).
- PIU Scores API v2 (token) and its Blazor UI (images aren't in the server HTML).
- A P2 cabinet song-select screen.
- pumpitup.fandom.com and namu.wiki images: not checked.
