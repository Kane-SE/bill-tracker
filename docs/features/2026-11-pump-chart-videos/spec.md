# Pump chart videos — Design

**Date:** 2026-11-11 · **Status:** draft, waiting for approval
**Builds on:** [`../2026-10-piu-chart-filter/spec.md`](../2026-10-piu-chart-filter/spec.md) (Pump v1, data build) · [`../2026-10-pump-song-art/spec.md`](../2026-10-pump-song-art/spec.md) (chart sheet hero; its "YouTube links" non-goal is this feature)

## Problem

You pick a chart in Pump, for example Sarabande D21, and want to see its steps before you play it. Today you have to search YouTube yourself and find the right video among a song's ten or more charts. The chart sheet should link straight to a video of that exact chart: <https://www.youtube.com/watch?v=F9jchbo1OFI> for Sarabande D21.

## Decisions

| # | Decision | By |
|---|---|---|
| 1 | **The video list is ours, built from NEVSISTER's channel.** We don't wait for PIU Scores to add a video column to its export. | Evan, 2026-11-11 |
| 2 | **The list is static data.** It is gathered when the data is built, committed, and never searched while the app runs. | Evan, 2026-11-11 |
| 3 | **The link opens YouTube.** It is an ordinary youtube.com link, which Android hands to the YouTube app. There's no player inside Pump: one would need a looser CSP and can't play offline anyway. | Claude's call (Evan: "either fine") |
| 4 | **Placement.** The song art in the sheet becomes the link, with a ▶ badge on it. A caption line under the art says "Watch D21 on YouTube", followed by the channel, the video's mix and, for a two-chart video, your side. | Claude's call |
| 5 | **Side for two-chart videos.** NEVSISTER films two singles charts side by side, lower level on the left and higher on the right. This is the convention PIU Scores documents ([video-sides.md](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/main/docs/design/video-sides.md)). The caption says "left side" or "right side". | Claude's call |
| 6 | **No video, no link.** The art stays a plain image and there's no caption. | Claude's call |
| 7 | **Credit.** About lists "NEVSISTER (YouTube)" as the video source. We only link to videos and copy no video, thumbnail or title. | Claude's call |

## Data

### Source

NEVSISTER (`네브시스터NEVSISTER`, channel `UCicVRsgv4iIhZGZcbx7xUkw`, about 12,400 uploads). PIU Scores trusts this channel wholesale and uses it as its default source for chart videos. Only its showcase titles are used:

| Title tag | Example | Mix it shows |
|---|---|---|
| `[PUMP IT UP PHOENIX 2]` | `Do the Dance (빌려온 고양이) D22` | PHOENIX 2 |
| `[PUMP IT UP PHOENIX]` with a `(PNX1 …)` note | `Mr. Larpus (미스터 라푸스) D19 (PNX1 D18, XX D17)` | PHOENIX 2 (a re-rate) |
| `[PUMP IT UP PHOENIX]` | `Sarabande (사라반드) D21 \| RUN D LV.6 Title` | PHOENIX |
| `[펌프 잇 업 2026]`, `[펌프 잇 업 2023]`, `[펌프 잇 업 2024]` (Basic mode) | `MAX(맥스) - Sarabande(사라반드) S4 & S7` | PHOENIX 2 / PHOENIX |
| `[PUMP IT UP XX]`, `[펌프잇업 20주년]` | `Monkey Fingers S15` | XX |
| `[PUMP IT UP RISE]`, **half-doubles only** | `Lucky Star (럭키 스타) HD18` | RISE (the Steam game; it's where the Steam Link HDB charts come from) |

The following are skipped: play sessions (`[PIU …] NEVSIST - …`), mirror, BGA, co-op, random-step and gimmick-compare videos, SP/DP performances, EZ2ON 4K/5K/6K, and `??` levels.

### Build

`npm run piu:videos` runs after `npm run piu:data`. It:

1. Lists the channel's uploads from the public playlist page and its "load more" requests: about 124 requests, about two minutes, no API key, nothing installed. A dated copy is kept in `.cache/piu-data/` like the PIU Scores export, so a rerun on the same day reads the copy.
2. Matches videos to the charts in the committed `charts.json` (rules below).
3. Applies `scripts/piu-data/video-overrides.json`, which maps a chart ID to a video ID, or to `null` to drop a wrong match. It starts empty.
4. Writes `src/apps/pump/data/videos.json` (committed) and prints a report: coverage by mode, the charts with no video, the video songs that matched no Pump song, and the XX-era picks.

The script stops without writing, and leaves the committed file as it was, if the list has fewer than 10,000 videos or singles and doubles together drop below 95 % coverage. Either one means the lister or the parser broke.

`charts.json` is unchanged. `videos.json` is a separate file of about 90 KB, loaded the first time a chart sheet opens. It keeps `charts.json` under its 600 KB budget and is precached for offline use like the rest of the app.

### Matching rules

These were measured on 2026-11-11 against the PHOENIX 2 v1.01 catalog.

- **Title parse.** Mix tag, then the song, then the first group of chart codes (`S17`, `D21`, `HD14`, `S17 & S20`), then notes in brackets or after `|`. Basic-mode titles start with `Artist - `, which is dropped.
- **Song.** Bracketed Korean names, `feat.` and `ft.` credits, subtitles and the `SHORT CUT` / `FULL SONG` markers are folded away on both sides. That includes Pump's own `… FULL SONG MIX` titles. A Korean-first title uses its Latin name in brackets (`조깅(Jogging)` → Jogging). `SHORT CUT` and `FULL SONG` must match the song type. A loose match counts only when it points to exactly one song.
- **Level by mix.** A PHOENIX 2 video matches the chart's current level. A PHOENIX video matches the chart's PHOENIX level (`p` when it changed, otherwise the current level). An XX video does the same, unless a PHOENIX video of that song notes the level moved (`XX S19`, `pre S14 → S15`).
- **Best video.** Newest mix first (PHOENIX 2, then PHOENIX, then RISE, then XX). Within a mix, a solo video beats a two-chart one, then the newest upload wins.

### Expected coverage (from the spike)

| Mode | With a video |
|---|---|
| Singles | 2,701 / 2,752 (98 %) |
| Doubles | 1,772 / 1,783 (99 %) |
| Half-doubles | 31 / 790 (4 %): NEVSISTER films RISE's new HD charts only |

The 62 singles and doubles without a video are mostly S1–S8 charts of old songs. The 4,504 matched charts use 3,529 distinct videos. Sarabande D21 gets `F9jchbo1OFI`.

## Non-goals

- A player inside Pump.
- Other channels, which could later fill the gaps via overrides or a second source.
- Half-double coverage beyond what NEVSISTER has.
- Asking PIU Scores for its list. If its export ever gains a `VideoUrl` column, it could replace or check ours.
- Video start times, playlists, or marking a video as watched.

## Risks

- **YouTube changes its page.** `piu:videos` breaks, but the committed `videos.json` keeps working. Fix the lister then, or switch it to `yt-dlp`.
- **A wrong match**, most likely on XX-era footage (537 picks). Before merging, spot-check 20 picks across the mixes (at least 8 XX) by opening them, and fix any wrong one with an override.

## Done when

- Sarabande D21's sheet opens `F9jchbo1OFI`, and a chart on a two-chart video names the correct side.
- The build report's coverage is at least the spike's.
- Tests cover the title parser, the matcher (fixtures of real titles, including each tag in the Source table and the PNX1 and XX-guard cases), the overrides and the caption text. The sheet itself (link shown or hidden, side caption) is checked in the browser, since Pump's tests are logic-only.
- `scripts/piu-data/README.md`, About, this spec's status and the explainer's Pump chapter are updated.
