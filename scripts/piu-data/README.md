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
