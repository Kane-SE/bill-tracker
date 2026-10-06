# Hub Dashboard — Design

**Date:** 2026-10-05 · **Status:** approved in brainstorming, awaiting spec review
**Visual reference:** [`wireframe.html`](wireframe.html), option **A**
(open it through a local static server; `?v=a&mau=mau` shows the build target in color)

## Problem

Work in progress, ideas and the list of projects live in the private `personal-hub` repo
(`now/*.md`, `CLAUDE.md`). Reading them on the phone means opening GitHub and digging
through files, and ideas that pop up away from the PC have nowhere to go.

**Hub** is the second mini-app in Nook, next to Split: a phone-first dashboard that reads
`personal-hub` and lets ideas be captured and moved forward from the phone.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| 1 | Data comes from the private `Kane-SE/personal-hub` repo, fetched **at runtime from the device**. Nothing private is ever baked into the public bundle. |
| 2 | Auth is **Sign in with GitHub** through a **GitHub App** (not an OAuth App), private to the account and installed **only on `personal-hub`**, permission **Contents: read and write**. |
| 3 | One small **Vercel function** (`api/github/token.ts`) holds the client secret and swaps code → tokens and refresh → tokens. It stores nothing. A NestJS BFF may replace it later; the auth base URL is one config value. |
| 4 | Keys (8 h access + 6-month refresh) are stored on the device. **No PIN lock** in v1. |
| 5 | Sections: **Now** (from `now/*.md`), **Projects** (from a new `projects.md`), **Ideas** (from a new `ideas.md`). |
| 6 | Storage: **one markdown file per section**, each item a `##` block. |
| 7 | From the app: **add idea, add progress note, move stage**. Everything else is read-only. |
| 8 | **No delete in the app.** "Dropped" is the only way to retire an idea; real edits and deletes go through "Edit on GitHub". |
| 9 | Offline: read from cache; **new ideas** are queued on the device and synced later. Notes and stage moves need a connection. |
| 10 | Layout **A** from the wireframes: one scroll, "Needs you" first, two columns on desktop. |

## Architecture

```text
api/github/token.ts            Vercel function: code→tokens, refresh→tokens (holds client secret)

src/apps/hub/
  routes.tsx                   /hub, /hub/ideas/:id
  config.ts                    HUB_REPO ("Kane-SE/personal-hub"), AUTH_BASE_URL ("/api"), thresholds
  auth/
    github-auth.ts             start sign-in (PKCE + state), finish redirect, refresh tokens
    useAuthStore.ts            Zustand + persist: tokens, expiry, login, avatar
  github/
    client.ts                  getFile / listDir / putFile(sha) over api.github.com; auto-refresh on 401
  lib/                         pure, no network, unit-tested
    parse-now.ts               now/*.md     → WipCard[]
    parse-projects.ts          projects.md  → Project[]
    ideas.ts                   ideas.md    ↔ Idea[]   + addIdea / addNote / moveStage (line-surgical)
    needs-you.ts               WipCard[] + Idea[] + today → NeedsYouItem[]
    text.ts                    UTF-8 base64, EOL detect/preserve, slugify
  store/useHubStore.ts         Zustand + persist: last copy, ETags, fetchedAt, pending ideas; load/refresh/write
  pages/                       HubHome, IdeaDetail, SignIn
  components/                  NeedsYouList, WipRow, IdeaRow, StageBadge, StageChips, ProjectList,
                               NewIdeaDialog, AddNoteDialog, MoveStageMenu, SyncBanner
```

- `lib/` knows nothing about GitHub or React. Only `github/client.ts` touches the network;
  only `auth/` knows about the function.
- **Shared edits** outside `src/apps/hub/`: `launcher/registry.ts` (tile "Hub · What I'm working on",
  icon `LayoutDashboard`), `App.tsx` (routes + redirect handling), `settings/Settings.tsx`
  (a GitHub row), `index.css` + `shared/lib/theme.ts` (the `--warning` token), `vite.config.ts`
  (service-worker exclusions), new `vercel.json` (CSP).
- **No new dependencies.** `fetch`, Web Crypto, zod.

## File formats (in `personal-hub`, repo root)

Setup on the PC: add `projects.md` and `ideas.md` to personal-hub's allow-list `.gitignore`.

### `now/*.md` — read-only, existing format

```markdown
# NOW — bill-splitter

Last worked: 2026-09-30 · pc
Next action: Decide whether the Vercel SPA-rewrite fix is still needed (…), then open a PR or delete the branch (branch feat/nomnom-launcher)
Waiting on me: photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17
Waiting on others: —
In flight: main = PR #2 merged … · main auto-deploys on Vercel …
Plans & decisions: bill-splitter/DEPLOY.md · …
```

- Project from the `# NOW — <project>` title (falls back to the file name).
- Fields are `Key: value` lines; unknown keys ignored; `—` means empty.
- `Last worked` → date + machine. `In flight` split on ` · `.
- **Waiting since:** the first `YYYY-MM-DD` in the `Waiting on me` text; none → the `Last worked` date.
- `PR #n` and URLs render as links (`PR #n` → that project's repo, from `projects.md` `Link`).

### `projects.md` — read-only

```markdown
# Projects

## bill-splitter
Status: active
Stack: Vite, React, TS, Zustand, PWA
Link: https://github.com/Kane-SE/bill-splitter

Nook: little offline tools (Split, Hub).
```

`Status`: `active` · `paused` · `archived` (missing/unknown → `active`). `Stack`, `Link` optional.
First plain paragraph = summary.

### `ideas.md` — read and write

```markdown
# Ideas

## Photo-tagging for Nomnoms
Stage: exploring
Added: 2026-08-17

Tag people on the receipt photo so items split themselves.

- 2026-08-17 — Idea captured
- 2026-09-02 — Grilled the design, rounds 1–4
```

- `Stage`: `idea` · `exploring` · `building` · `shipped` · `dropped` (missing/unknown → `idea`).
- Progress lines oldest first; ` — ` or ` - ` separator. The last one is the "last step".
- **Id** = slug of the heading, `-2`, `-3` … for duplicates in file order.

### How the app writes (line-surgical, never a full re-serialize)

| Action | Text change | Commit message |
|---|---|---|
| New idea | Append `## Title` / `Stage: idea` / `Added: today` / optional note paragraph / `- today — Idea captured` at end of file (creates `ideas.md` with `# Ideas` if missing) | `hub: add idea "…"` |
| Add note | Insert `- today — text` after the idea's last progress line (create the list if none) | `hub: note on "…"` |
| Move stage | Rewrite only that idea's `Stage:` line (insert it if missing) and add `- today — Moved to <stage>` (+ ` · <why>` if given) | `hub: move "…" to <stage>` |

Hand-written content (extra paragraphs, sub-bullets, links, comments) survives every app edit.
Line endings (LF/CRLF) of the existing file are kept. "Today" is the device's local date.

## Auth

**GitHub App setup (manual, once):** private app, user-to-server tokens with expiry on,
callback URLs for production and preview domains (+ `http://localhost:5173/` for dev),
repository permission Contents: read & write, installed on `personal-hub` only.
Vercel env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Client env: `VITE_GITHUB_CLIENT_ID`.

**Sign-in**
1. SignIn page creates `state` and a PKCE verifier (sessionStorage) and redirects to
   `github.com/login/oauth/authorize` with `client_id`, `redirect_uri`, `state`, `code_challenge` (S256).
2. GitHub returns to `https://<nook>/?code=…&state=…#/`. On boot, before the router mounts,
   the app checks `state`, then `POST {AUTH_BASE_URL}/github/token {code, code_verifier}`.
3. The function adds the secret, calls GitHub's token endpoint, returns
   `{access_token, expires_in, refresh_token, refresh_token_expires_in}`; the app validates with zod.
4. The app fetches `/user` (login, avatar), saves everything in `useAuthStore`, replaces the URL
   with `#/hub`.
5. **Access check:** `GET /repos/{HUB_REPO}`. 404/403 → "Signed in as @login — nothing set up for this account."

**Refresh:** any call with < 5 min left on the access token refreshes first
(`POST {AUTH_BASE_URL}/github/token {refresh_token}`). One refresh in flight at a time.
A 401 triggers one refresh + retry; a second failure signs out with "Session ended, sign in again"
(cached data stays).

**Function contract** (`api/github/token.ts`): accepts exactly `{code, code_verifier}` or
`{refresh_token}` (zod, strict), POST only, same-origin. Returns GitHub's token fields or
`{error}` with 400/502. Never logs request bodies or the secret.

**Settings:** a GitHub row with avatar, `@login`, "Sign out" (clears tokens and Hub cache) and a
link to GitHub's app-authorization page for full revocation.

## Runtime data flow

**Load:** Hub renders the cached copy at once ("Updated 2h ago"), then refreshes in the
background: list `now/`, fetch each NOW file, `projects.md`, `ideas.md` in parallel, with
`If-None-Match` ETags. Triggers: opening Hub, returning to foreground after > 5 min, ↻.
**Each file fails on its own**: a file that won't fetch or parse shows an error card in its
section; the others render normally.

**Offline / unreachable:** cached copy + the amber banner ("Can't reach GitHub · Showing your
copy from …", Retry). New ideas go to a **pending queue** in `useHubStore` (persisted), shown at
the top of Ideas as "Not synced yet", sent automatically when back online (oldest first, each
exactly once). Note and stage controls are disabled with "Needs connection".

**Writes:** fetch latest `ideas.md` (text + sha) → apply the one edit to that fresh text →
`PUT` with the sha. "File changed" (409/422 on sha) → repeat from the fetch, at most 2 retries.
Target idea missing in fresh text → stop: "This idea changed elsewhere — reload." Success →
update cache from the response, toast.

**Plumbing**
- Service worker: never cache `api.github.com` or `/api/*`; `/api/*` excluded from `navigateFallback`.
- `vercel.json` CSP: `default-src 'self'; connect-src 'self' https://api.github.com;
  img-src 'self' data: https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'`
  (`unsafe-inline` styles only, for Radix and sonner; scripts stay `'self'`). The redirect to
  github.com is a top-level navigation, which CSP does not restrict.

## Screens

### Hub home — layout A

| Block | Content |
|---|---|
| 1 Header | Back to Nook · "Hub" · "Updated …" · refresh · avatar (sticky `PageHeader`) |
| 2 Needs you | Waiting-on-me items (oldest first), then quiet ideas in active stages (oldest first); max 3 rows + "+N more"; each row opens its project card or idea |
| 3 Now | One framed list, one row per NOW note: project · `machine · date`; next action in full with links; "Waiting on you N weeks · …" line; collapsible "In flight (n)" |
| 4 Ideas | Stage chips (Active default = idea + exploring + building; plus Idea, Exploring, Building, Shipped, Dropped); rows: title (≤ 2 lines), `date · last note`, stage pill, "Quiet for N weeks"; pending ideas dashed with "Not synced yet" |
| 5 Projects | Active projects: status dot · name · stack; "Show N paused or archived" expands the rest |
| 6 New idea | Primary button pinned to the bottom (phones) |

- **Desktop (≥ 1024px):** `max-w-6xl`, 12-column grid: left `col-span-7` = blocks 2 + 3,
  right `col-span-5` = blocks 4 + 5. Block 6 hidden; "New idea" sits in the Ideas header.
  Stage chips wrap instead of scrolling. Phones: single column `max-w-lg`, as in the rest of Nook.
- **Thresholds** (in `config.ts`): waiting ≥ 7 days → amber; idea with no progress line for
  ≥ 21 days → "Quiet for N weeks"; NOW note last worked ≥ 14 days ago → age shown in amber
  instead of the date.
- **States:** loading = skeleton rows in the same shapes; empty = "Nothing in personal-hub yet"
  + outline "Open personal-hub on GitHub" (New idea still works and creates `ideas.md`);
  unreachable = amber banner + cached data; signed out = SignIn page.
- **Stage pill:** neutral `bg-secondary` pill with a colored dot (building = success,
  exploring = primary, idea / shipped / dropped = muted-foreground).

### Idea detail (`/hub/ideas/:id`)

Back to Hub · title · stage pill · "Added …" · note paragraph · "Progress" timeline (oldest
first) · bottom actions **Add note** (primary) and **Move stage** (outline, menu of five stages
with the current one ticked + optional "why") · "Edit on GitHub" link to that heading.

### Dialogs

- **New idea:** title (required) + note (optional), Save. Offline → saved to the queue.
- **Add note:** one text box, Save.

### Sign-in

Hub mark · "Hub" · one line on what it shows · **Sign in with GitHub** · "Nook can only read and
edit the repo you install it on. Revoke any time in GitHub settings."

### Tokens

- **New `--warning`** (amber) for all four built-in themes; derived for `custom` palettes in
  `theme.ts`. Wireframe values: light `30 90% 31%`, dark `38 92% 60%`.
- Known, not changed here: light-theme white on `--primary` is 4.29:1 (under 4.5:1). It affects
  every primary button in Nook; fixing it is a separate brand decision.

## Testing

**Unit (Vitest, `fetch` mocked, no live GitHub):**
- `parse-now`, `parse-projects`: real notes, missing fields, `—`, unknown keys, waiting-since date.
- `ideas`: parse; each edit changes only its own lines; messy hand-written input, CRLF, Vietnamese
  text and emoji, duplicate titles, missing `Stage:`, empty file / missing file.
- `needs-you` and thresholds with an injected "today".
- `auth`: PKCE challenge against a known vector; state mismatch rejected; single-flight refresh;
  bad token response rejected.
- `github/client`: UTF-8 base64 round-trip; retry on sha conflict; give up after 2.
- Pending queue: queued, synced once, never sent twice.
- `api/github/token`: rejects missing/extra fields and non-POST; passes the refresh grant; never
  echoes the secret.

**Manual before merge:** real sign-in on a Vercel preview; app installed on personal-hub only;
second GitHub account sees "nothing set up"; offline capture then sync; conflict (edit
`ideas.md` on the PC, then add a note on the phone); probe the built Hub against wireframe A at
375 and 1440 in dark and light.

## Setup tasks outside Nook (personal-hub)

1. Create `projects.md` from the `CLAUDE.md` project table and `ideas.md` (`# Ideas`); add both to
   the allow-list `.gitignore`.
2. **Machine names:** `machine-setup/setup.mjs` writes the name (`pc`, `fedora`, `work-laptop`)
   to `~/.claude/machine-name`; the `wrap` skill writes it in `Last worked`, and no file means
   `phone` (cloud sessions).
3. **`wrap` rule:** `Next action` is a plain sentence — verb, what, why — with references (PR,
   branch, file) in brackets at the end, never a bare commit hash.

## Out of scope (v1)

PIN lock · deleting or renaming ideas in the app · editing NOW notes or projects in the app ·
queued notes/stage moves while offline · repo activity feed · the NestJS BFF (the planned
upgrade: tokens server-side in an httpOnly cookie, GitHub calls proxied).
