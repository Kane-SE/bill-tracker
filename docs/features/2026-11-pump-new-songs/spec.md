# Pump: new songs get a "New" mark — Design

**Date:** 2026-11-19 · **Status:** built and verified 2026-11-19, PR open · small change · plan: [plan.md](plan.md)
**Branch:** `feature/pump-phoenix2-1.02` → one PR with the PHOENIX 2 v1.02 data update

## Problem

PHOENIX 2 v1.02 (15 Oct 2026) added six songs: NEMONEMO, Mephitz, Falling Stars, Until
Defined, PHYSALIS and Assault TAXI. After a data update they sit among 675 songs looking
like every other one. You want the songs from the latest patch to look different, so you
spot them while browsing a level.

## Decisions

| # | Decision | Whose |
|---|---|---|
| 1 | Design **A**: a **gold border** and a **NEW** tag. Picked from three mockups (A gold border and tag, B glowing gold border, C corner ribbon). | yours |
| 2 | **New = a song playable in this patch that wasn't playable in the patch before it.** The build works that out from pumpout (the version just before `PUMPOUT.version`), so the mark moves to the next patch's songs on the next `npm run piu:data`, and nothing is bumped by hand. Today: the 6 songs above, 50 S/D charts. | my call |
| 3 | The mark belongs to the **song**: every chart of a new song is marked. New charts of older songs are **not** (v1.02's 119 R!SE Vol.1 Steam Link charts stay unmarked). A song that comes back after being removed counts as new. A patch that adds no songs marks nothing. | my call |
| 4 | **Grid tile:** gold border in place of the grey one (same tile size, so the grid doesn't shift) and a gold **NEW** pill on the art's top-right corner. The level badge stays bottom-left. | yours (A) |
| 5 | **List row:** a 3 px gold bar down the row's left edge and a **NEW** pill right after the title. The title truncates before the pill does. | yours (A) |
| 6 | **Chart sheet:** a line "New in v1.02.0" (the patch from `meta.patch`) next to "Was D20 in PHOENIX". | my call |
| 7 | The word **NEW** is always shown, never the colour alone — the same rule as the S/D/HD level badges. Screen readers hear "New" with the song title. | my call |
| 8 | Gold is a new colour token, `--new` (plus `--new-foreground` for the pill text), set in every theme: light, dark, Coffee, Coffee dark, and derived for the custom palette. Targets: border at least 3:1 against the card, pill text at least 4.5:1 on gold. It is never purple, which already means level, selected skill and earned title. | my call |
| 9 | Data: songs in `charts.json` gain `n: 1` when new (about 30 bytes today). The build report lists the new songs. | my call |
| 10 | **No skill data, not 0 % bars.** A chart whose PIU Scores row has every skill column empty (piucenter hasn't analysed it yet) gets no `cov`, so its sheet says "No skill data for this chart." instead of five 0 % bars. At v1.02 that is 267 S/D charts: the 50 new ones, the 119 R!SE Vol.1 ones and 98 older ones that already showed zeros. The build's 97 % check keeps counting charts matched to a PIU Scores row, so a new patch isn't blocked until piucenter catches up; the report counts the charts without skill data. Added after review on 2026-11-19. | yours |

## Not in this change

- A "New" filter, preset or sort. You asked to tell them apart while browsing, not to list them.
- Marking songs you haven't opened yet ("new to you"). New follows the game's patch, not your history.
- Any change to the 1.02 data beyond the `n` flag and decision 10.

## Left to the build

- How the tile keeps its 148 px height with a heavier border (e.g. ring or inset border).
- The exact gold for each theme, checked against the contrast targets.
- Where the row's bar sits so it doesn't crowd the level badge; checked at 375 px.

## Built

- The build finds the version a patch came from with pumpout's `_derived_versionAncestor` (nearest ancestor), so `sources.mjs` gains no new field.
- Custom palette: the gold keeps the theme value when it stands out 3:1 from the card; on a card where it can't (a mid-grey background), the gold's lightness moves until it does. Tests pin 3:1 and 4.5:1 in every theme (`theme-tokens.test.ts`, `palette.test.ts`).
- List rows all moved 10 px right (`pl-2.5`) so the gold bar never touches a level badge and badges still line up.

## Verified

2026-11-19, dev server at 375×812:

- Grid: Assault TAXI S21 has the gold border and NEW tag; the tile stays 148 px; older tiles unchanged. Checked in dark, light, Coffee and a custom green palette.
- List: badges line up at the same x on every row; the bar sits left of the badge; with a 50-character title the title truncates and the NEW tag stays whole.
- Sheet: "New in v1.02.0" on Assault TAXI S21 and on D23 picked from the sibling chips; absent on Athena's Shield.
- Decision 10: Assault TAXI S21's sheet says "No skill data for this chart." with no bars; Athena's Shield S21 keeps its bars. The rebuild changed only `cov`, removed from exactly the 267 charts that had five zeros; 71 charts keep real all-zero bars (their skill numbers fall outside the five skills).
- No console errors. 549 tests, `tsc --noEmit` clean, `npm run build` OK.

Not checked: an installed PWA on a phone.
