# Hub — "For you" lines first

**Date:** 2026-11-18 · **Status:** built on branch `feature/hub-for-you`

## Why

NOW notes grew into long resume pointers written for Claude: whole paragraphs per field, dozens of
"waiting on me" items. The dashboard row showed the first two lines of that text, so Hub was hard to
read at a glance, and the user stopped reading it.

The `wrap` skill (in `personal-hub`, `machine-setup/skills/wrap/SKILL.md`) now opens every note with
three short lines for the user. Hub shows those first.

## Format

A `## For you` section after `Last worked`, then `## For Claude` with the fields Hub already read
(see [the Hub dashboard spec](../2026-10-hub-dashboard/spec.md#nowmd--read-only-existing-format)):

```markdown
# NOW — calendar

Last worked: 2026-11-16 · fedora

## For you
Next: Check the week view on your phone after PR #4 deploys
Then: Merge PR #4 · Pick a colour for booked days
Blocked: —

## For Claude
Next action: …
Waiting on me: …
Waiting on others: —
In flight: …
Plans & decisions: …
```

- `Next`: one action, at most 15 words. `Then`: at most two items, split on ` · `. `Blocked`: at
  most 10 words. `—` means empty. The wrap skill keeps the three lines at 40 words or fewer.
- Keys under `## For you` only fill these three lines; the same keys elsewhere are ignored.
- A note without `## For you` (written before it existed) parses as before, with `forYou: null`.

## What Hub shows

| Where | Note with For you | Note without (unchanged) |
|---|---|---|
| Dashboard row | `Next` as the headline, then a `Then` line and a `Blocked` line; hand icon when `Next` is set; no "waiting N weeks" label | `Waiting on me`, else `Next action`, with the "waiting N weeks" label |
| Project page | A "For you" card (Next, numbered Then, Blocked), then the rest of the note folded under "Full note" | Every section in full |

## Verified

- `parse-now.test.ts`: For you lines read, keys outside the section ignored, empty `Then`, a
  blocker, older notes give `forYou: null`. `npm test` 430 passed; `npm run build` clean.
- Browser, demo mode (`?hub-demo`, fixture `now-calendar.md`) at phone width: the dashboard row,
  the project page, and "Full note" opening; an older note's page unchanged; no console errors.
- Not yet checked on a phone against the real `personal-hub` notes.
