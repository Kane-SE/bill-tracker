# PIU chart filter: data sources

Research date: **2026-10-08**. Re-verified on **2026-10-13** (§6). Every URL below was fetched on 2026-10-08 unless the text says otherwise. Repo citations name the commit SHA and file path. "Primary" means official Andamiro material, or the actual data or code. "Community" means a wiki or fan site.

Scope: charts playable in FIESTA, FIESTA EX, FIESTA 2, INFINITY, PRIME, PRIME 2, XX, (MOBILE EDITION), PHOENIX and PHOENIX 2 (current version: P2 v1.01.0, released 2026-09-03).

---

## 1. Answer first

- **Best single source for song and chart facts across versions: [`aaaaaa2493/pumpout-db-updates`](https://github.com/aaaaaa2493/pumpout-db-updates).** At `ed314a8` (2026-09-05) it ships one SQLite file per patch, up to `db/pumpout-phoenix-2-1.01.db`. It is the community "Pump Out" database (Haru-kaze/AnyhowStep), carried on through PHOENIX 2. Its first file, `db/pumpout-xx-2.08.db`, is byte-identical to AnyhowStep's last public dump (§3.2). It covers:
  - song type (cut) and category, with BPM
  - each song's first version, plus every INSERT, DELETE and REVIVE per patch
  - each chart's level at every patch where it changed
  - mode: S, D, Co-Op, Half-Double (HDB), Performance, Routine
  - step artists
  - labels: PREMIUM MODE EXCLUSIVE (172 live P2 charts) and STEAM LINK EXCLUSIVE (878). HIDDEN and UCS exist only as history; no live P2 chart carries them _(corrected 2026-10-13: "labels: HIDDEN, UCS, PREMIUM MODE EXCLUSIVE, STEAM LINK EXCLUSIVE", as if all four flag current charts)_
  
  There is no licence.
- **Re-rates from PHOENIX to PHOENIX 2: 338 charts** in pumpout. I checked this against an independent source: arcade observations of the P2 Difficulty Zone in [`khal1234/pump-zone-order`](https://github.com/khal1234/pump-zone-order). The two agree on **2,820 of 2,822** P2 arcade S/D charts where the song titles matched _(corrected 2026-10-13: 2,273 of 2,274)_ (§3.8). PIU Scores' public [Mix Changes page](https://piuscores.arroweclip.se/MixChanges/phoenix/phoenix-2) shows the same 338 re-rated and 20 left. Its 35 "arrived" differs from pumpout's 44 added: PIU Scores has no HDB charts (15 RISE songs have only HDB charts), and it also counts the 6 v1.01 songs _(corrected 2026-10-13: "shows the same counts: 338 re-rated, 35 arrived, 20 left")_. It is not independent, though, because PIU Scores credits Pump Out for its chart data.
- **Official data (piugame.com) is not machine-readable and is partly login-only.** The patch notes are public HTML. For each new song they give title, artist, BPM, category and chart levels, and they sometimes mention re-rates or gimmick edits. The "Music List" page is just two YouTube embeds. The titles page and the leaderboards require a login.
- **Official chart→skill mapping: confirmed, but small.** PHOENIX (P1) had skill-title ladders [RUN], [TWIST], [BRACKET], [HALF], [GIMMICK] and [DRILL], 10 charts each, each needing "SSS Grade or more" on one named chart. PHOENIX 2 changed the ladders to nine tracks of 10: TWIST S, TWIST D, RUN S, RUN D, DRILL, GIMMICK, **SLOW**, HALF and BRACKET, which makes **90 charts**. This is an exemplar list, not a catalogue-wide tag. The primary page (`piugame.com/my_page/title.php`) is login-only, so I verified the list through community copies (§3.7) _(corrected 2026-10-13: cross-reference "§4")_.
- **Best skill tags: a piucenter-format snapshot that already includes PHOENIX 2.** [`DrMurloc/PiuScoresStepfiles`](https://github.com/DrMurloc/PiuScoresStepfiles) at `0f551b5` (2026-09-28) contains `snapshots/piucenter-snapshot-092326.zip`. It covers 4,641 official charts (P1 ∪ P2, including 218 P2-pack charts). Each chart carries its top 3 skills plus per-segment skill badges. Gotcha: levels for charts that existed before P2 are still **PHOENIX 1 levels** (§3.4).
- **Public no-login P2 export with levels and skills:** <https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2>. It has 4,675 rows. The default columns are Song, Type, Level, NPS, Badges and PassDifficulty. A `Columns=` parameter adds more, still without a login: `ChartId`, `Artist`, `StepArtist`, `SongType`, `Channel`, `BPM`, `DebutMix`, `DebutVersion`, `AddedInVersion`, and per-skill segment coverage (`SkillEmphasis` → 29 `pc:badge_fraction:*` columns) (§3.3). So the token-only API v2 is not needed for song type, channel, debut or skill coverage _(corrected 2026-10-13: "The richer API v2 adds `debutVersion`, `addedInVersion`, `channel`, `songType` and skill coverage, but it needs a PIU Scores account token")_. It sends no CORS headers, so a browser app cannot fetch it directly (§6.4).
- **Half:** detectable mechanically. In the community `.ssc` files, `#STEPSTYPE:pump-halfdouble` marks a Double chart that only uses the middle 6 panels (143 of the 4,641 charts). P2 also has a separate Half-Double *mode* (HDB, 790 charts, Steam-link only), which pumpout labels.
- **Run / twist / bracket:** well covered by piucenter skill tags. Use segment-level coverage, not just the top-3 summary (§4).
- **Biggest gap: gimmick.** No source tags gimmicks catalogue-wide; piucenter has no gimmick tag. Deriving it naively from `.ssc` timing tags flags 62% of charts, because the converted files use `#BPMS`/`#SCROLLS` tricks to emulate PIU's own timing. A better heuristic still flags 22 of 40 non-gimmick title charts. Gimmick needs a curated seed (the official GIMMICK and SLOW title charts) plus a validated derivation.
- **Licensing is the second gap.** None of the data repos has a licence. Andamiro's site says "All rights reserved". The Resistance asks that its `.ssc` packs not be redistributed. Ship only factual metadata that your own scripts derive, and ask the maintainers for permission (§5).

---

## 2. Coverage matrix

Legend: ✅ = has it · ◐ = partial or with caveats · ❌ = no · — = not applicable.

| Source | Kind | Song type | Debut version | Levels per version | P2 coverage | Skills | Gimmicks | HD | HIDDEN / unlock | UCS / co-op detect | Step artist | Category | Access | Freshness | Licence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| piugame.com patch notes | primary | ◐ (only via name, e.g. "- SHORT CUT -") | ◐ (new songs per patch) | ◐ (new charts; occasional re-rate) | ✅ v1.00–v1.01 | ❌ | ◐ (mentions gimmick edits) | ◐ (HD channel noted) | ◐ (Premium-mode marks) | ◐ (CO-OP listed) | ❌ | ✅ | public HTML | P2 v1.01.0 (2026-09-03) | "All rights reserved" |
| piugame.com titles page | primary | — | — | — | ✅ | ◐ (90 title charts) | ◐ (GIMMICK/SLOW titles) | ◐ (HALF titles) | — | — | — | — | **login only** | live | "All rights reserved" |
| pumpout-db-updates (SQLite) | community data | ✅ (`cut`) | ✅ | ✅ (every patch from 1st to P2 1.01) | ✅ incl. HDB | ❌ | ❌ | ✅ (mode HDB; the HALF-DOUBLE label is pre-Prime history) _(corrected 2026-10-13: "mode HDB, label HALF-DOUBLE")_ | ◐ (PREMIUM and STEAM LINK live; HIDDEN and UNLOCK REQUIRED are history only) _(corrected 2026-10-13: ✅)_ | ◐ (Co-Op mode ✅; UCS label on 52 historic charts, none live in P2) | ✅ (100% S/D/Co-op in P2; 0% HDB) | ✅ (P2 J-MUSIC stale) | git raw / release | 2026-09-05 | none |
| PIU Scores CSV export _(corrected 2026-10-13: song type ◐, debut ❌, step artist ❌, category ❌)_ | community app | ✅ (`SongType` via `Columns=`) | ✅ (`DebutMix`, `DebutVersion`, `AddedInVersion`) | P2 only (or P1) | ✅ (no HDB) | ✅ (3 badges; coverage via `SkillEmphasis`) | ❌ | ❌ | ❌ | ◐ (CoOp rows) | ✅ (`StepArtist`) | ✅ (`Channel`) | public CSV, no CORS | live | none stated (code MIT) |
| PIU Scores API v2 | community app | ✅ | ✅ | ✅ (per mix) | ✅ | ✅ (with coverage) | ❌ | ? | ? | ? | ? | ✅ | **token (account)** | live | none stated |
| PiuScoresStepfiles snapshot | community data | ✅ | ◐ (pack = origin series) | ❌ (pre-P2 charts carry P1 levels) | ◐ (218 P2-pack charts; no HDB) | ✅ (top-3 + segment badges) | ❌ (raw `.ssc` timing only) | ✅ (`pump-halfdouble`) | ◐ | — (official only) | ✅ (`CREDIT`) | ✅ (`SONGCATEGORY`) | git raw zip (34 MB) | 2026-09-23 | none |
| rayden-61/PIU-Simfiles (`.ssc`) | community data | ✅ `#SONGTYPE` | ◐ (folder) | ❌ (single snapshot) | ◐ (new P2 songs only, "ac mix only") | ❌ | ◐ (raw timing tags) | ✅ | ◐ (`#DESCRIPTION` "HIDDEN") | ✅ (`#DESCRIPTION` UCS, DP COOP; `pump-routine`) | ✅ | ✅ | git raw | 2026-09-20 | none |
| piucenter.com / piu-vis-ss | community | ✅ | ◐ (pack) | ❌ | ❌ (P1 v2.12) | ✅ | ❌ | ◐ | ❌ | — | — | — | HTML + git | 2026-05-07 | none |
| khal1234/pump-zone-order | community observation | ❌ | ✅ (series zone) | P2 only | ✅ v1.00 (no v1.01) | ❌ | ❌ | ❌ | ❌ | ◐ (co-op channel file) | ❌ | ✅ (KPOP/ORIGINAL/…) | git raw CSV | 2026-09-22 | MIT for scripts; data "facts", © Andamiro |
| pumpitup.fandom.com | community wiki | ✅ | ✅ | ◐ | ◐ (list only) | ❌ | ❌ | ❌ | ◐ (unlock rules) | ◐ | ✅ | ✅ | MediaWiki API | low activity | CC-BY-SA |
| Zenius -I- vanisher | community | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | HTML | — | — |
| namu.wiki, moegirl | community wiki | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | **blocked** (Cloudflare / 403) | ? | CC BY-NC-SA (not verified) |

---

## 3. Sources

### 3.1 piugame.com (Andamiro): primary

| What | Where | Notes |
|---|---|---|
| Patch notes (PHOENIX 2) | <https://www.piugame.com/phoenix2_notice?sca=update> | HTML (gnuboard). Each new song lists Title / Artist / BPM / **Category** / "Step charts : S1, S3 … D22, CO-OP (X2)". Example: [P2 v1.01.0](https://www.piugame.com/phoenix2_notice?wr_id=349) (2026-09-03), 6 songs, including "L (PIU Edit) (*Premium Mode Exclusive)". |
| Patch notes (PHOENIX) | <https://www.piugame.com/phoenix_notice> (redirects to `phoenix.piugame.com`) | v1.01.0 to v2.12.0. All P1 update notes, v1.01.0 (wr_id=214) to v2.12.0 (wr_id=318), are also listed on the PHOENIX 2 board (`phoenix2_notice?sca=update`, 2 pages), which is why links below use `phoenix2_notice`. Plus [v2.13.0 final](https://www.piugame.com/phoenix_notice?wr_id=340) (2026-09-23): online service ends 2026-09-29, and the 18 Premium-only songs become normal songs. |
| Re-rates and gimmick edits (occasional) | [P v2.00.0](https://www.piugame.com/phoenix2_notice?wr_id=258) (2024-05-27) | "This is a difficulty change from D24 to D25" (Conflict). Also "Some gimmicks will be removed" (Gothique Resonance S21/D21, Yog-Sothoth D25, …) and "Some gimmicks will be restored" (Tepris, Necromancy, …). There is **no** list of P1→P2 re-rates. |
| Removals | [2.09.1 hotfix](https://www.piugame.com/phoenix2_notice?wr_id=301) (2025-05-30) | Autumn Break removed. The P2 v1.01.0 notice warns that licensed songs "may be removed … once their respective licensing agreements expire". |
| P2 release | [wr_id=336](https://www.piugame.com/phoenix2_notice?wr_id=336) | Korea 2026-07-09, global 2026-07-20. |
| Channels / categories | <https://www.piugame.com/game_info/full_mode.php> | P2 channels: New Tunes; K-POP, Original, World Music, Xross; Short Cut / Remix / Full Song; CO-OP (Premium only); Online Matching; UCS; Difficulty Zone Single, Double and **H Double "(Steam Link Required)"**; an ARCADE/RISE step-type switch and a "RISE Vol. 1" channel, both "(Steam Link Required)" _(corrected 2026-10-13: the list left out New Tunes, Online Matching, the Single/Double zones and the two RISE entries)_. Series Zone channels: 1st~ZERO, NX~NXA, FIESTA~FIESTA 2, PRIME, PRIME2, XX, PHOENIX, PHOENIX 2. There is no J-Music channel. |
| Music list | <https://www.piugame.com/game_info/music_list.php> | Only two YouTube embeds. No data, and no JSON in the page's scripts. |
| Titles | `/my_page/title.php` | Redirects to login ("Please try again after logging in."). Not accessed. |
| Title transfer P1→P2 | [wr_id=338](https://www.piugame.com/phoenix2_notice?wr_id=338) (2026-07-13), [image](https://www.piugame.com/data/editor/20260713165745_0022_KakaoTalk_20260713_165332331.png) | Difficulty titles (INTERMEDIATE, ADVANCED, EXPERT, THE MASTER) and gamer-rank titles carry over as "[LEGACY] …". Membership titles become "[PHOENIX] … MEMBER", and four event titles carry over unchanged _(corrected 2026-10-13: "Only difficulty, rank and membership titles carry over as "[LEGACY] …"")_. No skill titles carry over. An official P2 screenshot ([`/l_img/p2/05_title_2.png`](https://www.piugame.com/l_img/p2/05_title_2.png)) shows "[THE 2ND] BOSS BREAKER", so chart-specific titles still exist in P2. |
| Leaderboards | `/leaderboard/top_songs.php`, `/leaderboard/over_ranking.php` | Login only. |
| Old PHOENIX site | `phoenix.piugame.com` | Still up. A client without cookies loops through the am-pass SSO redirect and ends on a 404. With a cookie jar the home page and the P1 notice board load, and `/my_page/title.php` redirects to login _(corrected 2026-10-13: "Returns 404 through an SSO redirect")_. |

- **Reliability:** this is the authority for new songs, new charts and categories. Spot-check: CALL ME BACK's 11 charts in the v1.01.0 note match pumpout, PIU Scores and the PSS snapshot exactly.
- **Licence:** the footer says "Copyright (C) Andamiro Co., LTD. All rights reserved. Use of this website signifies your agreement to the Terms of Use". No Terms page is linked.
- **Gotcha:** the notes are inconsistent. Category case varies ("Xross" vs "XROSS"), and premium/notes text sits inside the title.
- **Gotcha:** every piugame.com page answers a cookie-less client with an SSO redirect loop. Fetch with a cookie jar (`curl -c jar -b jar -L`). This is a session cookie, not a login or bot check.

Andamiro also publishes on YouTube ([@PUMPITUPOfficial](https://www.youtube.com/@PUMPITUPOfficial)), X (@piu_global) and Discord. The pumpout maintainer uses the YouTube song-intro videos as the source for step artists (README step 4). I did not examine these channels further.

### 3.2 pumpout-db-updates: community data (strongest backbone)

**Location:**
- <https://github.com/aaaaaa2493/pumpout-db-updates> @ `ed314a8216f9c0dfe7cef29a1de5ce84ec4f1e44` (2026-09-05, "Add Phoenix 2 1.01 patch").
- `db/pumpout-phoenix-2-1.01.db` (9.0 MB SQLite), plus one `.db` per patch from `pumpout-xx-2.08.db` to the present.
- `sql/*.sql` holds per-patch deltas. `data.py` is hand-entered from the patch notes.
- Also available as a release asset: `releases/download/Phoenix-2-1.01/pumpout-phoenix-2-1.01.db`.

**Lineage:** the original Pump Out site is <https://pumpout.anyhowstep.com/>. Its dumps are at [`AnyhowStep/pump-out-sqlite3-dump`](https://github.com/AnyhowStep/pump-out-sqlite3-dump) (last push 2022-05-27, XX era). That README says "almost all of the data entry is now done by Haru-kaze" _(corrected 2026-10-13: quoted as "mostly done by Haru-kaze")_ and explicitly invites others to "take the data, make a better search tool". The lineage is exact: pumpout-db-updates' first file, `db/pumpout-xx-2.08.db`, is byte-identical to that repo's last dump, `dump/pumpout-2022-05-26-20-56-1653612171279.db` (7,651,328 bytes, SHA-256 `78e7ff36…`).

**Process** (README): copy the piugame.com patch notes → `patchnote_parser.py` → `data.py` → SQL → apply to the previous `.db`. Step artists and Korean titles come from the official YouTube channel.

**Schema highlights**, from tables in the `.db`:

| Need | Table(s) |
|---|---|
| Song type | `song.cutId` → `cut` (Short Cut / Arcade / Remix / Full Song) |
| Category | `songCategory` (+ `songCategoryVersion`) → `category` (K-POP, WORLD MUSIC, ORIGINAL, J-MUSIC, XROSS, RISE) |
| BPM | `songBpm` (min/max only; no change points) |
| Debut, removals, revivals | `songVersion` / `chartVersion` with `operation` INSERT / DELETE / UPDATE / EXISTS / REVIVE / CROSS. `version` → `mix` covers 1st … Phoenix 2, including Fiesta v1.01–v1.20, Infinity, Prime JE and Phoenix v1.00.1–v2.12.0. |
| Level history | `chartRatingVersion` → `chartRating` (mode + difficulty). Each row is a level at the version where it took effect. |
| Mode | `mode`: Single, Double, SP, DP, Co-Op, Routine, **Half-Double (HDB)** |
| Flags | `chartLabel` (+version) → `label`: UCS, HIDDEN, UNLOCK REQUIRED, HALF-DOUBLE, PREMIUM MODE EXCLUSIVE, STEAM LINK EXCLUSIVE, UPDATED, region exclusives, old mix labels |
| Step artist | `chartStepmaker` → `stepmaker` |
| Game ID | `songGameIdentifier` (in-game song ID, e.g. Mopemope `16B1` = the `.ssc` folder ID. P1/P2-era songs use placeholders like `17XX_0017`.) |

**State at P2 v1.01.0**, as I computed it with `_derived_versionAncestor`: 669 songs, 5,465 charts.
- By mode: S 2,752 · D 1,783 · HDB 790 · Co-Op 140.
- By cut: 552 Arcade · 62 Short Cut · 38 Remix · 17 Full Song.

At Phoenix v2.12.0: 639 songs, 4,571 charts.

From P1 v2.12.0 to P2 v1.00.0:
- 338 charts re-rated: +1 ×294, −1 ×35, +2 ×8, −2 ×1.
- 20 songs removed. All 20 are K-POP, e.g. BOCA, TOMBOY, Queencard and CRUSH _(corrected 2026-10-13: "Most are licensed K-pop")_.
- 44 songs added: 19 arcade-mix songs and 25 RISE songs. 15 of the RISE songs have only HDB charts.

**Reliability checks:**
- P2 levels: 2,820 of 2,822 agree with independent arcade observations (§3.8) _(corrected 2026-10-13: 2,273 of 2,274, with "the one disagreement 1949 D28 (pumpout) vs D27 (observed)"; D27 there is the zone's "RANDOM DOUBLE 27 OVER" folder, so 1949 agrees)_. The two left: U Got Me Rocking D6 (pumpout, re-rated from D5 in P2 v1.00) vs D5 observed, and 1948's top D chart, which pumpout stores with level "??" (PIU Scores: D29).
- Debut version: 376 of 376 matched Arcade songs agree with the in-game Series Zone once Prime JE and Infinity map to PRIME _(corrected 2026-10-13: 319 of 321, the 2 exceptions being that mapping)_.
- 4,652 of 4,653 title-matched rows of the PIU Scores P2 export agree; the exception is 1948 D29 vs pumpout "??" _(corrected 2026-10-13: 4,365 of 4,365)_. PIU Scores credits Pump Out, so that is not an independent check.
- The official P v2.00.0 note "Conflict D24→D25" is reflected.

**Gotchas:**
- Category is stale for P2: 12 songs are still `J-MUSIC`, but P2 has no J-Music channel.
- No BPM change points.
- No v2.13.0 (the P1 final update).
- HDB charts have no step artists.
- UCS is only a label on 52 historic charts, and none is live at P2 v1.01. The same holds for HIDDEN (111 historic charts), UNLOCK REQUIRED and HALF-DOUBLE. Arcade UCS is not modelled.
- One chart has no level: 1948's D chart is difficulty "??" (`difficulty.value` NULL).
- Titles differ from other sources: "Phalanx" vs `Phalanx "RS2018 Edit"`, "Meteo5cience" vs "Meteo5cience (GADGET mix)". You will need an alias table.

**Licence:** none (GitHub API `license: null`).

### 3.3 PIU Scores (piuscores.arroweclip.se): community app with public export and token API

The site is a community score tracker. Its code is [`DrMurloc/PumpItUpScoreTracker`](https://github.com/DrMurloc/PumpItUpScoreTracker) (MIT) @ `78499c485f2144e3d163607b701b7f2a8575e327`. The [About page](https://piuscores.arroweclip.se/About) says: "Mix, Song, and Chart information provided by the wonderful team of Pumpout."

**Public CSV, no login:** `GET https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2`.
- 4,675 rows with default columns `Song,Type,Level,NPS,Badges,PassDifficulty`. Type is S 2,752, D 1,783, CoOp 140, the same counts as pumpout at P2 v1.01. HDB is absent.
- More columns, no login: the endpoint ([`ChartsExportController.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker/Controllers/ChartsExportController.cs), [`ChartExport.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker/Services/ChartExport.cs)) takes `Columns=` with any non-`My*` key. Tested anonymously on 2026-10-13: `Columns=ChartId,Song,Type,PlayerCount,Level,Mix,DebutMix,AddedInVersion,DebutVersion,Debut,SongType,Channel,Artist,StepArtist,BPM,NoteCount,Badges` returns all 4,675 rows. `ChartId` is a GUID. `Channel` uses the four P2 channels (Original, World Music, Xross, K-Pop). `StepArtist` is blank on 75 rows. The `SkillEmphasis` bundle works too (the other five bundles were not tried): it adds 29 `pc:badge_fraction:<skill>` columns (segment coverage, 0–1).
- No CORS: the response has no `Access-Control-Allow-Origin`, and an `OPTIONS` preflight gets 405.
- Without `mix`, or with `mix=Phoenix`, you get P1 (4,571 rows). Without `mix` the server uses the visitor's selected mix, which is Phoenix for an anonymous call.
- Badges are the 3 piucenter skills, e.g. "Brackets; Bracket Twists; Staggered Brackets". 238 rows have none: all 140 CoOp rows, and 98 S/D rows (87 from the 10 RISE songs, 5 from PRiMA MATERiA - SHORT CUT -, 6 others).
- Levels are P2 levels: Acquire S21, BOOOM!! S12, Conflict D13.
- Gotchas: NPS repeats across charts of one song (e.g. Conflict 10.7 on 7 charts), so treat it as suspect. The default columns have no song type, version or category; ask for them with `Columns=` _(corrected 2026-10-13: "There are no song-type, version or category columns")_. The CSV has quoted titles containing commas (16 rows). PassDifficulty is community-voted and drifts: 345 P2 rows changed between 2026-10-08 and 2026-10-13.

**API v2** ([docs/API.md](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/docs/API.md), Swagger at `/swagger/v1/swagger.json`):

| Route | What you get |
|---|---|
| `api/v2/charts` | level, `songType`, `channel`, `addedInVersion`, `debutVersion`/`debutedOn` (first appearance anywhere), `originalMix` |
| `api/v2/charts/skills` | piucenter skill analysis with coverage |
| `api/v2/versions` | patches with dates |
| `api/v2/channels` | "Phoenix 2 lists four, having folded J-Music into World Music" |
| `api/v2/tier-lists/{list}` | tier lists |

Coverage: 30+ mixes. Rate limit: 600 requests/minute. Every route is behind `security: basic|toolKey` in Swagger. I confirmed that an anonymous call to `/api/v2/mixes` returns **401**. A token comes from an account's Account page. I did not create one (rules).

**Mix Changes page:** <https://piuscores.arroweclip.se/MixChanges/phoenix/phoenix-2>, public. "Re-rated 338 / Arrived 35 / Left 20 / Note Counts 22", browsable by level folder. Arrived 35 = 19 arcade-mix songs + 10 RISE songs with S/D charts (v1.00) + 6 v1.01 songs, from a song-title diff of the P1 and P2 CSVs. XX→Phoenix: 722 re-rated / 195 arrived / 395 left. There is no export. It is a Blazor UI.

**Title lists, in code, MIT:**
- [`ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix/PhoenixTitleList.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix/PhoenixTitleList.cs): P1 skill ladders.
- [`…/Titles/Phoenix2/Phoenix2TitleList.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix2/Phoenix2TitleList.cs): "all 272 titles scraped from the live my_page/title.php (2026-07-09, authenticated crawl; requirement text preserved verbatim)".

**Retired hand tags ("Chabala"):** [`ChabalaSkillNames.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Catalog/Domain/ChabalaSkillNames.cs).
- The vocabulary includes **Twists, HalfDouble, Brackets, Runs, Gimmicks**, Drills and more.
- The tags are frozen ("never written again") and appear only in the UI under "Ranked by: Chabala" ([design doc](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/docs/design/nuke-old-skill-categories.md)).
- They are not in the CSV or API. Coverage is unknown and not verified.

**Licence:** the code is MIT. No data licence or terms page was found (`/Terms` returns 404; `/Privacy` exists).

### 3.4 PiuScoresStepfiles: community data (P1 ∪ P2 piucenter snapshot)

**Location:** <https://github.com/DrMurloc/PiuScoresStepfiles> @ `0f551b5b4af9d6e7ea2c2741c56b98337cadfecb` (2026-09-28).
- `snapshots/piucenter-snapshot-092326.zip` (34,185,826 bytes): 4,641 chart JSONs, `page-content/{chart-table,stepchart-skills,tierlists}.json` and `stepfiles/` (the 664 `.ssc` files; one, `CO5M1C R4ILR0AD.SSC`, has an upper-case extension). The JSONs sit at the zip root. 73 of their names contain `*`, which Windows forbids, and some `.ssc` paths are long, so the zip does not extract cleanly on Windows; read it in place.
- `simfiles/` is the canonical corpus. It was seeded from rayden @ `cff495bd`, with the v1.01 songs from @ `bf5ed8a7`.

**What the snapshot has:**
- chart-table rows: `name, sord, level, pack, skills[3], NPS, BPM info, Sustain time, Total time under tension`.
- Packs: PHOENIX 1,267 · XX 842 · PRIME 513 · PRIME 2 511 · **PHOENIX 2 218** · FIESTA 2 215 · FIESTA 174 · FIESTA EX 168 · older packs.
- Each chart JSON's metadata block (index 2) carries `SONGTYPE`, `SONGCATEGORY`, `STEPSTYPE`, `DESCRIPTION`, `CHARTNAME`, `METER`, `CREDIT`, `chart_skill_summary` and `Segment metadata[].Skill badges`.

**Reliability:**
- Hold-tick counts are reconciled against the game's note counts. 107/107 `verify_release` checks pass (snapshots/README).
- Skills are ML predictions (LightGBM foot-use plus rules). See §3.6.

**Gotchas:**
- Levels come from `.ssc #METER`. **Old charts keep their PHOENIX 1 levels:** Acquire S20 (P2: S21), BOOOM!! S10 (P2: S12), Conflict D12 (P2: D13). Take levels from pumpout or PIU Scores instead.
- P2 Half-Double mode (HDB) charts are not included.
- `.ssc` timing is not exported in chart-table.

**Licence:** none.
- `docs/TOOLS.md` says of The Resistance's packs: "their credits ask that the packs not be redistributed".
- The song-level `.ssc` `#CREDIT` names The Resistance on 260 of 664 files (e.g. "Andamiro, The Resistance Simfiles") and reads just "Andamiro" on 301 _(corrected 2026-10-13: "The `.ssc` `#CREDIT` reads "Andamiro, The Resistance Simfiles"")_. 88 files have `#ORIGIN:DECRYPT`.

### 3.5 rayden-61/PIU-Simfiles: community data (`.ssc`)

**Location:** <https://github.com/rayden-61/PIU-Simfiles> @ `0dc5a57919` (2026-09-20), default branch `stepp1-phoenix`, plus a `classic` branch.

**What "stepp1" means:** the README says these are simfiles "from StepF2/P1 and The Resistance Simfiles updated to work better in STEPP1+". STEPP1(+) is a PIU simulator built on StepMania. I found no separate StepP1 song database, so the data actually comes from the StepF2 and The Resistance teams. The `instructions.txt` file only explains how to install packs.

**Folders:** `01 - 1ST~3RD` … `07 - PRO~PRO2`, `08 - FIESTA`, `09 - FIESTA EX`, `10 - FIESTA 2`, `11 - INFINITY`, `12 - PRIME`, `13 - PRIME 2`, `14 - XX`, `15 - MOBILE EDITION`, `16 - PHOENIX`, `17 - PHOENIX 2`.

**P2 commits only add new songs:**
- [`4202163954`](https://github.com/rayden-61/PIU-Simfiles/commit/4202163954) "Phnx2 1.00 charts (ac mix only)" touched 27 files in `17 - PHOENIX 2` plus Heliosphere.
- `bf5ed8a7` added v1.01.
- Old songs are **not re-rated**. "ac mix only" means no R!SE/HDB charts.

**`.ssc` fields:**
- Song level: `#SONGTYPE` (ARCADE/SHORTCUT/FULLSONG/REMIX), `#SONGCATEGORY`, `#BPMS`.
- Per chart: `#STEPSTYPE` (pump-single/double/halfdouble/couple/routine), `#DESCRIPTION`, `#CHARTNAME`, `#METER`, `#CREDIT` (step artist), `#SPEEDS`, `#SCROLLS`, `#STOPS`, `#DELAYS`, `#WARPS`, `#FAKES`.

`#DESCRIPTION` markers seen across the 8,716 chart blocks in the 663-file corpus (the PSS snapshot's `.ssc` files with a lower-case extension; the 664th file, `CO5M1C R4ILR0AD.SSC`, adds 10 blocks). Rule: case-insensitive substring of `#DESCRIPTION`, with `PRO` as a whole word. A block can carry several markers.

| Marker | Blocks |
|---|---|
| `UCS` | 2,160 |
| `HIDDEN` | 383, of which 148 contain "HIDDEN INFOBAR" _(corrected 2026-10-13: 169 + 128 "HIDDEN INFOBAR"; 169 is only the blocks that read exactly "<level> HIDDEN")_ |
| `INFOBAR TITLE` | 97 |
| `QUEST` | 573 |
| `PRO` | 248 |
| `INFINITY` | 162 |
| `DP COOP` | 302 |
| `HALFDOUBLE` | 153 |

`#STEPSTYPE` across all 8,726 blocks of the 664 files: pump-single 4,687 · pump-double 3,463 · pump-halfdouble 440 · pump-routine 109 · pump-couple 27.

The files also contain non-official charts (UCS, quest, old-mix charts), so you need a charts list such as pumpout or the PIU Scores API to filter them out.

**Title charts:** `#CHARTNAME` carries the PHOENIX title condition, e.g. `#DESCRIPTION:D17 INFOBAR TITLE;` with `#CHARTNAME:[HALF] Lv.1 - SSS Grade or more;` (Mopemope).

**Scripts:** `0dc5a57` added `Scripts/double2halfdouble.py` and `dp2routine.py` and modified `ChartProcessing.py`. Its message lists "half-double indication" among the features. `double2halfdouble.py` turns `pump-double` into `pump-halfdouble` when no note sits in the side tracks, using helpers from `dp2routine.py`. `dp2routine.py` itself converts StepF2 co-op charts to `pump-routine` _(corrected 2026-10-13: "both convert Double→HalfDouble"; "`ChartProcessing.py` was added in `0dc5a57`")_.

**Licence:** none.

### 3.6 piucenter.com, piu-vis-ss and piu-annotate: community

**Site:** <https://www.piucenter.com/> shows "**Content version: Phoenix v2.12 Website last updated 5/7/26**". The [/skill](https://www.piucenter.com/skill) page lists 32 skills: jump, drill, run, anchor run, run without twists, twist 90 / over90 / close / far, side3 singles, mid6 doubles, mid4 doubles, doublestep, jack, footswitch, bracket, staggered bracket, bracket run/drill/jump/twist, 5-stair, 10-stair, yog walk, cross-pad / co-op pad transition, split, hold footswitch/footslide, hands, bursty and sustained. There is **no gimmick skill and no half skill**. The [about page](https://www.piucenter.com/articles/about) says the input is rayden's simfiles, foot use is predicted with LightGBM plus rules, and the simfiles "can be incorrect or outdated".

**Pipeline:** [`maxwshen/piu-annotate`](https://github.com/maxwshen/piu-annotate) @ `3549940`, README.
- It works on any `.ssc` file: "While I do not have specific plans to support Phoenix 2 as of May 2026, the code here could be used by anyone on Phoenix 2 simfiles".
- Setup: a conda environment, and the README asks you to verify a CUDA PyTorch install.
- It uses the shipped models in `artifacts/models/120524`. The feature-store step "*does not* retrain models".
- It needs a charts-list JSON from the PIU Scores `/api/charts` endpoint (token) to filter the simfiles down to official charts.
- DrMurloc's fork [`DrMurloc/piu-annotate`](https://github.com/DrMurloc/piu-annotate) (branch `piuscores-windows-port`) is what built the P1 ∪ P2 snapshot in §3.4.

**Licence:** none.

### 3.7 PHOENIX skill-title lists (official content via community copies)

| Version | Primary | Copies I checked | Agreement |
|---|---|---|---|
| PHOENIX (P1) | phoenix.piugame.com titles page (login only; the site is still up) _(corrected 2026-10-13: "login; site now 404")_ | (a) Resistance `.ssc` `#CHARTNAME` in the PSS corpus (97 title blocks) · (b) `PhoenixTitleList.cs` · (c) Moegirl search snippet ([page](https://mzh.moegirl.org.cn/Pump_It_Up/%E7%A7%B0%E5%8F%B7%E4%B8%80%E8%A7%88) returns 403) · (d) [`kalinathalie/piu-charts`](https://github.com/kalinathalie/piu-charts) README ("98 titles") | (a) = (b) for all 60 skill charts. (c) matches the examples it shows. |
| PHOENIX 2 | `piugame.com/my_page/title.php` (login) | `Phoenix2TitleList.cs` (authenticated scrape on 2026-07-09) | All 90 charts exist in pumpout P2 at the stated level. 6 needed title aliasing (4 with a casefold + English-title + cut-suffix match: both LIADZ (Cranky Mix) charts, "8 6", "LIADZ 2 Try To B.P.M"). All 90 match the PIU Scores CSV by casefolded title + type + level. |

The P2 ladders, each "SSS" on one chart (from `Phoenix2TitleList.cs`):

| Track | LV.1 → LV.10 |
|---|---|
| TWIST S | Scorpion King S15, Street show down S16, U Got Me Rocking S17, Solitary 2 S18, U Got 2 Know S19, Canon D S20, Love is a Danger Zone (Cranky Mix) S21, DUEL S21, Love is a Danger Zone pt. 2 S22, Uranium S22 |
| TWIST D | Redline D16, Mr. Larpus D17, Dignity D17, Final Audition 2 D18, Final Audition D19, Witch Doctor #1 D20, Love is a Danger Zone D21, Super Fantasy D22, LIADZ (Cranky Mix) D23, LIADZ pt. 2 D24 |
| RUN S | Switronic S15, Super Fantasy S16, Pavane S17, Gothique Resonance S18, Bee S19, Jupin - SHORT CUT - S20, Horang Pungryuga S21, Conflict S22, Gargoyle - FULL SONG - S23, Final Audition Ep. 2-X S24 |
| RUN D | Final Audition D17, Yog-Sothoth D18, HTTP D20, Bee D20, Conflict D21, Sarabande D21, Destination - SHORT CUT - D22, Gargoyle - FULL SONG - D22, Baroque Virus - FULL SONG - D23, Canon D - FULL SONG - D24 |
| DRILL | Hellfire S15, Vook S16, Gun Rock S17, Moonlight S18, Vacuum S19, Guitar Man S20, WI-EX-DOC-VA S21, Overblow S21, Sorceress Elise S22, Death Moon - SHORT CUT - S23 |
| GIMMICK | STAGER S17, Ugly Dee S17, Rock the house - SHORT CUT - S18, Come to Me S18, Miss S' story S19, Nakakapagpabagabag S19, 8 6 S20, Tales of Pumpnia S20, CHAOS AGAIN S21, Everybody Got 2 Know S21 |
| SLOW | Yeo rae a S13, Twist of Fate S19, Moonlight S20, Night Duty S20, Karyawisata S21, Take Out S21, Twist of Fate D21, Moonlight D22, Take Out D23, Banya-P Guitar Remix S23 |
| HALF | Mopemope D17, Butterfly D17, Shub Niggurath D18, Super Fantasy D19, Phantom -Intermezzo- D20, Phantom D20, Utsushiyo No Kaze D21, Redline D22, LIADZ 2 Try To B.P.M D23, Imprinting D24 |
| BRACKET | Allegro Furioso D20, Mad5cience S20, Pop Sequence S21, Meteo5cience (GADGET mix) S21, Phalanx "RS2018 edit" S22, Meteo5cience (GADGET mix) D22, What Happened D23, Scorpion King D23, Phalanx "RS2018 edit" D24, Hymn of Golden Glory - SHORT CUT - D24 _(corrected 2026-10-13: "Meteo5cience D22", "Phalanx D24")_ |

The P1 ladders, 10 each, for RUN, TWIST, BRACKET, HALF, GIMMICK and DRILL, are in `PhoenixTitleList.cs` lines 158–223 and in the PSS `.ssc` `#CHARTNAME` tags.

### 3.8 khal1234/pump-zone-order: community observation of the P2 arcade (independent check)

**Location:** <https://github.com/khal1234/pump-zone-order> @ `c7906755c7f2a0f69d4fbd86d3238882d835da6f` (2026-09-22).
- `out/level_zone_order.csv` (3,972 rows): level, screen position, Korean title, category, series zone, zone position, source grade. It covers Arcade cuts only (no Short Cut or Full Song titles).
- Levels stop at the zone folders: "S25" is the in-game "RANDOM SINGLE 25 OVER" folder (S25–S26) and "D27" is "RANDOM DOUBLE 27 OVER" (D27–D29) ([`arcade_level_cap.csv`](https://github.com/khal1234/pump-zone-order/blob/c7906755c7f2a0f69d4fbd86d3238882d835da6f/arcade_level_cap.csv)).
- Its category column still says JMUSIC for 11 songs, but `out/arcade_category_reads.csv` observes those songs in the WORLD MUSIC channel.
- Also `out/arcade_series_zone_order.csv` and `out/arcade_coop_channel.csv`.

**Method** (README): "방송 영상 프레임 판독 + 오락실 직접 확인", i.e. reading frames from streamed video plus visiting arcades. Each cell has an evidence grade, and the README warns that some cells are inferred. Scope is through PHOENIX 2 v1.00. The PHOENIX 2 zone holds 19 songs, and none of the v1.01 songs appear.

**Use:** independent validation of P2 levels and of series (debut) grouping.
- Matching by Korean title (English title when pumpout has no Korean one), restricted to Arcade cuts with an unambiguous title, and folding pumpout levels ≥S25 / ≥D27 into the zone's "OVER" folders, gives **2,820 / 2,822** P2 v1.00 S/D charts in agreement with pumpout, over 376 songs. The 2 misses: U Got Me Rocking D6 vs D5, and 1948's D chart, which pumpout leaves at "??". Debut grouping agrees for 376/376 songs once Prime JE and Infinity map to PRIME _(corrected 2026-10-13: 2,273 / 2,274 and 319/321)_.
- My first, naive title match produced false "mismatches" because Arcade and Short Cut versions share a Korean title. Without the folder fold, 1949 D28, Dead End D28, Neo Catharsis D28 and 1948 S26 look like mismatches.

**Licence:** MIT for `scripts/*.py` only. The data is described as game facts, and the content belongs to Andamiro.

### 3.9 Other sources checked

| Source | Finding |
|---|---|
| [pumpitup.fandom.com](https://pumpitup.fandom.com/) | MediaWiki API: 612 articles, 1,898 edits, 1 active user on 2026-10-13 _(corrected 2026-10-13: 1,894 edits, 2 active users on 2026-10-08)_. Licence CC-BY-SA. Song pages have an infobox (artist, BPM, category, "introduced") and a chart table (difficulty, step artist, unlock, PP cost). Example: [Conflict](https://pumpitup.fandom.com/wiki/Conflict) shows "D24/25". The [Phoenix 2](https://pumpitup.fandom.com/wiki/Phoenix_2) page says "released on July 9th, 2023", which is wrong (2026). Sparse and low-trust. `piu.fandom.com` has 10 articles. |
| [Zenius -I- vanisher](https://zenius-i-vanisher.com/v5.2/gamedb.php?gameid=7556) | PIU entries (Fiesta through PHOENIX 2) carry only release metadata: name, date, region. No song or chart lists. |
| namu.wiki | Cloudflare bot verification ("Performing security verification"). Not bypassed and not read. |
| Moegirl (zh) PIU titles page | HTTP 403 for both curl and WebFetch. Only seen as a search snippet. |
| [`kalinathalie/piu-charts`](https://github.com/kalinathalie/piu-charts) | Prior-art mobile app (Expo). Phoenix 2.12: 638 songs / 4,579 charts / 98 titles. Hand-maintained catalogue, P1 only, no licence. |
| [`Michaelis105/piu-phoenix-score-webcrawler`](https://github.com/Michaelis105/piu-phoenix-score-webcrawler) (MIT) | Crawls official per-chart leaderboards, which are login-only on piugame.com. Not examined. |

### 3.10 Spot-check: one chart across sources

| Chart | Official | pumpout P2 1.01 | PIU Scores CSV (P2) | zone-order (P2 arcade) | PSS snapshot / `.ssc` | Fandom |
|---|---|---|---|---|---|---|
| Conflict D25 (debut XX) | P v2.00.0: "D24 to D25" | D25 | D25 | D25 | D25 | "D24/25" |
| Acquire S21 (was S20) | none published | S21 | S21 | S21 | **S20** (P1 level) | — |
| BOOOM!! S12 (was S10) | none published | S12 | S12 | S12 | **S10** (P1 level) | — |
| CALL ME BACK (P2 v1.01, 11 charts) | [wr_id=349](https://www.piugame.com/phoenix2_notice?wr_id=349): S1 S3 S5 S8 S14 S16 S20 D6 D15 D18 D22 | same 11 | same 11 | absent (data predates v1.01) | same 11 | — |

### 3.11 MOBILE EDITION: does it matter?

rayden's `15 - MOBILE EDITION` folder holds 14 songs with IDs in the 1700s (Red Blossom, Festival of Death Moon, Autumn Break, Novatail, …). The sample file has `#ORIGIN:DECRYPT`.

In pumpout, only **Festival of Death Moon** (Phoenix v2.06.0) and **Autumn Break** (Phoenix v2.09.0) ever reached the arcade. Autumn Break was deleted in 2.09.1 ([notice](https://www.piugame.com/phoenix2_notice?wr_id=301)). The other 12 songs are not in pumpout at all.

So MOBILE EDITION only matters as a debut-version label for one current arcade song. I could not confirm from a primary source which product "MOBILE EDITION" refers to.

---

## 4. The five skills

| Skill | Official (exemplars only) | Catalogue-wide source | How to compute |
|---|---|---|---|
| **Half** | P1 [HALF] 10 charts · P2 [HALF] 10 charts. Imprinting D24 and Redline D22 are plain `pump-double`, so the official "half" idea is broader than strict half-double. | (1) `.ssc` `#STEPSTYPE:pump-halfdouble`: 143 of 4,641 official charts in the PSS snapshot (a Double chart with nothing in the outer 4 lanes, per rayden's `double2halfdouble.py`). (2) piucenter `mid6_doubles`: 255 charts in top-3, 1,508 with ≥1 segment. `mid4_doubles`: 294 / 1,462. (3) P2 HD **mode** (HDB): 790 charts, pumpout `mode=Half-Double` + `STEAM LINK EXCLUSIVE`. No `.ssc` for these. | `half = stepstype==halfdouble OR mode==HDB OR mid6 coverage ≥ threshold`. Tune the threshold against the 20 official HALF title charts. |
| **Run** | P1 [RUN] 10 · P2 [RUN S] 10 + [RUN D] 10 | piucenter `run` (top-3 759 / any segment 3,994), `anchor_run` (801 / 2,585), `run_without_twists` (893 / top-3 only), `bracket_run` (271 / 601) | Use per-chart segment coverage (`Segment metadata[].Skill badges`, or `badge_fraction` via the PIU Scores API). "Has ≥1 segment" is too permissive for `run` (86% of charts), so use a coverage threshold. |
| **Twist** | P1 [TWIST] 10 · P2 [TWIST S] 10 + [TWIST D] 10 | piucenter `twists` (top-3 1,485). Segment-level subtypes: `twist_90` 3,318, `twist_over90` 2,587, `twist_close` 3,054, `twist_far` 1,512 charts with ≥1 segment. `bracket_twist` 334 / 774. | Coverage threshold. Offer "hard twists" via `twist_over90` / `twist_far`. |
| **Bracket** | P1 [BRACKET] 10 · P2 [BRACKET] 10 | piucenter `bracket` (445 / 1,481), `staggered_bracket` (241 / 374), `bracket_jump` (472 / 1,318), `bracket_drill` (210 / 323), `bracket_twist`, `bracket_run` | Union of the bracket badges, using coverage. |
| **Gimmick** | P1 [GIMMICK] 10 · P2 [GIMMICK] 10 + [SLOW] 10. Patch notes also list gimmick removals and restorations (P v2.00.0). | **None.** piucenter has no gimmick tag. PIU Scores' retired "Gimmicks" hand tag is UI-only and frozen. | Must be derived from `.ssc` timing, and needs validation (below). |

How the counts in this table were measured: "top-3" is `page-content/chart-table.json` `skills`, which always has exactly 3 per chart. "Any segment" is the union of `Segment metadata[].Skill badges` in the per-chart JSONs of the 092326 snapshot. I computed both on 2026-10-08 over 4,641 charts.

**Gimmick derivation test** (my computation over 6,301 non-UCS, non-co-op S/D/HD blocks in the PSS `.ssc` corpus):
- **Naive approach.** Flag a chart for any BPM change, scroll change, speed change, or any stop, delay, warp or fake. This flags **3,914 (62%)**. The cause is that converted files emulate PIU display and timing with `#BPMS`/`#SCROLLS` values. For example, Mopemope's UCS block uses `#BPMS:0=25` with `#SCROLLS:0=4`.
- **Effective-velocity approach.** Compute the share of time spent away from the dominant BPM×SCROLL×SPEED, and flag a chart when that share is ≥10% or when it has an explicit stop, delay, warp or fake. This flags **2,127 (34%)**. Results on the official title charts:
  - It catches 9 of 10 P1 GIMMICK title charts. It misses Yeo rae a S13, which is a *slow* chart, and that chart moved to [SLOW] in P2.
  - It also flags **22 of 40** RUN/TWIST/DRILL/BRACKET title charts, e.g. Switronic S15, Phalanx S22/D24 and Meteo5cience S21/D22. Many PIU charts really do have BPM changes.

**Conclusion:**
- Gimmick needs (a) a product definition: speed/scroll gimmicks vs stops/warps vs fakes vs "slow".
- It also needs (b) a derived score from `.ssc` timing.
- And it needs (c) a curated override list. Seed that list with the 20 P2 GIMMICK/SLOW title charts, the 10 P1 GIMMICK title charts, and the gimmick edits named in the patch notes.
- Mark derived gimmick flags as "derived" in the UI.

---

## 5. Gaps, open questions, recommendation

### Gaps and open questions

1. **No official machine-readable catalogue.** Song lists, titles and leaderboards are videos or login pages. Patch notes are the only public primary data, and they have no full P1→P2 re-rate list.
2. **P2 levels for old charts** come only from pumpout (and PIU Scores, which derives from it). They are validated independently only for P2 v1.00 Arcade-cut charts (zone-order). Short Cut, Full Song and Remix charts, and v1.01 charts, have no independent check. Open: U Got Me Rocking D6 (pumpout) vs D5 (observed), and 1948's D chart, "??" in pumpout and D29 in PIU Scores _(corrected 2026-10-13: "one disagreement, 1949 D28 vs D27", which is the "27 OVER" folder)_.
3. **Skills for P2:** the PSS snapshot covers 218 P2-pack charts, but not the 790 HDB charts (no public `.ssc`) nor the 87 S/D charts of the 10 RISE songs (Steam-link only; not in the arcade-mix simfiles). Skills are ML-derived and "corpus-relative". The summary is the top 3; coverage needs the segment badges or `badge_fraction` _(corrected 2026-10-13: "show the top 3 only")_.
4. **Gimmick:** no source exists (§4).
5. **P2 skill-title list** is verified only through one authenticated community scrape. The primary page is login-only. Open: whether Andamiro changes it in later patches.
6. **Category drift:** pumpout keeps 12 P2 songs as J-MUSIC. Official P2 has no J-Music channel, and PIU Scores says it folded into World Music. pumpout also adds a `RISE` category (25 songs). You need a mapping rule.
7. **Identity matching across sources:** titles differ. pumpout `songGameIdentifier` matches `.ssc` folder IDs for older songs only (487 of 664 corpus files; every PHOENIX and PHOENIX 2 folder misses, because pumpout uses placeholders such as `17XX_0017`) _(corrected 2026-10-13: 486 of 663)_. Build an alias table. §6.4 gives a join that reaches 97.9% of P2 S/D charts.
8. **Licensing:**
   - No data repo has a licence.
   - Andamiro reserves all rights.
   - The Resistance asks that its packs not be redistributed.
   - Fandom is CC-BY-SA, which is share-alike and so not attractive.
   - PIU Scores' API needs an account. Its data terms are unknown.
   
   A public repo should commit only derived, factual fields (title, artist, level, flags), never `.ssc` note data or piucenter chart JSONs. Ask aaaaaa2493 (pumpout-db-updates) and DrMurloc (PIU Scores / PiuScoresStepfiles) for permission before redistributing.
9. **Not accessed:** namu.wiki (Cloudflare), Moegirl (403), the piugame.com titles and leaderboard pages (login), the PIU Scores API (token), the Andamiro YouTube and Discord channels, and The Resistance MediaFire packs (password-protected, and they ask that the packs not be redistributed).

### Recommendation: combine these

1. **Backbone:** the pumpout-db-updates SQLite for the latest patch. A build script turns it into the app's JSON with:
   - song type, category (P2-mapped), BPM range, debut mix/patch
   - per-version level history, removals and revivals
   - mode (S/D/Co-Op/HDB), step artist
   - premium, steam-link, HIDDEN and UCS labels
   
   Exclude Co-Op through `mode.coOp`. No live P2 chart carries the UCS label, and pumpout does not model arcade UCS, so there is nothing UCS to exclude _(corrected 2026-10-13: "Exclude Co-Op and UCS through `mode.coOp` and the UCS label")_. The repo lags official patches by about 2 days (P2 v1.01: 2026-09-03 → 2026-09-05).
2. **Skills:** the PiuScoresStepfiles snapshot, or the public PIU Scores CSV with `Columns=ChartId,…,SkillEmphasis` (no account; fetch at build time, §3.3), or a token-based pull of PIU Scores `charts/skills` if you accept an account. Map its badges to half, run, twist and bracket using segment coverage. Use only its skill fields, not its levels.
3. **Official badges:** attach the 90 P2 (and 60 P1) skill-title charts as "official" tags. Use them to tune the thresholds.
4. **Half:** combine `pump-halfdouble` from `.ssc`, the HDB mode from pumpout, and `mid6_doubles` coverage.
5. **Gimmick:** a curated list plus a derived score from `.ssc` timing, labelled as derived.
6. **Validation in CI:** diff each new pumpout patch against the new piugame.com patch note (new charts and levels). Diff P2 levels against `khal1234/pump-zone-order` (Difficulty Zone).

---

## 6. Verification (2026-10-13)

Every load-bearing claim above was re-checked on 2026-10-13 against the source that owns it. Data files were re-downloaded (hashes below); queries ran on Python 3.11 `sqlite3` (Node 20 has no `node:sqlite`). Pages rendered client-side (PIU Scores, piucenter.com) were read in a browser. Nothing was signed in to. Scripts lived in the session scratchpad and are not committed.

### 6.1 Claims checked

✅ confirmed · ✏️ corrected in the text above · ❓ unverifiable without a login or a primary source.

| # | Claim (section) | Verdict | Evidence |
|---|---|---|---|
| 1 | pumpout HEAD `ed314a8` (2026-09-05, "Add Phoenix 2 1.01 patch") (§3.2) | ✅ | `github.com/aaaaaa2493/pumpout-db-updates/commits.atom` |
| 2 | One `.db` per patch, `pumpout-xx-2.08.db` … `pumpout-phoenix-2-1.01.db`; P2 1.01 is 9.0 MB (§3.2) | ✅ | Git tree API @ `ed314a8`: 26 files; 8,998,912 bytes |
| 3 | Release asset `Phoenix-2-1.01/pumpout-phoenix-2-1.01.db` (§3.2) | ✅ | Asset = raw file = 2026-10-08 download, SHA-256 `852fb666…` |
| 4 | Pump Out lineage (§1, §3.2) | ✅ | `pumpout-xx-2.08.db` = AnyhowStep `dump/pumpout-2022-05-26-20-56-1653612171279.db`, SHA-256 `78e7ff36…`; dump repo `pushed_at` 2022-05-27 |
| 5 | AnyhowStep README quotes (§3.2) | ✏️ | README line 18: "almost all of the data entry is now done by Haru-kaze"; line 56 has "take the data, make a better search tool" |
| 6 | README process: patch notes → parser → `data.py` → SQL; step artists and Korean titles from YouTube (§3.2) | ✅ | `README.md` @ `ed314a8`, steps 1–9 and 4 |
| 7 | Schema tables in §3.2 exist | ✅ | `sqlite_master`: every table named in §3.2 is present; `mode` has 7 rows incl. Half-Double (HDB); `operation` has the 6 ops |
| 8 | `version`→`mix` spans 1st…Phoenix 2 with Fiesta v1.01–v1.20, Infinity, Prime JE, Phoenix v1.00.1–v2.12.0 (§3.2) | ✅ | `version` ⋈ `mix` |
| 9 | P2 v1.01: 669 songs, 5,465 charts (§3.2) | ✅ | State query (§6.2), `versionId` 201 |
| 10 | Modes S 2,752 · D 1,783 · HDB 790 · Co-Op 140 (§3.2) | ✅ | State query, `GROUP BY mode` |
| 11 | Cuts 552 Arcade · 62 Short Cut · 38 Remix · 17 Full Song (§3.2) | ✅ | State query, distinct songs by `cut` |
| 12 | Phoenix v2.12.0: 639 songs, 4,571 charts (§3.2) | ✅ | State query, `versionId` 199 |
| 13 | 338 re-rated: +1 ×294, −1 ×35, +2 ×8, −2 ×1 (§1, §3.2) | ✅ | Join of states 199 and 200 on `chartId`; 4,367 charts in both; no mode changes |
| 14 | 20 removed, "most licensed K-pop" (§3.2) | ✏️ | All 20 have category K-POP |
| 15 | 44 added (§3.2) | ✅ | 19 arcade-mix + 25 RISE (15 HDB-only) |
| 16 | 12 J-MUSIC songs at P2; RISE 25 (§3.2, §5) | ✅ | Latest `songCategoryVersion` among ancestors of 201 |
| 17 | UCS label on 52 charts (§2, §3.2) | ✅ | 52 `chartLabel` rows; 0 live at 201 (all deleted at Prime 2 v1.00.0 or outside the Phoenix line) |
| 18 | HIDDEN / UNLOCK REQUIRED / HALF-DOUBLE labels usable for P2 (§1, §2) | ✏️ | 0 live at 201; live labels are PREMIUM MODE EXCLUSIVE 172, STEAM LINK EXCLUSIVE 878, UPDATED 41 |
| 19 | Step artists: 100% S/D/Co-Op, 0% HDB (§2, §3.2) | ✅ | `chartStepmaker` coverage: S 2,752/2,752, D 1,783/1,783, C 140/140, HDB 0/790 |
| 20 | Conflict D24→D25 at Phoenix v2.00.0 is reflected (§3.2) | ✅ | Chart 5756: XX v1.03.0 D24 → Phoenix v2.00.0 D25 (also REVIVE) |
| 21 | P2 levels agree with zone-order 2,273/2,274; "1949 D28 vs D27" (§1, §3.2, §3.8, §5) | ✏️ | 2,820/2,822 (§6.2 rule); 1949 is the "27 OVER" folder |
| 22 | Debut agrees 319/321 (§3.2, §3.8) | ✏️ | 376/376 against `arcade_series_zone_order.csv`, Prime JE + Infinity → PRIME |
| 23 | 4,365/4,365 levels agree with the PIU Scores export (§3.2) | ✏️ | 4,652/4,653 (§6.4 rule); exception 1948 D29 vs "??" |
| 24 | `songGameIdentifier` = `.ssc` folder ID for old songs; 486/663 (§3.2, §5) | ✏️ | 487/664; Mopemope `16B1` ✅; P1/P2 songs use `17XX_…`/`18XX_…` (203 placeholders) |
| 25 | Category stale: J-Music folded into World Music in P2 (§3.2, §5) | ✅ | piugame full_mode.php has no J-Music channel; zone-order `arcade_category_reads.csv` sees Imprinting, Bad Apple!!, PRIME, Smile Diary in WORLD MUSIC; PIU Scores `Channel` = World Music |
| 26 | No BPM change points; no v2.13.0 (§3.2) | ✅ | `songBpm` has min/max only; last Phoenix version is v2.12.0 |
| 27 | Lag ~2 days (§5) | ✅ | Notice wr_id=349 dated 2026-09-03; commit and release 2026-09-05 |
| 28 | pumpout has no licence (§3.2) | ✅ | Repos API `license: null` |
| 29 | PIU Scores CSV: no login, 4,675 rows, 6 columns, S/D/CoOp counts, no HDB (§1, §3.3) | ✅ | `curl` of `Export.csv?mix=Phoenix2` on 2026-10-13 |
| 30 | No `mix` or `mix=Phoenix` → P1, 4,571 rows (§3.3) | ✅ | Both downloads identical, 289,755 bytes; controller falls back to the selected mix |
| 31 | P2 levels Acquire S21, BOOOM!! S12, Conflict D13 (§3.3, §3.10) | ✅ | CSV rows |
| 32 | NPS 10.7 on 7 Conflict charts; quoted titles with commas (§3.3) | ✅ | CSV: 7 rows at 10.7; 16 titles with commas |
| 33 | No song-type/version/category columns; API needed for them and for coverage (§1, §3.3) | ✏️ | `ChartExport.cs` @ `78499c4`; anonymous `Columns=` and `SkillEmphasis` downloads returned 4,675 rows |
| 34 | API v2 needs a token; anonymous call → 401 (§3.3) | ✅ | 401 on `api/v2/{mixes,charts,charts/skills,versions,channels}`; Swagger: all 45 paths `basic` or `toolKey` |
| 35 | 600 requests/min; 30+ mixes; P2 "lists four, having folded J-Music into World Music" (§3.3) | ✅ | `docs/API.md` @ `78499c4` lines 22, 66, 113 |
| 36 | About page credit to Pumpout (§1, §3.3) | ✅ | Rendered `/About`: "Mix, Song, and Chart information provided by the wonderful team of Pumpout." |
| 37 | Code MIT @ `78499c4` (§3.3) | ✅ | `LICENSE` "MIT License, Copyright (c) 2022 DrMurloc"; repos API `MIT` |
| 38 | Mix Changes 338/35/20/22; XX→Phoenix 722/195/395; no export (§3.3) | ✅ | Rendered pages; no export link |
| 39 | Mix Changes "same counts" as pumpout (§1) | ✏️ | Arrived 35 ≠ pumpout 44 (§3.3 breakdown) |
| 40 | `Phoenix2TitleList.cs` note: 272 titles, live `my_page/title.php`, 2026-07-09, authenticated (§3.3) | ✅ | File lines 10–11 |
| 41 | P1 ladders at `PhoenixTitleList.cs` lines 158–223 (§3.7) | ✅ | Line 158 `[BRACKET] EXPERT` … line 223 `TWIST` Lv.1 |
| 42 | Chabala vocabulary, frozen, UI-only (§3.3) | ✅ | `ChabalaSkillNames.cs`; design doc line 179 "The archive is never written again" |
| 43 | `/Terms` 404, `/Privacy` exists (§3.3) | ✅ | HTTP 404 / 200 |
| 44 | PSS HEAD `0f551b5` (2026-09-28) (§3.4) | ✅ | `commits.atom` |
| 45 | Snapshot `piucenter-snapshot-092326.zip`, 34 MB, 4,641 chart JSONs, 664 `.ssc` (§3.4) | ✅ | 34,185,826 bytes; SHA-256 `10f04f09…` (same as 2026-10-08); `version.txt` = `092326` |
| 46 | Pack counts incl. PHOENIX 2 218 (§3.4) | ✅ | `chart-table.json` `pack` |
| 47 | chart-table fields; JSON metadata keys at index 2 (§3.4) | ✅ | Row and Mopemope D17 JSON inspected |
| 48 | Old charts keep P1 levels: Acquire S20, BOOOM!! S10, Conflict D12 (§3.4, §3.10) | ✅ | `chart-table.json` |
| 49 | 107/107 `verify_release`; corpus seeded from rayden `cff495bd` + `bf5ed8a7` (§3.4) | ✅ | `snapshots/README.md` line 7; `README.md` line 27 |
| 50 | TOOLS.md: Resistance credits "ask that the packs not be redistributed" (§3.4) | ✅ | `docs/TOOLS.md` line 429 |
| 51 | `.ssc` `#CREDIT` "Andamiro, The Resistance Simfiles" (§3.4) | ✏️ | 260 of 664 name The Resistance; 301 read "Andamiro" |
| 52 | 143 `pump-halfdouble` among 4,641 charts (§1, §4) | ✅ | Chart JSON `STEPSTYPE` |
| 53 | rayden HEAD `0dc5a57919` (2026-09-20), branches `stepp1-phoenix` + `classic` (§3.5) | ✅ | `commits.atom`; `classic` last commit 2024-03-19 |
| 54 | README "from StepF2/P1 and The Resistance Simfiles updated to work better in STEPP1+" (§3.5) | ✅ | `README.md` @ `0dc5a57` |
| 55 | Folders `01 - 1ST~3RD` … `17 - PHOENIX 2` (§3.5) | ✅ | Git tree @ `0dc5a57`: 17 folders, 1,466 `.ssc` |
| 56 | `4202163954` touched 27 files in `17 - PHOENIX 2` plus Heliosphere; `bf5ed8a7` added v1.01 (§3.5) | ✅ | Commits API: 27 added (19 `.ssc` + 8 `default.lua`) + 1 modified; `bf5ed8a7` 6 added |
| 57 | Scripts convert Double→HalfDouble; `ChartProcessing.py` added in `0dc5a57` (§3.5) | ✏️ | Commit `0dc5a57`: 3 added, `ChartProcessing.py` modified; `dp2routine.py` docstring |
| 58 | `#DESCRIPTION` marker counts (§3.5) | ✅ / ✏️ | Filled; HIDDEN corrected (§6.2 rule) |
| 59 | `#CHARTNAME` title example on Mopemope D17 (§3.5) | ✅ | Chart JSON: `[HALF] Lv.1 - SSS Grade or more`, `D17 INFOBAR TITLE` |
| 60 | MOBILE EDITION: 14 songs, 1700s IDs, `#ORIGIN:DECRYPT`; only Festival of Death Moon and Autumn Break in pumpout (§3.11) | ✅ | Tree; Red Blossom `.ssc`; `songVersion` |
| 61 | piucenter "Content version: Phoenix v2.12 Website last updated 5/7/26" (§3.6) | ✅ | Rendered home page |
| 62 | 32 skills, no gimmick or half skill (§3.6) | ✅ | Rendered `/skill`: 32 entries |
| 63 | About: rayden input, LightGBM + rules, "can be incorrect or outdated" (§3.6) | ✅ | Rendered `/articles/about` |
| 64 | piu-annotate README quotes, conda, CUDA check, `120524`, "*does not* retrain", charts list from `/api/charts` with a token (§3.6) | ✅ | `README.md` @ `3549940` lines 7, 11–17, 27, 39, 62 |
| 65 | Snapshot built by `DrMurloc/piu-annotate` branch `piuscores-windows-port` (§3.6) | ✅ | `snapshots/README.md` names commit `e01246d` on that branch |
| 66 | P1 ladders: `.ssc` `#CHARTNAME` = `PhoenixTitleList.cs` for all 60; 97 title blocks (§3.7) | ✅ | Title + type + meter equal for 60/60 |
| 67 | P2 ladders, 9 tracks × 10 (§3.7 table) | ✅ / ✏️ | `Phoenix2TitleList.cs` lines 191–289; two BRACKET names corrected |
| 68 | All 90 P2 title charts exist in pumpout at the stated level (§3.7) | ✅ | 86 direct + 4 aliased |
| 69 | Imprinting D24 and Redline D22 are plain `pump-double` (§4) | ✅ | `.ssc` `STEPSTYPE` of the P1 HALF ladder |
| 70 | zone-order commit `c790675`, 3,972 rows, columns, other files, P2 zone 19 songs, no v1.01 (§3.8) | ✅ | Raw files @ `c790675`; 0 of the 6 v1.01 Korean titles present |
| 71 | zone-order method quote, scope, licence (§3.8) | ✅ | `README.md`, `LICENSE` (MIT, scripts only) |
| 72 | P2 v1.01.0 = wr_id=349, 2026-09-03, 6 songs, L (PIU Edit) premium, licensing warning (§3.1) | ✅ | Notice text |
| 73 | CALL ME BACK 11 charts match pumpout, PIU Scores, PSS (§3.1, §3.10) | ✅ | All four sources: S1 S3 S5 S8 S14 S16 S20 D6 D15 D18 D22 |
| 74 | P v2.00.0 = wr_id=258, 2024-05-27: "This is a difficulty change from D24 to D25"; gimmicks removed/restored (§3.1) | ✅ | Notice text |
| 75 | 2.09.1 hotfix = wr_id=301, 2025-05-30, Autumn Break removed (§3.1, §3.11) | ✅ | Notice "2.09.1 hotfix version release and song deletion announcement" |
| 76 | P2 release wr_id=336: Korea 07-09, global 07-20 (§3.1) | ✅ | Notice dated 2026-07-01 |
| 77 | P1 v2.13.0 final wr_id=340, 2026-09-23: service ends 2026-09-29; 18 premium songs become normal (§3.1) | ✅ | Notice on `phoenix.piugame.com/phoenix_notice?wr_id=340` |
| 78 | Title transfer wr_id=338 (2026-07-13) (§3.1) | ✏️ | Linked image: membership titles become "[PHOENIX] … MEMBER"; 4 event titles unchanged |
| 79 | `05_title_2.png` shows "[THE 2ND] BOSS BREAKER" (§3.1) | ✅ | Image viewed |
| 80 | Channel list (§3.1) | ✏️ | full_mode.php: 26 channel entries incl. New Tunes, Online Matching, Arcade/RISE mix, RISE Vol. 1 |
| 81 | Music list = two YouTube embeds (§1, §3.1) | ✅ | 2 `<iframe>`s; page byte-identical to 2026-10-08 |
| 82 | Titles page and leaderboards are login-only (§1, §3.1) | ✅ | All three `location.replace("/login.php?…")` |
| 83 | Old PHOENIX site 404 (§3.1, §3.7) | ✏️ | Home page and notice board load with a cookie jar |
| 84 | Footer "All rights reserved"; no Terms page linked (§3.1) | ✅ | Footer `<p class="copyT">` has no link |
| 85 | Fandom: 612 articles, CC-BY-SA, Conflict "D24/25", P2 page "July 9th, 2023"; `piu.fandom.com` 10 articles (§3.9) | ✅ | MediaWiki `siteinfo` and `parse` APIs |
| 86 | Fandom 1,894 edits, 2 active users (§3.9) | ✏️ | Now 1,898 / 1 |
| 87 | Zenius `gameid=7556`: release metadata only (§3.9) | ✅ | Page lists name, date 2026-07-20, region, platform |
| 88 | namu.wiki behind Cloudflare; Moegirl 403 (§3.9) | ✅ | 403 with "Just a moment"; 403. Not bypassed |
| 89 | `kalinathalie/piu-charts`: Phoenix 2.12, 638 songs / 4,579 charts / 98 titles, no licence (§3.9) | ✅ | README line 5; repos API `license: null` |
| 90 | `Michaelis105/piu-phoenix-score-webcrawler` is MIT (§3.9) | ✅ | Repos API |
| 91 | Every top-3 / any-segment count in the §4 table | ✅ | Reproduced exactly; method in §6.2 |
| 92 | `run` ≥1 segment on 86% of charts (§4) | ✅ | 3,994 / 4,641 = 86.1% |
| 93 | Gimmick: 6,301 blocks; naive 3,914 (62%); effective-velocity 2,127 (34%) (§1, §4) | ✅ | Independent Python re-implementation, same numbers |
| 94 | Gimmick: 9/10 P1 GIMMICK caught (misses Yeo rae a S13); 22/40 RUN/TWIST/DRILL/BRACKET flagged (§1, §4) | ✅ | Same run; Switronic S15, Phalanx S22/D24, Meteo5cience S21/D22 flagged |
| 95 | P2 has a Half-Double mode, 790 charts, Steam-link only (§1, §4) | ✅ | All 790 HDB charts carry STEAM LINK EXCLUSIVE; full_mode.php "(Steam Link Required)" |
| 96 | API v2 coverage of HD, HIDDEN, UCS, step artist (§2 "?") | ❓ | Needs an account token |
| 97 | Content of the live titles page (§3.7) | ❓ | Login only; P2 list rests on one authenticated community scrape |
| 98 | Coverage of the retired Chabala tags (§3.3) | ❓ | UI-only; no export |
| 99 | The Resistance's own redistribution terms (§3.4, §5) | ❓ | Only second-hand (PSS `docs/TOOLS.md`); the packs are password-protected |
| 100 | Which product "MOBILE EDITION" is (§3.11) | ❓ | No primary source found |

### 6.2 Queries and rules used

**State at a version** (`:v` = 201 for P2 v1.01.0, 200 for P2 v1.00.0, 199 for Phoenix v2.12.0). A song or chart is present when its latest operation among the version's ancestors is not DELETE; its level is its latest `chartRatingVersion` among the ancestors.

```sql
WITH anc AS (SELECT ancestorId, ancestorSortOrder FROM _derived_versionAncestor WHERE versionId = :v),
sv AS (SELECT s.songId, s.operationId,
         ROW_NUMBER() OVER (PARTITION BY s.songId ORDER BY a.ancestorSortOrder DESC, s.operationId DESC) rn
       FROM songVersion s JOIN anc a ON a.ancestorId = s.versionId),
songs AS (SELECT songId FROM sv WHERE rn = 1 AND operationId <> 2),            -- 2 = DELETE
cv AS (SELECT cv.chartId, cv.operationId,
         ROW_NUMBER() OVER (PARTITION BY cv.chartId ORDER BY a.ancestorSortOrder DESC, cv.operationId DESC) rn
       FROM chartVersion cv JOIN anc a ON a.ancestorId = cv.versionId),
charts AS (SELECT ch.chartId, ch.songId FROM cv JOIN chart ch USING (chartId)
           WHERE rn = 1 AND operationId <> 2 AND ch.songId IN (SELECT songId FROM songs)),
rv AS (SELECT crv.chartId, crv.chartRatingId,
         ROW_NUMBER() OVER (PARTITION BY crv.chartId ORDER BY a.ancestorSortOrder DESC) rn
       FROM chartRatingVersion crv JOIN anc a ON a.ancestorId = crv.versionId)
SELECT ch.chartId, ch.songId, s.internalTitle, cu.internalTitle AS cut,
       mo.internalAbbreviation AS mode, d.value AS level
FROM charts ch JOIN song s USING (songId) JOIN cut cu USING (cutId)
JOIN rv ON rv.chartId = ch.chartId AND rv.rn = 1
JOIN chartRating cr ON cr.chartRatingId = rv.chartRatingId
JOIN mode mo ON mo.modeId = cr.modeId
JOIN difficulty d ON d.difficultyId = cr.difficultyId;
```

- **Counts:** `GROUP BY mode`, and distinct `songId` by `cut`, over that result.
- **Re-rates, removals, additions:** states 199 and 200 joined on `chartId` (level differs) and on `songId` (set difference).
- **Category and labels:** the same "latest row among ancestors" rule on `songCategoryVersion` and `chartLabelVersion`; a label is live when its latest operation is not DELETE.
- **Step artists:** state rows with at least one `chartStepmaker` row.
- **zone-order levels:** state 200, Arcade cut, S/D. Song key = Korean `songTitle` (`languageId` 24), else English, NFKC + whitespace removed + casefold, unique among Arcade songs. Fold pumpout S ≥ 25 → S25 and D ≥ 27 → D27. Compare the per-song multisets of mode + level.
- **zone-order debut:** earliest INSERT/EXISTS mix per song, mapped to the Series Zone (1st…Zero → 1st~ZERO, NX/NX2/NXA → NX~NXA, Fiesta/EX/2 → FIESTA~FIESTA 2, Prime/Prime JE/Infinity → PRIME, then one zone per mix).
- **`#DESCRIPTION` markers:** split each `.ssc` on `#NOTEDATA:…;`, read `#DESCRIPTION`, count case-insensitive substrings.
- **§4 skill counts:** top-3 from `page-content/chart-table.json` `skills`; any-segment = union of `Segment metadata[].Skill badges` per chart JSON, read from the zip in place.
- **Gimmick heuristics:** same definitions as §4: 6,301 blocks = `pump-single|double|halfdouble` and no `UCS|COOP|CO-OP` in `#DESCRIPTION`, over the 663 lower-case `.ssc` files. The effective-velocity rule ends a chart 16 beats after its last timing breakpoint, not at its last note; that is crude but it is what produced the published numbers.

### 6.3 Changes since 2026-10-08

- **piugame.com:** no new PHOENIX 2 patch. The newest update notice is still P2 v1.01.0 (wr_id=349). The newest post on the P2 board is wr_id=355 (holiday closure, Sep 24–27), already there on 2026-10-08.
- **pumpout-db-updates:** no change. HEAD `ed314a8`; newest release `Phoenix-2-1.01`.
- **PiuScoresStepfiles:** no change. HEAD `0f551b5`.
- **PIU-Simfiles:** no change. `stepp1-phoenix` HEAD `0dc5a57`; `classic` unchanged since 2024-03-19.
- **PIU Scores:** `main` unchanged at `78499c4` (no commits since 2026-10-05). The repo's `pushed_at` moved to 2026-10-11, from a feature branch. The live CSV changed only in PassDifficulty (345 P2 rows, 57 P1 rows); Song, Type, Level, NPS and Badges are identical.
- **piu-vis-ss / piucenter.com:** no change. HEAD `09114c2` (2026-05-07); the site still says "Phoenix v2.12".
- **piu-annotate:** no change. `main` `3549940`; DrMurloc's `piuscores-windows-port` `e01246d` (2026-09-23).
- **pump-zone-order:** no change. HEAD `c790675`.
- **Fandom:** 1,898 edits and 1 active user (was 1,894 and 2).
- **Not a change, but new to this file:** the PIU Scores CSV `Columns=` parameter (§3.3). It exists at `78499c4`, so it was there on 2026-10-08. It removes the need for an account for song type, channel, debut, step artist and skill coverage.

### 6.4 Gap answers for the build plan

**1. Can a browser app fetch `Export.csv?mix=Phoenix2` directly?** No. A GET with an `Origin` header returns no `Access-Control-Allow-Origin`, and an `OPTIONS` preflight returns 405. Fetch it at build time (or through your own proxy) and ship the derived JSON. For comparison:

| URL | `Access-Control-Allow-Origin` |
|---|---|
| `piuscores.arroweclip.se/Charts/Export.csv` | none |
| `raw.githubusercontent.com/…/pumpout-phoenix-2-1.01.db` | `*` (and `Cache-Control: max-age=300`) |
| `github.com/…/releases/download/…` (302 to `release-assets.githubusercontent.com`) | none |
| `api.github.com/repos/…/releases/latest` | `*` (60 requests/hour unauthenticated) |

**2. pumpout `.db` size per patch, and are release URLs stable?** Sizes in `db/` @ `ed314a8`, in bytes:

| Patch | Bytes | Patch | Bytes |
|---|---|---|---|
| xx-2.08 | 7,651,328 | phoenix-2.04 | 8,220,672 |
| phoenix-1.00 | 7,864,320 | phoenix-2.05 | 8,253,440 |
| phoenix-1.01 | 7,892,992 | phoenix-2.06 | 8,286,208 |
| phoenix-1.02 | 7,925,760 | phoenix-2.07 | 8,323,072 |
| phoenix-1.03 | 7,942,144 | phoenix-2.08 | 8,347,648 |
| phoenix-1.04 | 7,954,432 | phoenix-2.09.0 | 8,372,224 |
| phoenix-1.05 | 7,979,008 | phoenix-2.09.1 | 8,376,320 |
| phoenix-1.06 | 7,999,488 | phoenix-2.10 | 8,429,568 |
| phoenix-1.07 | 8,015,872 | phoenix-2.11 | 8,437,760 |
| phoenix-1.08 | 8,040,448 | phoenix-2.12 | 8,454,144 |
| phoenix-2.00 | 8,097,792 | phoenix-2-1.00 | 8,953,856 |
| phoenix-2.01 | 8,159,232 | phoenix-2-1.01 | 8,998,912 |
| phoenix-2.02 | 8,192,000 | | |
| phoenix-2.03 | 8,204,288 | | |

- Release assets exist for 16 tags, `Phoenix-2.01` (2024-07-11) through `Phoenix-2-1.01` (2026-09-05). No asset has been replaced (`updated_at` = `created_at` for all).
- But a patch's file can change. P2 1.00 was re-issued as a new tag, `Phoenix-2-1.00-v2` (8,650,752 → 8,953,856 bytes, "add half-doubles"), and the in-repo `db/pumpout-phoenix-2-1.00.db` was overwritten with it (same SHA-256 `1574f29d…`).
- The file name carries the version, so there is no fixed "latest" URL. Discover new releases with `releases/latest` or `releases.atom`.
- Recommendation: pin a raw URL to a commit SHA (`raw.githubusercontent.com/aaaaaa2493/pumpout-db-updates/<sha>/db/<file>`). It is immutable and CORS-enabled.

**3. How to join sources, and the match rate for P2 S/D charts.**

| Join | Song key | Chart key | Result |
|---|---|---|---|
| pumpout → PSS snapshot | (a) `songGameIdentifier` = `.ssc` folder ID (text before " - ", minus any "(n) " prefix); else (b) normalised title: NFKC, casefold, alphanumerics only, internal or English `songTitle`, plus " - SHORT CUT -" / " - FULL SONG -" by cut, against the `.ssc` `#TITLE` | mode (`pump-single` = S; `pump-double`/`pump-halfdouble` = D) + level, using the pumpout level at Phoenix v2.12.0 when the chart existed then (the snapshot keeps P1 meters), else the P2 level | **4,442 of 4,535 P2 S/D charts (97.9%)**: 3,150 via game ID, 1,292 via title |
| pumpout → PIU Scores CSV | same normalised title + cut suffix | type + level (P2) | **4,653 of 4,675 rows (99.5%)** matched; 4,652 agree on level |

What fails, pumpout → snapshot (93 charts):
- 87 charts of the 10 RISE songs with S/D charts (Cynical, Rise Up, Ercitite, King's Tomb, Dizzy Dance Street Light, Unfelicitas, Pull me up, Antique Serenade, We Love Your Step, Lucky Star). They are Steam-link only and absent from the arcade-mix simfiles. PIU Scores has them, without badges.
- 5 charts of PRiMA MATERiA - SHORT CUT -. The snapshot has no simfile for it.
- 1 chart: 1948's D chart, level "??" in pumpout (PIU Scores: D29). The snapshot has no such chart.
- The snapshot's 199 unmatched charts are 196 charts of the 20 removed K-pop songs plus 3 others ("Baroque Virus - FULL SONG - v2", "Gargoyle - FULL SONG - v2", "Exciting").

What fails, pumpout → PIU Scores (22 rows, 4 aliases): "X-Tream" = "X Treme"; "Allegro Più Mosso" = "Allegro Piu Mosso"; "Tream Vook of the war" = "Tream Vook of the war REMIX"; "Love is a Danger Zone 2 Try To B.P.M" = "Love is a danger zone (try to B.P.M.)". Plus the 1948 D29 / "??" conflict.

Practical rule: use pumpout `chartId` as the app's key. Attach PIU Scores rows by title + cut + type + level with a 4-entry alias table, and keep their `ChartId` for skills. Use the snapshot only when you need segment-level detail beyond `badge_fraction`.

### 6.5 Still open

- U Got Me Rocking D6 (pumpout, re-rated in P2 v1.00) vs D5 (arcade observation, grade 실제). One of them is wrong; no third source settles it.
- 1948's top D chart: pumpout "??", PIU Scores D29, zone-order's cap note says 1948 has D27 and D29.
- Everything marked ❓ in §6.1.
