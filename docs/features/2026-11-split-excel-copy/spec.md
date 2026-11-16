# Split: Copy for Excel — Design

**Date:** 2026-11-16 · **Status:** approved in chat (brainstorm), small change, no separate plan
**Branch:** `feature/split-excel-copy` → one PR

## Problem

Every so often you send your friends an Excel sheet so they pay you back. Today you build
it by hand from Split's Home screen and each Nomnom. You want one button that puts the
sheet on the clipboard so a single paste into Excel lands every column in place.

## Decisions

| # | Decision | Whose |
|---|---|---|
| 1 | The sheet lists **who owes you**, each person's **total**, and **each Nomnom** behind it (date and name). | yours |
| 2 | Layout **C**: a totals table on top (*Who owes me · Total*), one blank row, then a detail table (*Who owes me · Date · Nomnom · Amount*). | yours |
| 3 | You choose **who you are** from a list; the choice is remembered. | yours |
| 4 | Entry point: a **Copy for Excel** button in the header of Home's "Current balances" card. It shows only when there is at least one balance. | my call |
| 5 | Tapping it opens a bottom sheet: **Who are you?** lists everyone who took part in any Nomnom (alphabetical, same set as the person picker), a one-line summary ("2 people owe you 570.000 ₫ across 3 Nomnoms"), and **Copy**. A toast confirms. | my call |
| 6 | "Who you are" is saved **on this device only** (localStorage key `split-me`), not in backups. A saved name that no longer appears in any Nomnom counts as unset. | my call |
| 7 | Only **active** Nomnoms count; archived ones are settled. | my call |
| 8 | Amounts are what is **left** after ticked pay-backs, netted per pair exactly like Home's balances. A Nomnom where *you* owe that person shows as a **negative** row, so each person's rows add up to their total (same numbers as the pair sheet). | my call |
| 9 | People you owe are **left out**. Totals: biggest first. Details: grouped by person in the totals' order, newest Nomnom first, one row per Nomnom. | my call |
| 10 | Amounts paste as **plain integers** (`150000`), dates as **`YYYY-MM-DD`** in local time, so Excel reads real numbers and dates whatever its locale. `150.000` could be read as 150. | my call |
| 11 | A Nomnom with no name uses its formatted date, as everywhere else in Split. | my call |
| 12 | The clipboard text is **tab-separated** with `\n` line ends. Tabs and line breaks inside names become spaces. A text cell starting with `=`, `+`, `-` or `@` gets a leading space so Excel doesn't read it as a formula. | my call |
| 13 | When nobody owes you, the sheet says so and Copy is disabled. When the clipboard is unavailable, a fallback copy is tried, then an error toast. | my call |

## Example

Active Nomnoms: An owes you 150.000 (Hotpot at Ba's, 3 Nov) and 300.000 (BBQ night, 8 Nov);
Bình owes you 120.000 (Bánh xèo, 5 Nov). Pasted:

```
Who owes me	Total
An	450000
Bình	120000

Who owes me	Date	Nomnom	Amount
An	2026-11-08	BBQ night	300000
An	2026-11-03	Hotpot at Ba's	150000
Bình	2026-11-05	Bánh xèo	120000
```

## Where it lives

- `src/apps/split/lib/excel.ts`: `buildOwedToMe(nights, me)` and `owedToMeTsv(sheet)`, pure, tested in `excel.test.ts`. Built on `computeBalances` and `computePairBreakdown` from `calc.ts`.
- `src/apps/split/store/useMe.ts`: the saved "who you are".
- `src/apps/split/components/ExcelCopySheet.tsx`: the bottom sheet.
- `src/shared/lib/clipboard.ts`: `copyText` with the fallback.
- `src/apps/split/pages/SplitHome.tsx`: the button.

## Verified (2026-11-17)

- `excel.test.ts`: 11 tests (layout, negative rows, pay-backs, archived, people you owe, order, untitled, summary, empty, tabs, formulas); full suite 425 passing; `npm run build` clean.
- Real Chromium at 390px (Playwright, clipboard allowed): the clipboard held the expected sheet, the toast showed, and the saved name came back ticked after a reload.
- Not verified: pasting into Excel itself, and a phone. In the Claude desktop browser pane the Clipboard API is refused; the fallback reported success but nothing reached the Windows clipboard, so a locked-down browser can show "Copied" without copying.

## Out of scope

A downloadable `.xlsx` or CSV file, per-person sheets, and the Archive screen.
