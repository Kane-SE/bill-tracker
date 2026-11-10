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

## Chart videos

`npm run piu:videos` writes `src/apps/pump/data/videos.json` (committed): chart ID → the YouTube video of that chart from NEVSISTER's channel. The chart sheet links to it. Run it after `npm run piu:data`, or whenever NEVSISTER has uploaded new charts. Spec: `docs/features/2026-11-pump-chart-videos/spec.md`.

1. It lists the channel's uploads from the public playlist page (`youtube.mjs`). That takes about 124 requests and two minutes, with no API key. The list is kept as `.cache/piu-data/nevsister-<date>.json`, so a second run on the same day reads the file.
2. It parses each title (`video-titles.mjs`) and matches it to `charts.json` (`video-match.mjs`). PHOENIX videos match a re-rated chart's PHOENIX level, and the newest mix wins.
3. It applies `video-overrides.json`: `{ "<chart id>": null }` drops a wrong match, and `{ "<chart id>": { "v": "<YouTube id>", "mix": "PHOENIX", "side": "L" } }` sets one by hand.
4. It prints a report: coverage by mode, the singles and doubles without a video, the video songs Pump doesn't have, and the XX-era picks (older footage, worth a spot-check).

It stops without writing if fewer than 10,000 videos are listed, or if singles and doubles together are below 95 % coverage. Either one means YouTube changed its page or the title format moved. In that case, fix `youtube.mjs` (or switch it to `yt-dlp --flat-playlist`) or the parser.
