# Hub Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add **Hub**, a second Nook mini-app that shows work in progress, ideas and projects from the private `personal-hub` repo and lets ideas be captured and moved forward from the phone.

**Architecture:** Pure, unit-tested parsers and line-surgical editors for three markdown sources (`now/*.md`, `projects.md`, `ideas.md`) sit in `src/apps/hub/lib/`. A small GitHub REST client and a GitHub App sign-in (PKCE + one Vercel function holding the client secret) feed a persisted Zustand store that caches files, queues offline ideas and retries writes on conflict. React screens follow wireframe option **A**.

**Tech Stack:** Vite 6, React 18, TypeScript (strict), Tailwind v3 + shadcn/Radix (`src/shared/ui`), Zustand 5 (`persist`), zod 3, lucide-react, vite-plugin-pwa, Vitest 2 (node env), Vercel Functions (Web `Request`/`Response` handler).

**Spec:** `docs/features/2026-10-hub-dashboard/spec.md` (visual reference: `docs/features/2026-10-hub-dashboard/wireframe.html`, option A — serve the folder with any static server and open `?v=a&mau=mau`).

## Global Constraints

- **No new npm dependencies.** Use `fetch`, Web Crypto, `TextEncoder`/`TextDecoder`, zod, Zustand, lucide-react, existing `src/shared/ui` components.
- Repo: `HUB_REPO` default `"Kane-SE/personal-hub"`; auth base URL default `"/api"`; both overridable by `VITE_HUB_REPO` / `VITE_AUTH_BASE_URL`.
- GitHub App: private, user-to-server tokens with expiry, Contents: read & write, installed on `personal-hub` only. Server env `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; client env `VITE_GITHUB_CLIENT_ID`.
- Token refresh when **< 5 min** of access-token life is left; one refresh in flight at a time.
- Write retries on sha conflict: **at most 2 retries**.
- Thresholds: waiting ≥ **7** days → amber; idea quiet ≥ **21** days; NOW note stale ≥ **14** days.
- Stages, exact spelling: `idea` · `exploring` · `building` · `shipped` · `dropped`. "Active" = `idea` + `exploring` + `building`.
- **No delete in the app.** Only add idea, add note, move stage.
- Commit messages written by the app: `hub: add idea "<title>"`, `hub: note on "<title>"`, `hub: move "<title>" to <stage>`.
- Progress line format written by the app: `- YYYY-MM-DD — text` (em dash). Parser also accepts ` - ` and ` – `.
- UI copy is English. All colors come from tokens (`bg-card`, `text-warning`, …); no hard-coded hex in components.
- Layout A: phones `max-w-lg` single column; ≥ 1024px `lg:max-w-6xl`, 12-col grid, left `col-span-7` (Needs you, Now), right `col-span-5` (Ideas, Projects).
- `main` changes only through a PR. Work on branch `feature/hub-dashboard` (already created; the spec commit is on it).
- Every commit ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`ideas.md` edited on Windows or GitHub web** (CRLF line endings, no trailing newline, mixed endings) — an app edit must keep the file's line endings and change only the intended lines. *Test added in Task 6.*
2. **A queued offline idea whose PUT succeeded but whose response was lost** — retrying must not create a duplicate idea. *Test added in Task 11.*
3. **GitHub sign-in cancelled** (`?error=access_denied&state=…` comes back instead of a code) — the callback page must show "Sign-in was cancelled", not hang or loop. *Test added in Task 9.*
4. **Refresh token expired after months unused** — the app must sign out cleanly and keep the cached dashboard visible, not throw on every call. *Test added in Task 9.*
5. **`now/` folder missing or containing non-markdown files** (`.gitkeep`, a sub-folder) — Hub must show the other sections and an empty Now list, not an error. *Test added in Task 11.*

---

## File Structure

```text
api/github/token.ts                         Vercel function (POST): code→tokens, refresh→tokens
src/test/token-endpoint.test.ts             tests for the function (kept out of api/ so Vercel doesn't deploy it)

src/apps/hub/
  config.ts                                 HUB_REPO, AUTH_BASE_URL, GITHUB_CLIENT_ID, THRESHOLDS, paths
  routes.tsx                                /hub, /hub/callback, /hub/ideas/:id
  lib/types.ts                              Stage, WipCard, Project, Idea, NeedsYouItem …
  lib/text.ts (+ .test.ts)                  base64 UTF-8, line split/join with EOL, slugify, githubAnchor
  lib/dates.ts (+ .test.ts)                 localDate, daysBetween, formatDay, relativeTime, formatStamp
  lib/parse-now.ts (+ .test.ts)             now/*.md → WipCard
  lib/parse-projects.ts (+ .test.ts)        projects.md → Project[]
  lib/ideas.ts (+ .test.ts)                 ideas.md ↔ Idea[]; addIdeaText / addNoteText / moveStageText
  lib/needs-you.ts (+ .test.ts)             needsYou(), quietDays(), staleDays(), waitingDays(), ageLabel()
  lib/__fixtures__/*.md                     sample notes used by tests and the dev demo
  auth/pkce.ts                              randomString, codeChallenge
  auth/github-auth.ts                       startSignIn, completeSignIn, refreshSession, AuthError
  auth/useAuthStore.ts                      persisted session/user/access
  auth/session.ts                           getAccessToken, forceRefresh (single-flight)
  auth/auth.test.ts                         tests for pkce, github-auth, session
  github/client.ts (+ .test.ts)             createGitHubClient: getUser, checkAccess, listDir, getFile, putFile
  github/instance.ts                        getHubClient() (real or dev demo)
  store/useHubStore.ts (+ .test.ts)         cache, refresh, writes with retry, pending queue, describeError
  dev/demo.ts                               dev-only fake session + in-memory client (`?hub-demo`)
  hooks/useOnline.ts
  components/                               SectionHead, StageBadge, Linkified, NeedsYouList, WipList,
                                            IdeaRow, IdeasSection, ProjectList, SyncBanner, HubSkeleton,
                                            HubEmpty, HubAvatar, NewIdeaDialog, AddNoteDialog, MoveStageDialog
  pages/                                    HubHome, HubDashboard, IdeaDetail, SignIn, NoAccess, AuthCallback

Modified: src/index.css, tailwind.config.js, src/shared/lib/palette.ts (+test), src/shared/components/PageHeader.tsx,
          src/App.tsx, src/main.tsx, src/launcher/registry.ts, src/settings/Settings.tsx (+ new src/settings/GitHubCard.tsx),
          src/vite-env.d.ts, tsconfig.json, vite.config.ts, index.html (+ new public/status-bar.js),
          new vercel.json, new .env.example, new docs/hub-setup.md, README.md
```

Test command for every task: `npm test` (runs `vitest run`). Type check: `npx tsc --noEmit`.

---

### Task 1: `--warning` color token

**Files:**
- Modify: `src/index.css` (each of the four palette blocks)
- Modify: `tailwind.config.js` (colors)
- Modify: `src/shared/lib/palette.ts` (`TOKEN_NAMES`, `deriveTokens`)
- Test: `src/shared/lib/palette.test.ts`

**Interfaces:**
- Produces: Tailwind color `warning` (`text-warning`, `bg-warning/10`, `border-warning/30`); CSS var `--warning` in every theme including `custom`.

- [ ] **Step 1: Write the failing test** — in `src/shared/lib/palette.test.ts`, change the title `'produces a value for every one of the 19 tokens'` to `'produces a value for every one of the 20 tokens'`, and add inside `describe('deriveTokens', …)`:

```ts
  it('derives a warning token that stays readable on light and dark backgrounds', () => {
    const dark = deriveTokens({ ...sample, background: '#0f1117', foreground: '#f2f3f7' })
    const light = deriveTokens({ ...sample, background: '#fafafa', foreground: '#111111' })
    expect(dark.warning).toBe('38 92% 60%')
    expect(light.warning).toBe('30 90% 31%')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/palette.test.ts`
Expected: FAIL — `warning` missing from `TOKEN_NAMES` / `undefined` instead of `'38 92% 60%'`.

- [ ] **Step 3: Implement**

`src/shared/lib/palette.ts` — append `'warning'` to `TOKEN_NAMES` (after `'success-foreground'`):

```ts
export const TOKEN_NAMES = [
  'background', 'foreground', 'card', 'card-foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive', 'destructive-foreground', 'success', 'success-foreground', 'warning', 'border', 'input', 'ring',
]
```

and in `deriveTokens`, add after the `'success-foreground'` line:

```ts
    // Amber for "waiting"/"quiet" signals. Fixed hue so it reads as a warning in any custom palette.
    warning: isLight ? '30 90% 31%' : '38 92% 60%',
```

`src/index.css` — add one line to each block, right after its `--success-foreground` line:

```css
    --warning: 30 90% 31%;           /* [data-theme='light'] / :root */
    --warning: 38 92% 60%;           /* [data-theme='dark'] */
    --warning: 28 80% 30%;           /* [data-theme='coffee'] */
    --warning: 36 85% 62%;           /* [data-theme='coffee-dark'] */
```

(Put exactly one `--warning` line in each block with the value shown for that block; the comments above only say which block gets which value — do not paste the comments.) Also add `warning = amber` to the sentence about functional tokens in the header comment: change `Functional tokens (destructive = red, success = green)` to `Functional tokens (destructive = red, success = green, warning = amber)`.

`tailwind.config.js` — inside `colors`, after the `success` entry:

```js
        warning: {
          DEFAULT: 'hsl(var(--warning))',
        },
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.js src/shared/lib/palette.ts src/shared/lib/palette.test.ts
git commit -m "feat(theme): add an amber --warning token to every palette" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Hub types, text and date helpers, config

**Files:**
- Create: `src/apps/hub/lib/types.ts`, `src/apps/hub/lib/text.ts`, `src/apps/hub/lib/dates.ts`, `src/apps/hub/config.ts`
- Modify: `src/vite-env.d.ts`
- Test: `src/apps/hub/lib/text.test.ts`, `src/apps/hub/lib/dates.test.ts`

**Interfaces:**
- Produces (types.ts):

```ts
export type Stage = 'idea' | 'exploring' | 'building' | 'shipped' | 'dropped'
export const STAGES: Stage[]                       // in that order
export const ACTIVE_STAGES: Stage[]                // ['idea', 'exploring', 'building']
export interface WipCard { file: string; project: string; lastWorked: string | null; machine: string | null;
  nextAction: string | null; waitingOnMe: string | null; waitingSince: string | null;
  waitingOnOthers: string | null; inFlight: string[] }
export type ProjectStatus = 'active' | 'paused' | 'archived'
export interface Project { name: string; status: ProjectStatus; stack: string | null; link: string | null; summary: string | null }
export interface ProgressNote { date: string; text: string }
export interface Idea { id: string; title: string; stage: Stage; added: string | null; note: string | null; progress: ProgressNote[] }
export type NeedsYouTarget = { type: 'project'; project: string } | { type: 'idea'; id: string }
export interface NeedsYouItem { kind: 'waiting' | 'quiet'; title: string; context: string; days: number; target: NeedsYouTarget }
```

- Produces (text.ts): `type Eol = '\n' | '\r\n'`; `encodeBase64Utf8(text: string): string`; `decodeBase64Utf8(b64: string): string`; `interface Lines { lines: string[]; eol: Eol; trailingNewline: boolean }`; `splitLines(text: string): Lines`; `joinLines(lines: string[], eol: Eol, trailingNewline: boolean): string`; `oneLine(text: string): string`; `slugify(title: string): string`; `githubAnchor(title: string): string`.
- Produces (dates.ts): `isIsoDate(s: string): boolean`; `localDate(d: Date): string`; `daysBetween(fromIso: string, to: Date): number`; `formatDay(iso: string, today: Date): string`; `formatStamp(ms: number): string`; `relativeTime(ms: number, nowMs: number): string`.
- Produces (config.ts): `HUB_REPO`, `AUTH_BASE_URL`, `GITHUB_CLIENT_ID`, `THRESHOLDS = { waitingAmberDays: 7, quietDays: 21, staleDays: 14 }`, `NOW_DIR = 'now'`, `PROJECTS_PATH = 'projects.md'`, `IDEAS_PATH = 'ideas.md'`, `githubIdeaUrl(title: string): string`, `githubRepoUrl(): string`.

- [ ] **Step 1: Write the failing tests**

`src/apps/hub/lib/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decodeBase64Utf8, encodeBase64Utf8, githubAnchor, joinLines, oneLine, slugify, splitLines } from './text'

describe('base64 UTF-8', () => {
  it('round-trips Vietnamese text and emoji', () => {
    const text = 'Đặt món nhóm 🍜\nGhi chú tiếng Việt.\n'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })
  it('decodes GitHub content that has line breaks inside the base64', () => {
    const b64 = encodeBase64Utf8('# Ideas\n')
    const wrapped = `${b64.slice(0, 4)}\n${b64.slice(4)}\n`
    expect(decodeBase64Utf8(wrapped)).toBe('# Ideas\n')
  })
})

describe('splitLines / joinLines', () => {
  it('keeps LF files byte-identical', () => {
    const text = 'a\nb\n\nc\n'
    const { lines, eol, trailingNewline } = splitLines(text)
    expect(lines).toEqual(['a', 'b', '', 'c'])
    expect(eol).toBe('\n')
    expect(joinLines(lines, eol, trailingNewline)).toBe(text)
  })
  it('keeps CRLF files byte-identical', () => {
    const text = 'a\r\nb\r\n'
    const parts = splitLines(text)
    expect(parts.eol).toBe('\r\n')
    expect(joinLines(parts.lines, parts.eol, parts.trailingNewline)).toBe(text)
  })
  it('remembers a missing trailing newline', () => {
    const parts = splitLines('a\nb')
    expect(parts.trailingNewline).toBe(false)
    expect(joinLines(parts.lines, parts.eol, parts.trailingNewline)).toBe('a\nb')
  })
  it('treats an empty string as no lines', () => {
    expect(splitLines('').lines).toEqual([])
  })
})

describe('oneLine', () => {
  it('collapses line breaks into single spaces and trims', () => {
    expect(oneLine('  first\r\n second \n')).toBe('first second')
  })
})

describe('slugify', () => {
  it('lowercases, strips accents and joins words with dashes', () => {
    expect(slugify('Photo-tagging for Nomnoms')).toBe('photo-tagging-for-nomnoms')
    expect(slugify('Đặt món nhóm 🍜')).toBe('dat-mon-nhom')
  })
  it('never returns an empty slug', () => {
    expect(slugify('🍜🍜')).toBe('idea')
  })
})

describe('githubAnchor', () => {
  it('matches GitHub heading anchors: lowercase, punctuation dropped, spaces to dashes', () => {
    expect(githubAnchor('Photo-tagging for Nomnoms!')).toBe('photo-tagging-for-nomnoms')
    expect(githubAnchor('Đặt món nhóm')).toBe('đặt-món-nhóm')
  })
})
```

`src/apps/hub/lib/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { daysBetween, formatDay, isIsoDate, localDate, relativeTime } from './dates'

const today = new Date(2026, 9, 5, 15, 30) // 5 Oct 2026, local time

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03')
  })
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-10-05')).toBe(true)
    expect(isIsoDate('2026-13-05')).toBe(false)
    expect(isIsoDate('5 Oct')).toBe(false)
  })
  it('counts whole local days between a date and now', () => {
    expect(daysBetween('2026-10-05', today)).toBe(0)
    expect(daysBetween('2026-10-04', today)).toBe(1)
    expect(daysBetween('2026-08-17', today)).toBe(49)
  })
  it('formats days relative to today', () => {
    expect(formatDay('2026-10-05', today)).toBe('Today')
    expect(formatDay('2026-10-04', today)).toBe('Yesterday')
    expect(formatDay('2026-09-30', today)).toBe('30 Sep')
    expect(formatDay('2025-12-30', today)).toBe('30 Dec 2025')
  })
  it('describes how long ago something was fetched', () => {
    const now = today.getTime()
    expect(relativeTime(now - 20_000, now)).toBe('just now')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(relativeTime(now - 2 * 3_600_000, now)).toBe('2h ago')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apps/hub/lib`
Expected: FAIL — cannot find modules `./text`, `./dates`.

- [ ] **Step 3: Implement**

`src/apps/hub/lib/types.ts`:

```ts
/** Shared shapes for the Hub app. Parsers in lib/ produce these from personal-hub markdown. */

export type Stage = 'idea' | 'exploring' | 'building' | 'shipped' | 'dropped'
export const STAGES: Stage[] = ['idea', 'exploring', 'building', 'shipped', 'dropped']
/** Stages shown under the "Active" filter and eligible for "quiet" nudges. */
export const ACTIVE_STAGES: Stage[] = ['idea', 'exploring', 'building']

/** One `now/<project>.md` note. Dates are YYYY-MM-DD strings. */
export interface WipCard {
  file: string
  project: string
  lastWorked: string | null
  machine: string | null
  nextAction: string | null
  waitingOnMe: string | null
  waitingSince: string | null
  waitingOnOthers: string | null
  inFlight: string[]
}

export type ProjectStatus = 'active' | 'paused' | 'archived'

export interface Project {
  name: string
  status: ProjectStatus
  stack: string | null
  link: string | null
  summary: string | null
}

export interface ProgressNote {
  date: string
  text: string
}

export interface Idea {
  /** Slug of the heading; `-2`, `-3`… for duplicate titles in file order. */
  id: string
  title: string
  stage: Stage
  added: string | null
  note: string | null
  /** Oldest first, as written in the file. */
  progress: ProgressNote[]
}

export type NeedsYouTarget = { type: 'project'; project: string } | { type: 'idea'; id: string }

export interface NeedsYouItem {
  kind: 'waiting' | 'quiet'
  title: string
  context: string
  days: number
  target: NeedsYouTarget
}
```

`src/apps/hub/lib/text.ts`:

```ts
/** Text plumbing for markdown files fetched from GitHub. Pure, no DOM. */

export type Eol = '\n' | '\r\n'

export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** GitHub wraps base64 content at 60 columns; whitespace is ignored. */
export function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export interface Lines {
  lines: string[]
  eol: Eol
  trailingNewline: boolean
}

/** Split into lines, remembering the file's line ending and whether it ended with one. */
export function splitLines(text: string): Lines {
  const eol: Eol = text.includes('\r\n') ? '\r\n' : '\n'
  if (text === '') return { lines: [], eol, trailingNewline: false }
  const lines = text.split(/\r?\n/)
  const trailingNewline = lines[lines.length - 1] === ''
  if (trailingNewline) lines.pop()
  return { lines, eol, trailingNewline }
}

export function joinLines(lines: string[], eol: Eol, trailingNewline: boolean): string {
  if (lines.length === 0) return ''
  return lines.join(eol) + (trailingNewline ? eol : '')
}

/** User input that must fit on one markdown line. */
export function oneLine(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ' ').trim()
}

/** Stable id for an idea heading. */
export function slugify(title: string): string {
  const slug = title
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'idea'
}

/** The anchor GitHub generates for a markdown heading (first occurrence). */
export function githubAnchor(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
}
```

`src/apps/hub/lib/dates.ts`:

```ts
/** Local-calendar date helpers. Dates in notes are YYYY-MM-DD in the user's own time zone. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86_400_000

export function isIsoDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function localDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Whole calendar days from `fromIso` to `to` (negative if `fromIso` is in the future). */
export function daysBetween(fromIso: string, to: Date): number {
  const start = parseIso(fromIso)
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

export function formatDay(iso: string, today: Date): string {
  const days = daysBetween(iso, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const d = parseIso(iso)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

export function formatStamp(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mi}`
}

export function relativeTime(ms: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - ms)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h ago`
  return formatStamp(ms)
}
```

`src/apps/hub/config.ts`:

```ts
import { githubAnchor } from '@/apps/hub/lib/text'

/** Build-time settings for Hub. Override with VITE_* env vars (see .env.example). */
export const HUB_REPO: string = import.meta.env.VITE_HUB_REPO || 'Kane-SE/personal-hub'
export const AUTH_BASE_URL: string = import.meta.env.VITE_AUTH_BASE_URL || '/api'
export const GITHUB_CLIENT_ID: string = import.meta.env.VITE_GITHUB_CLIENT_ID || ''

export const THRESHOLDS = {
  /** "Waiting on you" turns amber from this many days. */
  waitingAmberDays: 7,
  /** An active idea with no activity for this many days is "quiet". */
  quietDays: 21,
  /** A NOW note last worked this many days ago shows its age in amber. */
  staleDays: 14,
} as const

export type Thresholds = typeof THRESHOLDS

export const NOW_DIR = 'now'
export const PROJECTS_PATH = 'projects.md'
export const IDEAS_PATH = 'ideas.md'

export function githubRepoUrl(): string {
  return `https://github.com/${HUB_REPO}`
}

export function githubIdeaUrl(title: string): string {
  return `${githubRepoUrl()}/blob/main/${IDEAS_PATH}#${githubAnchor(title)}`
}
```

`src/vite-env.d.ts` — replace the file with:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID?: string
  readonly VITE_HUB_REPO?: string
  readonly VITE_AUTH_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```


- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/lib` then `npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub src/vite-env.d.ts
git commit -m "feat(hub): add shared types, text/date helpers and config" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fixtures and the NOW-note parser

**Files:**
- Create: `src/apps/hub/lib/__fixtures__/now-bill-splitter.md`, `now-idle-farming.md`, `projects.md`, `ideas.md`
- Create: `src/apps/hub/lib/parse-now.ts`
- Test: `src/apps/hub/lib/parse-now.test.ts`

**Interfaces:**
- Consumes: `WipCard` (types.ts), `splitLines` (text.ts), `isIsoDate` (dates.ts)
- Produces: `parseNowNote(file: string, text: string): WipCard`

- [ ] **Step 1: Create fixtures**

`src/apps/hub/lib/__fixtures__/now-bill-splitter.md`:

```markdown
# NOW — bill-splitter

Last worked: 2026-09-30 · pc
Next action: Decide whether the Vercel SPA-rewrite fix is still needed (the app uses HashRouter, so probably not), then open a PR or delete the branch (branch feat/nomnom-launcher)
Waiting on me: photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17
Waiting on others: —
In flight: main = PR #2 merged 2026-09-30 · main auto-deploys on Vercel, so changes go through a branch + PR
Plans & decisions: bill-splitter/DEPLOY.md · bill-splitter/docs/superpowers/specs/
```

`src/apps/hub/lib/__fixtures__/now-idle-farming.md`:

```markdown
# NOW — idle-farming

Last worked: 2026-09-12 · fedora
Next action: Pick the art direction for the flower sprites (research/palettes.md)
Waiting on me: Choose a working title
Waiting on others: —
In flight: —
Plans & decisions: idle-farming/decisions.md
```

`src/apps/hub/lib/__fixtures__/projects.md`:

```markdown
# Projects

## bill-splitter
Status: active
Stack: Vite · React · PWA
Link: https://github.com/Kane-SE/bill-splitter

Nook: little offline tools (Split, Hub).

## automation-app
Status: active
Stack: Electron · Playwright

## calendar
Status: paused
Stack: Vanilla JS

Standalone calendar widget.

## test
Status: archived
```

`src/apps/hub/lib/__fixtures__/ideas.md`:

```markdown
# Ideas

## Hub dashboard in Nook
Stage: building
Added: 2026-10-04

- 2026-10-04 — Idea captured
- 2026-10-05 — Design approved, writing the spec

## Photo-tagging for Nomnoms
Stage: exploring
Added: 2026-08-17

Tag people on the receipt photo so items split themselves.

- 2026-08-17 — Idea captured
- 2026-09-02 — Grilled the design, rounds 1–4

## Receipt OCR to pre-fill Nomnom items
Stage: idea
Added: 2026-09-20

- 2026-09-20 — Idea captured

## Nook launcher rebrand
Stage: shipped
Added: 2026-09-25

- 2026-09-30 — Shipped in PR #2
```

- [ ] **Step 2: Write the failing test** — `src/apps/hub/lib/parse-now.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import { parseNowNote } from './parse-now'

describe('parseNowNote', () => {
  it('reads every field of a real NOW note', () => {
    expect(parseNowNote('now/bill-splitter.md', bill)).toEqual({
      file: 'now/bill-splitter.md',
      project: 'bill-splitter',
      lastWorked: '2026-09-30',
      machine: 'pc',
      nextAction:
        'Decide whether the Vercel SPA-rewrite fix is still needed (the app uses HashRouter, so probably not), then open a PR or delete the branch (branch feat/nomnom-launcher)',
      waitingOnMe: 'photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17',
      waitingSince: '2026-08-17',
      waitingOnOthers: null,
      inFlight: ['main = PR #2 merged 2026-09-30', 'main auto-deploys on Vercel, so changes go through a branch + PR'],
    })
  })

  it('falls back to the last-worked date when the waiting text has no date', () => {
    const card = parseNowNote('now/idle-farming.md', idle)
    expect(card.waitingSince).toBe('2026-09-12')
    expect(card.inFlight).toEqual([])
  })

  it('uses the file name when the title is missing and ignores unknown keys', () => {
    const card = parseNowNote('now/calendar.md', 'Mood: sleepy\nNext action: Fix the week view\n')
    expect(card.project).toBe('calendar')
    expect(card.nextAction).toBe('Fix the week view')
    expect(card.lastWorked).toBeNull()
  })

  it('keeps a machine description that is not a short name', () => {
    const card = parseNowNote('now/x.md', 'Last worked: 2026-09-30 · another machine (commits authored "X")\n')
    expect(card.machine).toBe('another machine (commits authored "X")')
  })

  it('handles CRLF files', () => {
    expect(parseNowNote('now/b.md', bill.replace(/\n/g, '\r\n')).machine).toBe('pc')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/lib/parse-now.test.ts`
Expected: FAIL — cannot find `./parse-now`.

- [ ] **Step 4: Implement** — `src/apps/hub/lib/parse-now.ts`:

```ts
import type { WipCard } from '@/apps/hub/lib/types'
import { splitLines } from '@/apps/hub/lib/text'
import { isIsoDate } from '@/apps/hub/lib/dates'

const TITLE = /^#\s+NOW\s+[—–-]\s+(.+)$/
const FIELD = /^([A-Za-z][A-Za-z &]*?):\s*(.*)$/

/** Parse one `now/<project>.md` note written by the wrap skill. Unknown keys are ignored. */
export function parseNowNote(file: string, text: string): WipCard {
  const fields = new Map<string, string>()
  let project: string | null = null

  for (const raw of splitLines(text).lines) {
    const line = raw.trim()
    const title = line.match(TITLE)
    if (title) {
      project ??= title[1].trim()
      continue
    }
    const field = line.match(FIELD)
    if (field && !fields.has(field[1].toLowerCase())) fields.set(field[1].toLowerCase(), field[2].trim())
  }

  const value = (key: string): string | null => {
    const v = fields.get(key)
    return v && v !== '—' && v !== '-' ? v : null
  }

  let lastWorked: string | null = null
  let machine: string | null = null
  const lastWorkedRaw = value('last worked')
  if (lastWorkedRaw) {
    const [date, ...rest] = lastWorkedRaw.split('·').map((s) => s.trim())
    lastWorked = isIsoDate(date) ? date : null
    machine = rest.join(' · ') || null
  }

  const waitingOnMe = value('waiting on me')
  const waitingSince = waitingOnMe
    ? (waitingOnMe.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? lastWorked)
    : null
  const inFlightRaw = value('in flight')

  return {
    file,
    project: project ?? file.split('/').pop()!.replace(/\.md$/, ''),
    lastWorked,
    machine,
    nextAction: value('next action'),
    waitingOnMe,
    waitingSince,
    waitingOnOthers: value('waiting on others'),
    inFlight: inFlightRaw ? inFlightRaw.split(' · ').map((s) => s.trim()).filter(Boolean) : [],
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/apps/hub/lib/parse-now.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/apps/hub/lib
git commit -m "feat(hub): parse NOW notes into work-in-progress cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Projects parser

**Files:**
- Create: `src/apps/hub/lib/parse-projects.ts`
- Test: `src/apps/hub/lib/parse-projects.test.ts`

**Interfaces:**
- Consumes: `Project`, `ProjectStatus` (types.ts), `splitLines` (text.ts)
- Produces: `parseProjects(text: string | null): Project[]`

- [ ] **Step 1: Write the failing test** — `src/apps/hub/lib/parse-projects.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import projects from './__fixtures__/projects.md?raw'
import { parseProjects } from './parse-projects'

describe('parseProjects', () => {
  it('reads each ## block in file order', () => {
    expect(parseProjects(projects)).toEqual([
      { name: 'bill-splitter', status: 'active', stack: 'Vite · React · PWA', link: 'https://github.com/Kane-SE/bill-splitter', summary: 'Nook: little offline tools (Split, Hub).' },
      { name: 'automation-app', status: 'active', stack: 'Electron · Playwright', link: null, summary: null },
      { name: 'calendar', status: 'paused', stack: 'Vanilla JS', link: null, summary: 'Standalone calendar widget.' },
      { name: 'test', status: 'archived', stack: null, link: null, summary: null },
    ])
  })

  it('treats a missing or unknown status as active', () => {
    const out = parseProjects('## a\nStatus: someday\n\n## b\n')
    expect(out.map((p) => p.status)).toEqual(['active', 'active'])
  })

  it('returns nothing for a missing file', () => {
    expect(parseProjects(null)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/lib/parse-projects.test.ts`
Expected: FAIL — cannot find `./parse-projects`.

- [ ] **Step 3: Implement** — `src/apps/hub/lib/parse-projects.ts`:

```ts
import type { Project, ProjectStatus } from '@/apps/hub/lib/types'
import { splitLines } from '@/apps/hub/lib/text'

const STATUSES: ProjectStatus[] = ['active', 'paused', 'archived']

interface Draft extends Project {
  paragraph: string[]
  paragraphDone: boolean
}

/** Parse `projects.md`: one `## name` block per project with Status/Stack/Link lines and a summary paragraph. */
export function parseProjects(text: string | null): Project[] {
  if (!text) return []
  const out: Project[] = []
  let cur: Draft | null = null

  const flush = () => {
    if (!cur) return
    const c: Draft = cur
    out.push({ name: c.name, status: c.status, stack: c.stack, link: c.link, summary: c.paragraph.length ? c.paragraph.join(' ') : null })
    cur = null
  }

  for (const raw of splitLines(text).lines) {
    const heading = raw.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      flush()
      cur = { name: heading[1], status: 'active', stack: null, link: null, summary: null, paragraph: [], paragraphDone: false }
      continue
    }
    if (/^#\s/.test(raw)) {
      flush()
      continue
    }
    if (!cur) continue
    const line = raw.trim()
    const field = line.match(/^(Status|Stack|Link):\s*(.*)$/i)
    if (field) {
      const key = field[1].toLowerCase()
      const value = field[2].trim()
      if (key === 'status') cur.status = STATUSES.find((s) => s === value.toLowerCase()) ?? 'active'
      else if (key === 'stack') cur.stack = value || null
      else cur.link = value || null
      continue
    }
    if (line === '') {
      if (cur.paragraph.length) cur.paragraphDone = true
      continue
    }
    if (!cur.paragraphDone && !/^[-*]\s/.test(line)) cur.paragraph.push(line)
  }
  flush()
  return out
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/lib/parse-projects.test.ts && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/lib
git commit -m "feat(hub): parse projects.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ideas parser

**Files:**
- Create: `src/apps/hub/lib/ideas.ts`
- Test: `src/apps/hub/lib/ideas.test.ts`

**Interfaces:**
- Consumes: `Idea`, `Stage`, `STAGES` (types.ts), `splitLines`, `slugify` (text.ts), `isIsoDate` (dates.ts)
- Produces: `parseIdeas(text: string | null): Idea[]`; `toStage(value: string): Stage`; internal `findBlocks(lines: string[]): Block[]` and regex constants reused by Task 6 in the same file.

- [ ] **Step 1: Write the failing test** — `src/apps/hub/lib/ideas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/ideas.md?raw'
import { parseIdeas } from './ideas'

export const MESSY = [
  '# Ideas',
  '',
  'Free text the app must not touch.',
  '',
  '## Photo-tagging for Nomnoms',
  'Stage: exploring',
  'Added: 2026-08-17',
  '',
  'Tag people on the receipt photo.',
  'Second line of the same paragraph.',
  '',
  '- 2026-08-17 — Idea captured',
  '  - a hand-written sub-bullet',
  '- 2026-09-02 - Grilled the design',
  '',
  '<!-- private comment -->',
  '',
  '## Đặt món nhóm 🍜',
  'Added: 2026-09-01',
  '',
  'Ghi chú tiếng Việt.',
  '',
  '```',
  '## not a heading inside a code fence',
  '```',
  '',
  '## Photo-tagging for Nomnoms',
  'Stage: idea',
  '',
].join('\n')

describe('parseIdeas', () => {
  it('reads the fixture', () => {
    const ideas = parseIdeas(fixture)
    expect(ideas.map((i) => [i.id, i.stage])).toEqual([
      ['hub-dashboard-in-nook', 'building'],
      ['photo-tagging-for-nomnoms', 'exploring'],
      ['receipt-ocr-to-pre-fill-nomnom-items', 'idea'],
      ['nook-launcher-rebrand', 'shipped'],
    ])
    expect(ideas[1]).toEqual({
      id: 'photo-tagging-for-nomnoms',
      title: 'Photo-tagging for Nomnoms',
      stage: 'exploring',
      added: '2026-08-17',
      note: 'Tag people on the receipt photo so items split themselves.',
      progress: [
        { date: '2026-08-17', text: 'Idea captured' },
        { date: '2026-09-02', text: 'Grilled the design, rounds 1–4' },
      ],
    })
  })

  it('copes with hand-written content, hyphen separators, missing Stage, code fences and duplicates', () => {
    const ideas = parseIdeas(MESSY)
    expect(ideas.map((i) => i.id)).toEqual(['photo-tagging-for-nomnoms', 'dat-mon-nhom', 'photo-tagging-for-nomnoms-2'])
    expect(ideas[0].note).toBe('Tag people on the receipt photo. Second line of the same paragraph.')
    expect(ideas[0].progress).toEqual([
      { date: '2026-08-17', text: 'Idea captured' },
      { date: '2026-09-02', text: 'Grilled the design' },
    ])
    expect(ideas[1]).toMatchObject({ title: 'Đặt món nhóm 🍜', stage: 'idea', added: '2026-09-01', note: 'Ghi chú tiếng Việt.' })
  })

  it('treats an unknown stage as idea and a missing file as no ideas', () => {
    expect(parseIdeas('## X\nStage: someday\n')[0].stage).toBe('idea')
    expect(parseIdeas(null)).toEqual([])
    expect(parseIdeas('')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/lib/ideas.test.ts`
Expected: FAIL — cannot find `./ideas`.

- [ ] **Step 3: Implement** — `src/apps/hub/lib/ideas.ts`:

```ts
import { STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import { slugify, splitLines } from '@/apps/hub/lib/text'
import { isIsoDate } from '@/apps/hub/lib/dates'

/** `- 2026-09-02 — text`; also accepts ` - ` and ` – ` separators and `*` bullets. */
export const PROGRESS_LINE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.*)$/
export const STAGE_LINE = /^Stage:\s*(.*)$/i
const ADDED_LINE = /^Added:\s*(.*)$/i
const HEADING = /^##\s+(.+?)\s*$/
const FENCE = /^\s*(```|~~~)/

export interface Block {
  id: string
  title: string
  /** Index of the `## ` heading line. */
  start: number
  /** Index one past the block's last line. */
  end: number
}

/** Locate every `## ` idea block, skipping headings inside code fences. */
export function findBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  const seen = new Map<string, number>()
  let inFence = false
  const close = (at: number) => {
    const last = blocks[blocks.length - 1]
    if (last && last.end === -1) last.end = at
  }
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const heading = lines[i].match(HEADING)
    if (heading || /^#\s/.test(lines[i])) close(i)
    if (heading) {
      const title = heading[1].trim()
      const base = slugify(title)
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      blocks.push({ id: n === 1 ? base : `${base}-${n}`, title, start: i, end: -1 })
    }
  }
  close(lines.length)
  return blocks
}

export function toStage(value: string): Stage {
  const s = value.trim().toLowerCase()
  return (STAGES as string[]).includes(s) ? (s as Stage) : 'idea'
}

/** Parse `ideas.md`. Never throws: unknown content inside a block is ignored. */
export function parseIdeas(text: string | null): Idea[] {
  if (!text) return []
  const { lines } = splitLines(text)
  return findBlocks(lines).map((block) => {
    let stage: Stage | null = null
    let added: string | null = null
    const progress: Idea['progress'] = []
    const paragraph: string[] = []
    let paragraphDone = false
    let inFence = false

    for (const raw of lines.slice(block.start + 1, block.end)) {
      if (FENCE.test(raw)) {
        inFence = !inFence
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (inFence) continue
      const line = raw.trim()
      const stageMatch = line.match(STAGE_LINE)
      if (stageMatch) {
        stage ??= toStage(stageMatch[1])
        continue
      }
      const addedMatch = line.match(ADDED_LINE)
      if (addedMatch) {
        const value = addedMatch[1].trim()
        added = isIsoDate(value) ? value : null
        continue
      }
      const progressMatch = raw.match(PROGRESS_LINE)
      if (progressMatch) {
        progress.push({ date: progressMatch[1], text: progressMatch[2].trim() })
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (line === '') {
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (!paragraphDone && !/^[-*]\s/.test(line) && !line.startsWith('<!--')) paragraph.push(line)
    }

    return {
      id: block.id,
      title: block.title,
      stage: stage ?? 'idea',
      added,
      note: paragraph.length ? paragraph.join(' ') : null,
      progress,
    }
  })
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/lib/ideas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/lib
git commit -m "feat(hub): parse ideas.md into ideas with stages and progress" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Line-surgical idea edits

**Files:**
- Modify: `src/apps/hub/lib/ideas.ts`
- Test: `src/apps/hub/lib/ideas.test.ts` (append; `MESSY` is already exported there)

**Interfaces:**
- Consumes: `findBlocks`, `PROGRESS_LINE`, `STAGE_LINE` (same file), `splitLines`, `joinLines`, `oneLine` (text.ts)
- Produces:

```ts
export class IdeaNotFoundError extends Error { readonly id: string }
export function addIdeaText(text: string | null, input: { title: string; note?: string }, today: string): string
export function addNoteText(text: string, id: string, note: string, today: string): string
export function moveStageText(text: string, id: string, stage: Stage, today: string, why?: string): string
```

- [ ] **Step 1: Write the failing tests** — append to `src/apps/hub/lib/ideas.test.ts` (and add `addIdeaText, addNoteText, moveStageText, IdeaNotFoundError` to the import from `./ideas`):

```ts
const TODAY = '2026-10-05'
const lines = (text: string) => text.split('\n')

describe('addNoteText', () => {
  it('inserts one line after the last progress line and changes nothing else', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'Round 5 answered', TODAY)
    const expected = lines(MESSY)
    expected.splice(expected.indexOf('- 2026-09-02 - Grilled the design') + 1, 0, '- 2026-10-05 — Round 5 answered')
    expect(out).toBe(expected.join('\n'))
  })

  it('starts a list after the last content line when the idea has no progress yet', () => {
    const out = addNoteText(MESSY, 'dat-mon-nhom', 'First note', TODAY)
    const expected = lines(MESSY)
    // after the closing fence, which is the block's last non-blank line
    expected.splice(expected.indexOf('## not a heading inside a code fence') + 2, 0, '', '- 2026-10-05 — First note')
    expect(out).toBe(expected.join('\n'))
  })

  it('targets the right duplicate', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms-2', 'Second one', TODAY)
    expect(lines(out).slice(-4)).toEqual(['Stage: idea', '', '- 2026-10-05 — Second one', ''])
  })

  it('flattens a multi-line note', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'one\ntwo', TODAY)
    expect(out).toContain('- 2026-10-05 — one two')
  })

  it('keeps CRLF endings and a missing trailing newline', () => {
    const crlf = MESSY.replace(/\n/g, '\r\n').replace(/\r\n$/, '')
    const out = addNoteText(crlf, 'photo-tagging-for-nomnoms', 'x', TODAY)
    expect(out.replace(/\r\n/g, '')).not.toContain('\n')
    expect(out.endsWith('\r\n')).toBe(false)
    expect(out).toContain('- 2026-10-05 — x\r\n')
  })

  it('throws IdeaNotFoundError for an unknown id', () => {
    expect(() => addNoteText(MESSY, 'nope', 'x', TODAY)).toThrow(IdeaNotFoundError)
  })
})

describe('moveStageText', () => {
  it('rewrites only the Stage line and logs the move with the reason', () => {
    const out = moveStageText(MESSY, 'photo-tagging-for-nomnoms', 'building', TODAY, 'Spec approved')
    const expected = lines(MESSY)
    expected[expected.indexOf('Stage: exploring')] = 'Stage: building'
    expected.splice(expected.indexOf('- 2026-09-02 - Grilled the design') + 1, 0, '- 2026-10-05 — Moved to building · Spec approved')
    expect(out).toBe(expected.join('\n'))
  })

  it('inserts a Stage line under the heading when the idea has none', () => {
    const out = moveStageText(MESSY, 'dat-mon-nhom', 'exploring', TODAY)
    const outLines = lines(out)
    const at = outLines.indexOf('## Đặt món nhóm 🍜')
    expect(outLines[at + 1]).toBe('Stage: exploring')
    expect(outLines[at + 2]).toBe('Added: 2026-09-01')
    expect(out).toContain('- 2026-10-05 — Moved to exploring')
  })
})

describe('addIdeaText', () => {
  it('appends a block at the end of the file, after one blank line', () => {
    const out = addIdeaText('# Ideas\n\n## Old\nStage: idea\n\n\n', { title: 'New one', note: 'Why\nit matters' }, TODAY)
    expect(out).toBe(
      '# Ideas\n\n## Old\nStage: idea\n\n## New one\nStage: idea\nAdded: 2026-10-05\n\nWhy it matters\n\n- 2026-10-05 — Idea captured\n',
    )
  })

  it('creates the file when it does not exist yet', () => {
    expect(addIdeaText(null, { title: 'First' }, TODAY)).toBe(
      '# Ideas\n\n## First\nStage: idea\nAdded: 2026-10-05\n\n- 2026-10-05 — Idea captured\n',
    )
  })

  it('keeps CRLF endings', () => {
    const out = addIdeaText('# Ideas\r\n', { title: 'X' }, TODAY)
    expect(out.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('rejects an empty title', () => {
    expect(() => addIdeaText(null, { title: '   ' }, TODAY)).toThrow('Title is required')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/apps/hub/lib/ideas.test.ts`
Expected: FAIL — `addNoteText` etc. are not exported.

- [ ] **Step 3: Implement** — append to `src/apps/hub/lib/ideas.ts` and extend the text import to `import { joinLines, oneLine, slugify, splitLines } from '@/apps/hub/lib/text'`:

```ts
export class IdeaNotFoundError extends Error {
  readonly id: string
  constructor(id: string) {
    super(`Idea "${id}" not found`)
    this.name = 'IdeaNotFoundError'
    this.id = id
  }
}

function locate(text: string, id: string) {
  const parts = splitLines(text)
  const block = findBlocks(parts.lines).find((b) => b.id === id)
  if (!block) throw new IdeaNotFoundError(id)
  return { ...parts, block }
}

/** Insert a progress line after the block's last progress line, or start a list after its last content line. */
function insertProgress(lines: string[], block: Block, entry: string): void {
  let lastProgress = -1
  for (let i = block.start + 1; i < block.end; i++) if (PROGRESS_LINE.test(lines[i])) lastProgress = i
  if (lastProgress >= 0) {
    lines.splice(lastProgress + 1, 0, entry)
    return
  }
  let last = block.end - 1
  while (last > block.start && lines[last].trim() === '') last--
  lines.splice(last + 1, 0, '', entry)
}

export function addNoteText(text: string, id: string, note: string, today: string): string {
  const { lines, eol, trailingNewline, block } = locate(text, id)
  insertProgress(lines, block, `- ${today} — ${oneLine(note)}`)
  return joinLines(lines, eol, trailingNewline)
}

export function moveStageText(text: string, id: string, stage: Stage, today: string, why?: string): string {
  const { lines, eol, trailingNewline, block } = locate(text, id)
  let stageAt = -1
  for (let i = block.start + 1; i < block.end; i++) {
    if (STAGE_LINE.test(lines[i].trim())) {
      stageAt = i
      break
    }
  }
  if (stageAt >= 0) {
    lines[stageAt] = `Stage: ${stage}`
  } else {
    lines.splice(block.start + 1, 0, `Stage: ${stage}`)
    block.end++
  }
  const reason = why ? oneLine(why) : ''
  insertProgress(lines, block, `- ${today} — Moved to ${stage}${reason ? ` · ${reason}` : ''}`)
  return joinLines(lines, eol, trailingNewline)
}

export function addIdeaText(text: string | null, input: { title: string; note?: string }, today: string): string {
  const title = oneLine(input.title)
  if (!title) throw new Error('Title is required')
  const note = input.note ? oneLine(input.note) : ''
  const block = [`## ${title}`, 'Stage: idea', `Added: ${today}`, '']
  if (note) block.push(note, '')
  block.push(`- ${today} — Idea captured`)

  if (!text || !text.trim()) return `${['# Ideas', '', ...block].join('\n')}\n`
  const { lines, eol } = splitLines(text)
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  lines.push('', ...block)
  return joinLines(lines, eol, true)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/lib/ideas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/lib
git commit -m "feat(hub): add, note and move ideas by editing only their own lines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: "Needs you" and thresholds

**Files:**
- Create: `src/apps/hub/lib/needs-you.ts`
- Test: `src/apps/hub/lib/needs-you.test.ts`

**Interfaces:**
- Consumes: `WipCard`, `Idea`, `NeedsYouItem`, `ACTIVE_STAGES` (types.ts), `THRESHOLDS`, `Thresholds` (config.ts), `daysBetween` (dates.ts)
- Produces:

```ts
export function lastActivity(idea: Idea): string | null
export function quietDays(idea: Idea, today: Date, t?: Thresholds): number | null
export function staleDays(card: WipCard, today: Date, t?: Thresholds): number | null
export function waitingDays(card: WipCard, today: Date): number | null
export function needsYou(wip: WipCard[], ideas: Idea[], today: Date, t?: Thresholds): NeedsYouItem[]
export function ageLabel(days: number): string
```

- [ ] **Step 1: Write the failing test** — `src/apps/hub/lib/needs-you.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import ideasMd from './__fixtures__/ideas.md?raw'
import { parseNowNote } from './parse-now'
import { parseIdeas } from './ideas'
import { ageLabel, needsYou, quietDays, staleDays, waitingDays } from './needs-you'

const today = new Date(2026, 9, 5)
const wip = [parseNowNote('now/bill-splitter.md', bill), parseNowNote('now/idle-farming.md', idle)]
const ideas = parseIdeas(ideasMd)

describe('needs-you', () => {
  it('lists waiting items oldest first, then quiet active ideas oldest first', () => {
    expect(needsYou(wip, ideas, today)).toEqual([
      { kind: 'waiting', title: 'photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17', context: 'bill-splitter', days: 49, target: { type: 'project', project: 'bill-splitter' } },
      { kind: 'waiting', title: 'Choose a working title', context: 'idle-farming', days: 23, target: { type: 'project', project: 'idle-farming' } },
      { kind: 'quiet', title: 'Photo-tagging for Nomnoms', context: 'Idea', days: 33, target: { type: 'idea', id: 'photo-tagging-for-nomnoms' } },
    ])
  })

  it('never calls shipped or dropped ideas quiet', () => {
    const shipped = ideas.find((i) => i.stage === 'shipped')!
    expect(quietDays(shipped, new Date(2027, 0, 1))).toBeNull()
  })

  it('uses Added when an idea has no progress lines', () => {
    expect(quietDays({ id: 'x', title: 'x', stage: 'idea', added: '2026-09-01', note: null, progress: [] }, today)).toBe(34)
  })

  it('flags a NOW note last worked 14+ days ago', () => {
    expect(staleDays(wip[0], today)).toBeNull()
    expect(staleDays(wip[1], today)).toBe(23)
  })

  it('never reports negative waiting days for a date in the future', () => {
    expect(waitingDays({ ...wip[0], waitingSince: '2026-12-01' }, today)).toBe(0)
  })

  it('labels ages in days, then weeks', () => {
    expect(ageLabel(0)).toBe('today')
    expect(ageLabel(1)).toBe('1 day')
    expect(ageLabel(13)).toBe('13 days')
    expect(ageLabel(49)).toBe('7 weeks')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/lib/needs-you.test.ts`
Expected: FAIL — cannot find `./needs-you`.

- [ ] **Step 3: Implement** — `src/apps/hub/lib/needs-you.ts`:

```ts
import { ACTIVE_STAGES, type Idea, type NeedsYouItem, type WipCard } from '@/apps/hub/lib/types'
import { THRESHOLDS, type Thresholds } from '@/apps/hub/config'
import { daysBetween } from '@/apps/hub/lib/dates'

/** Latest progress date, or the Added date when there is no progress yet. */
export function lastActivity(idea: Idea): string | null {
  if (idea.progress.length === 0) return idea.added
  return idea.progress.reduce((latest, p) => (p.date > latest ? p.date : latest), idea.progress[0].date)
}

export function quietDays(idea: Idea, today: Date, t: Thresholds = THRESHOLDS): number | null {
  if (!ACTIVE_STAGES.includes(idea.stage)) return null
  const last = lastActivity(idea)
  if (!last) return null
  const days = daysBetween(last, today)
  return days >= t.quietDays ? days : null
}

export function staleDays(card: WipCard, today: Date, t: Thresholds = THRESHOLDS): number | null {
  if (!card.lastWorked) return null
  const days = daysBetween(card.lastWorked, today)
  return days >= t.staleDays ? days : null
}

export function waitingDays(card: WipCard, today: Date): number | null {
  return card.waitingSince ? Math.max(0, daysBetween(card.waitingSince, today)) : null
}

/** Everything that needs the user, most urgent first. The UI shows the first three. */
export function needsYou(wip: WipCard[], ideas: Idea[], today: Date, t: Thresholds = THRESHOLDS): NeedsYouItem[] {
  const waiting: NeedsYouItem[] = wip
    .filter((card) => card.waitingOnMe)
    .map((card) => ({
      kind: 'waiting' as const,
      title: card.waitingOnMe!,
      context: card.project,
      days: waitingDays(card, today) ?? 0,
      target: { type: 'project' as const, project: card.project },
    }))
    .sort((a, b) => b.days - a.days)

  const quiet: NeedsYouItem[] = ideas
    .map((idea) => ({ idea, days: quietDays(idea, today, t) }))
    .filter((x): x is { idea: Idea; days: number } => x.days !== null)
    .map(({ idea, days }) => ({
      kind: 'quiet' as const,
      title: idea.title,
      context: 'Idea',
      days,
      target: { type: 'idea' as const, id: idea.id },
    }))
    .sort((a, b) => b.days - a.days)

  return [...waiting, ...quiet]
}

export function ageLabel(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  if (days < 14) return `${days} days`
  return `${Math.floor(days / 7)} weeks`
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/lib && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/lib
git commit -m "feat(hub): compute the Needs-you list and age thresholds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Token-exchange Vercel function

**Files:**
- Create: `api/github/token.ts`
- Modify: `tsconfig.json` (`"include"`)
- Test: `src/test/token-endpoint.test.ts`

**Interfaces:**
- Produces: `POST /api/github/token`. Request body exactly `{ code, code_verifier }` or `{ refresh_token }`. 200 → `{ access_token, expires_in, refresh_token, refresh_token_expires_in }`; errors → `{ error }` with 400 / 403 / 405 / 500 / 502.
- Produces (for tests): `handleTokenRequest(request: Request, env: TokenEnv, fetchImpl?: typeof fetch): Promise<Response>`.

- [ ] **Step 1: Write the failing test** — `src/test/token-endpoint.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { handleTokenRequest } from '../../api/github/token'

const env = { GITHUB_CLIENT_ID: 'Iv1.client', GITHUB_CLIENT_SECRET: 'shh-secret' }
const tokens = { access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600, token_type: 'bearer', scope: '' }
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://nook.example/api/github/token', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
const github = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))

describe('POST /api/github/token', () => {
  it('exchanges a code with the secret and returns only token fields', async () => {
    const fetchImpl = github(tokens)
    const res = await handleTokenRequest(post({ code: 'c0de', code_verifier: 'v'.repeat(43) }), env, fetchImpl)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://github.com/login/oauth/access_token')
    expect(JSON.parse(init.body as string)).toEqual({ client_id: 'Iv1.client', client_secret: 'shh-secret', code: 'c0de', code_verifier: 'v'.repeat(43) })
  })

  it('passes a refresh grant through', async () => {
    const fetchImpl = github(tokens)
    await handleTokenRequest(post({ refresh_token: 'ghr_r' }), env, fetchImpl)
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'ghr_r' })
  })

  it('rejects extra or missing fields', async () => {
    expect((await handleTokenRequest(post({ code: 'c', code_verifier: 'v'.repeat(43), client_secret: 'x' }), env, github(tokens))).status).toBe(400)
    expect((await handleTokenRequest(post({}), env, github(tokens))).status).toBe(400)
  })

  it('rejects other methods and other origins', async () => {
    const get = new Request('https://nook.example/api/github/token')
    expect((await handleTokenRequest(get, env, github(tokens))).status).toBe(405)
    const res = await handleTokenRequest(post({ refresh_token: 'r' }, { origin: 'https://evil.example' }), env, github(tokens))
    expect(res.status).toBe(403)
  })

  it('maps a GitHub error to 400 without echoing the secret', async () => {
    const res = await handleTokenRequest(post({ refresh_token: 'bad' }), env, github({ error: 'bad_refresh_token' }))
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('bad_refresh_token')
    expect(text).not.toContain('shh-secret')
  })

  it('reports a missing server config and an unreachable GitHub', async () => {
    expect((await handleTokenRequest(post({ refresh_token: 'r' }), {}, github(tokens))).status).toBe(500)
    const down = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect((await handleTokenRequest(post({ refresh_token: 'r' }), env, down)).status).toBe(502)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/token-endpoint.test.ts`
Expected: FAIL — cannot resolve `../../api/github/token`.

- [ ] **Step 3: Implement** — `api/github/token.ts`:

```ts
import { z } from 'zod'

/**
 * POST /api/github/token — the only server code in Nook.
 * Swaps a sign-in code (with its PKCE verifier) or a refresh token for GitHub App user tokens,
 * adding the client secret, which never reaches the browser. Stores and logs nothing.
 */

const exchangeSchema = z.object({ code: z.string().min(1), code_verifier: z.string().min(43).max(128) }).strict()
const refreshSchema = z.object({ refresh_token: z.string().min(1) }).strict()
const githubTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1),
  refresh_token_expires_in: z.number(),
})

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

export interface TokenEnv {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function handleTokenRequest(request: Request, env: TokenEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { error: 'forbidden_origin' })

  const clientId = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return json(500, { error: 'server_not_configured' })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const exchange = exchangeSchema.safeParse(body)
  const refresh = refreshSchema.safeParse(body)
  let grant: Record<string, string>
  if (exchange.success) grant = { code: exchange.data.code, code_verifier: exchange.data.code_verifier }
  else if (refresh.success) grant = { grant_type: 'refresh_token', refresh_token: refresh.data.refresh_token }
  else return json(400, { error: 'invalid_request' })

  let upstream: Response
  try {
    upstream = await fetchImpl(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...grant }),
    })
  } catch {
    return json(502, { error: 'github_unreachable' })
  }

  const data: unknown = await upstream.json().catch(() => null)
  const parsed = githubTokenSchema.safeParse(data)
  if (!parsed.success) {
    const error = (data as { error?: unknown } | null)?.error
    return json(400, { error: typeof error === 'string' ? error : 'token_exchange_failed' })
  }
  const { access_token, expires_in, refresh_token, refresh_token_expires_in } = parsed.data
  return json(200, { access_token, expires_in, refresh_token, refresh_token_expires_in })
}

/** Vercel Functions entry point (Web Request/Response signature). */
export function POST(request: Request): Promise<Response> {
  return handleTokenRequest(request, process.env)
}
```

`tsconfig.json` — change `"include": ["src", "vite.config.ts", "vitest.config.ts"]` to `"include": ["src", "api", "vite.config.ts", "vitest.config.ts"]`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/test/token-endpoint.test.ts && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Check the Vercel handler signature against current docs**

Use the context7 plugin (`resolve-library-id` "vercel", then `query-docs` "Vercel Functions api directory web handler export POST Request non-Next.js framework") and confirm that a file in `/api` exporting `POST(request: Request)` is a valid Node.js-runtime function for a Vite project. If the docs require a different shape (e.g. `export default { fetch }`), change only the export at the bottom of `api/github/token.ts` to that shape and keep `handleTokenRequest` unchanged.

- [ ] **Step 6: Commit**

```bash
git add api tsconfig.json src/test/token-endpoint.test.ts
git commit -m "feat(hub): add the GitHub token-exchange function" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sign-in, session store and single-flight refresh

**Files:**
- Create: `src/apps/hub/auth/pkce.ts`, `src/apps/hub/auth/github-auth.ts`, `src/apps/hub/auth/useAuthStore.ts`, `src/apps/hub/auth/session.ts`
- Test: `src/apps/hub/auth/auth.test.ts`

**Interfaces:**
- Consumes: `AUTH_BASE_URL`, `GITHUB_CLIENT_ID` (config.ts)
- Produces:

```ts
// pkce.ts
export function randomString(byteLength?: number): string
export async function codeChallenge(verifier: string): Promise<string>
// github-auth.ts
export interface Session { accessToken: string; accessExpiresAt: number; refreshToken: string; refreshExpiresAt: number }
export type AuthErrorCode = 'state_mismatch' | 'cancelled' | 'exchange_failed' | 'refresh_failed' | 'expired' | 'not_configured'
export class AuthError extends Error { readonly code: AuthErrorCode }
export interface AuthDeps { storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>; fetch: typeof fetch; now: () => number }
export function buildAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }): string
export function hasAuthCallback(search: string): boolean
export async function startSignIn(origin?: string, deps?: AuthDeps, go?: (url: string) => void, clientId?: string): Promise<void>
export async function completeSignIn(search: string, deps?: AuthDeps): Promise<Session>
export function refreshSession(refreshToken: string, deps?: AuthDeps): Promise<Session>
// useAuthStore.ts
export interface HubUser { login: string; avatarUrl: string }
export type HubAccess = 'unknown' | 'ok' | 'none'
export const useAuthStore  // state: session, user, access; actions: setSession, setUser, setAccess, signOut
// session.ts
export interface SessionDeps { now: () => number; refresh: (refreshToken: string) => Promise<Session> }
export async function getAccessToken(deps?: SessionDeps): Promise<string>
export async function forceRefresh(deps?: SessionDeps): Promise<string>
```

- [ ] **Step 1: Write the failing test** — `src/apps/hub/auth/auth.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codeChallenge } from './pkce'
import { AuthError, buildAuthorizeUrl, completeSignIn, hasAuthCallback, startSignIn, type AuthDeps, type Session } from './github-auth'
import { useAuthStore } from './useAuthStore'
import { forceRefresh, getAccessToken } from './session'

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}
const tokenBody = { access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600 }
const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))

describe('pkce', () => {
  it('matches the RFC 7636 test vector', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('sign-in', () => {
  it('builds the authorize URL with PKCE', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'Iv1.x', redirectUri: 'https://nook.example/', state: 's', challenge: 'c' }))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: 'Iv1.x', redirect_uri: 'https://nook.example/', state: 's', code_challenge: 'c', code_challenge_method: 'S256' })
  })

  it('recognises a callback, including a cancelled one', () => {
    expect(hasAuthCallback('?code=a&state=b')).toBe(true)
    expect(hasAuthCallback('?error=access_denied&state=b')).toBe(true)
    expect(hasAuthCallback('?hub-demo')).toBe(false)
  })

  it('completes sign-in when the state matches and clears the stored verifier', async () => {
    const storage = memoryStorage()
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage, fetch: fetchImpl, now: () => 1_000 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    const session = await completeSignIn(`?code=abc&state=${state}`, deps)
    expect(session).toEqual({ accessToken: 'ghu_a', accessExpiresAt: 1_000 + 28_800_000, refreshToken: 'ghr_r', refreshExpiresAt: 1_000 + 15_897_600_000 })
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.code).toBe('abc')
    expect(sent.code_verifier).toHaveLength(43)
    expect(storage.getItem('hub-oauth-verifier')).toBeNull()
  })

  it('refuses to start without a client id', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok(tokenBody), now: () => 0 }
    await expect(startSignIn('https://nook.example', deps, () => {}, '')).rejects.toMatchObject({ code: 'not_configured' })
  })

  it('rejects a state mismatch', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok(tokenBody), now: () => 0 }
    await startSignIn('https://nook.example', deps, () => {}, 'Iv1.test')
    await expect(completeSignIn('?code=abc&state=forged', deps)).rejects.toMatchObject({ code: 'state_mismatch' })
  })

  it('reports a cancelled sign-in without calling the server', async () => {
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    await expect(completeSignIn(`?error=access_denied&state=${state}`, deps)).rejects.toMatchObject({ code: 'cancelled' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a malformed token response', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok({ access_token: 'x' }), now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    await expect(completeSignIn(`?code=a&state=${state}`, deps)).rejects.toBeInstanceOf(AuthError)
  })
})

describe('session', () => {
  const base: Session = { accessToken: 'old', accessExpiresAt: 10_000_000, refreshToken: 'r', refreshExpiresAt: 99_000_000 }
  beforeEach(() => useAuthStore.setState({ session: null, user: null, access: 'unknown' }))

  it('returns the current token while it has more than 5 minutes left', async () => {
    useAuthStore.setState({ session: base })
    const refresh = vi.fn()
    expect(await getAccessToken({ now: () => 0, refresh })).toBe('old')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes once even when several calls need it at the same time', async () => {
    useAuthStore.setState({ session: base })
    const next: Session = { ...base, accessToken: 'new', accessExpiresAt: 50_000_000 }
    const refresh = vi.fn(async () => next)
    const deps = { now: () => 9_900_000, refresh }
    expect(await Promise.all([getAccessToken(deps), getAccessToken(deps), forceRefresh(deps)])).toEqual(['new', 'new', 'new'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().session?.accessToken).toBe('new')
  })

  it('signs out cleanly when the refresh token has expired', async () => {
    useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
    const refresh = vi.fn()
    await expect(getAccessToken({ now: () => 100_000_000, refresh })).rejects.toMatchObject({ code: 'expired' })
    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('signs out when GitHub rejects the refresh, but keeps the session when offline', async () => {
    useAuthStore.setState({ session: base })
    await expect(forceRefresh({ now: () => 0, refresh: async () => { throw new TypeError('offline') } })).rejects.toBeInstanceOf(TypeError)
    expect(useAuthStore.getState().session).not.toBeNull()
    await expect(forceRefresh({ now: () => 0, refresh: async () => { throw new AuthError('refresh_failed') } })).rejects.toMatchObject({ code: 'refresh_failed' })
    expect(useAuthStore.getState().session).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/auth`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/apps/hub/auth/pkce.ts`:

```ts
/** PKCE helpers (RFC 7636) using Web Crypto. */

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}
```

`src/apps/hub/auth/github-auth.ts`:

```ts
import { z } from 'zod'
import { AUTH_BASE_URL, GITHUB_CLIENT_ID } from '@/apps/hub/config'
import { codeChallenge, randomString } from '@/apps/hub/auth/pkce'

/** GitHub App sign-in (web flow + PKCE). The code→token swap goes through our /api function. */

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1),
  refresh_token_expires_in: z.number().positive(),
})

export interface Session {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

export type AuthErrorCode = 'state_mismatch' | 'cancelled' | 'exchange_failed' | 'refresh_failed' | 'expired' | 'not_configured'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message: string = code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export interface AuthDeps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  fetch: typeof fetch
  now: () => number
}

const STATE_KEY = 'hub-oauth-state'
const VERIFIER_KEY = 'hub-oauth-verifier'

const browserDeps = (): AuthDeps => ({ storage: sessionStorage, fetch: (...args) => fetch(...args), now: Date.now })

export function buildAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', p.clientId)
  url.searchParams.set('redirect_uri', p.redirectUri)
  url.searchParams.set('state', p.state)
  url.searchParams.set('code_challenge', p.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export function hasAuthCallback(search: string): boolean {
  const q = new URLSearchParams(search)
  return q.has('state') && (q.has('code') || q.has('error'))
}

export async function startSignIn(
  origin: string = window.location.origin,
  deps: AuthDeps = browserDeps(),
  go: (url: string) => void = (url) => window.location.assign(url),
  clientId: string = GITHUB_CLIENT_ID,
): Promise<void> {
  if (!clientId) throw new AuthError('not_configured')
  const state = randomString(16)
  const verifier = randomString(32)
  deps.storage.setItem(STATE_KEY, state)
  deps.storage.setItem(VERIFIER_KEY, verifier)
  go(buildAuthorizeUrl({ clientId, redirectUri: `${origin}/`, state, challenge: await codeChallenge(verifier) }))
}

async function postToken(body: Record<string, string>, deps: AuthDeps, failCode: AuthErrorCode): Promise<Session> {
  const res = await deps.fetch(`${AUTH_BASE_URL}/github/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed = tokenResponseSchema.safeParse(await res.json().catch(() => null))
  if (!res.ok || !parsed.success) throw new AuthError(failCode)
  const now = deps.now()
  return {
    accessToken: parsed.data.access_token,
    accessExpiresAt: now + parsed.data.expires_in * 1000,
    refreshToken: parsed.data.refresh_token,
    refreshExpiresAt: now + parsed.data.refresh_token_expires_in * 1000,
  }
}

export async function completeSignIn(search: string, deps: AuthDeps = browserDeps()): Promise<Session> {
  const q = new URLSearchParams(search)
  const state = deps.storage.getItem(STATE_KEY)
  const verifier = deps.storage.getItem(VERIFIER_KEY)
  deps.storage.removeItem(STATE_KEY)
  deps.storage.removeItem(VERIFIER_KEY)
  if (!state || !verifier || q.get('state') !== state) throw new AuthError('state_mismatch')
  if (q.has('error') || !q.get('code')) throw new AuthError('cancelled', 'Sign-in was cancelled')
  return postToken({ code: q.get('code')!, code_verifier: verifier }, deps, 'exchange_failed')
}

export function refreshSession(refreshToken: string, deps: AuthDeps = browserDeps()): Promise<Session> {
  return postToken({ refresh_token: refreshToken }, deps, 'refresh_failed')
}
```

Default parameters are evaluated only when an argument is omitted, so the tests (which pass all four) never touch `window` or `sessionStorage`.

`src/apps/hub/auth/useAuthStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@/apps/hub/auth/github-auth'

export interface HubUser {
  login: string
  avatarUrl: string
}

/** 'none' = signed in, but this account cannot see the hub repo. */
export type HubAccess = 'unknown' | 'ok' | 'none'

interface AuthState {
  session: Session | null
  user: HubUser | null
  access: HubAccess
  setSession(session: Session): void
  setUser(user: HubUser): void
  setAccess(access: HubAccess): void
  signOut(): void
}

export const AUTH_STORAGE_KEY = 'nook-hub-auth'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      access: 'unknown',
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setAccess: (access) => set({ access }),
      signOut: () => set({ session: null, user: null, access: 'unknown' }),
    }),
    { name: AUTH_STORAGE_KEY },
  ),
)
```

`src/apps/hub/auth/session.ts`:

```ts
import { AuthError, refreshSession, type Session } from '@/apps/hub/auth/github-auth'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'

const REFRESH_MARGIN_MS = 5 * 60 * 1000

export interface SessionDeps {
  now: () => number
  refresh: (refreshToken: string) => Promise<Session>
}

const defaultDeps: SessionDeps = { now: () => Date.now(), refresh: (token) => refreshSession(token) }

let refreshing: Promise<Session> | null = null

/** Refresh now. Concurrent callers share one request. GitHub rejecting the refresh signs out; being offline does not. */
export async function forceRefresh(deps: SessionDeps = defaultDeps): Promise<string> {
  const { session, signOut, setSession } = useAuthStore.getState()
  if (!session) throw new AuthError('expired')
  if (session.refreshExpiresAt <= deps.now()) {
    signOut()
    throw new AuthError('expired')
  }
  refreshing ??= deps
    .refresh(session.refreshToken)
    .then((next) => {
      setSession(next)
      return next
    })
    .catch((error: unknown) => {
      if (error instanceof AuthError) signOut()
      throw error
    })
    .finally(() => {
      refreshing = null
    })
  return (await refreshing).accessToken
}

export async function getAccessToken(deps: SessionDeps = defaultDeps): Promise<string> {
  const { session } = useAuthStore.getState()
  if (!session) throw new AuthError('expired')
  if (session.accessExpiresAt - deps.now() > REFRESH_MARGIN_MS) return session.accessToken
  return forceRefresh(deps)
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/auth && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/auth
git commit -m "feat(hub): GitHub App sign-in with PKCE and single-flight token refresh" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: GitHub REST client

**Files:**
- Create: `src/apps/hub/github/client.ts`, `src/apps/hub/github/instance.ts`
- Test: `src/apps/hub/github/client.test.ts`

**Interfaces:**
- Consumes: `encodeBase64Utf8`, `decodeBase64Utf8` (text.ts); `getAccessToken`, `forceRefresh` (session.ts); `HUB_REPO` (config.ts)
- Produces:

```ts
export interface RemoteFile { text: string; sha: string }
export interface DirEntry { name: string; path: string; type: string }
export type Fetched<T> = { status: 'ok'; value: T; etag: string | null } | { status: 'not-modified' } | { status: 'missing' }
export class GitHubError extends Error { readonly status: number }
export class ConflictError extends GitHubError {}
export interface ClientDeps { repo: string; fetch: typeof fetch; getToken: () => Promise<string>; refreshToken: () => Promise<string> }
export interface GitHubClient {
  getUser(): Promise<{ login: string; avatarUrl: string }>
  checkAccess(): Promise<boolean>
  listDir(path: string, etag?: string | null): Promise<Fetched<DirEntry[]>>
  getFile(path: string, etag?: string | null): Promise<Fetched<RemoteFile>>
  putFile(path: string, text: string, sha: string | null, message: string): Promise<{ sha: string }>
}
export function createGitHubClient(deps: ClientDeps): GitHubClient
// instance.ts
export function getHubClient(): GitHubClient
```

- [ ] **Step 1: Write the failing test** — `src/apps/hub/github/client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { ConflictError, createGitHubClient, GitHubError } from './client'
import { encodeBase64Utf8 } from '@/apps/hub/lib/text'

type Handler = (url: string, init: RequestInit) => Response
function setup(handler: Handler) {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => handler(url, init))
  const refreshToken = vi.fn(async () => 'fresh')
  const client = createGitHubClient({ repo: 'Kane-SE/personal-hub', fetch: fetchImpl as unknown as typeof fetch, getToken: async () => 'tok', refreshToken })
  return { client, fetchImpl, refreshToken }
}
const res = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers })

describe('GitHub client', () => {
  it('decodes a file and returns its sha and etag', async () => {
    const { client, fetchImpl } = setup(() => res(200, { type: 'file', content: encodeBase64Utf8('Đặt món 🍜\n'), sha: 'abc' }, { etag: 'W/"1"' }))
    expect(await client.getFile('ideas.md')).toEqual({ status: 'ok', etag: 'W/"1"', value: { text: 'Đặt món 🍜\n', sha: 'abc' } })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/Kane-SE/personal-hub/contents/ideas.md')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('sends If-None-Match and reports not-modified and missing files', async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith('ideas.md') ? res(304) : res(404, { message: 'Not Found' })))
    expect(await client.getFile('ideas.md', 'W/"1"')).toEqual({ status: 'not-modified' })
    expect((fetchImpl.mock.calls[0][1].headers as Record<string, string>)['if-none-match']).toBe('W/"1"')
    expect(await client.getFile('projects.md')).toEqual({ status: 'missing' })
  })

  it('lists a directory and treats a file at that path as missing', async () => {
    const { client } = setup((url) =>
      url.endsWith('/now') ? res(200, [{ name: 'a.md', path: 'now/a.md', type: 'file' }, { name: 'x', path: 'now/x', type: 'dir' }]) : res(200, { type: 'file', content: '', sha: 's' }),
    )
    expect(await client.listDir('now')).toEqual({ status: 'ok', etag: null, value: [{ name: 'a.md', path: 'now/a.md', type: 'file' }, { name: 'x', path: 'now/x', type: 'dir' }] })
    expect(await client.listDir('ideas.md')).toEqual({ status: 'missing' })
  })

  it('retries once with a refreshed token after a 401', async () => {
    const { client, refreshToken, fetchImpl } = setup((_url, init) =>
      (init.headers as Record<string, string>).authorization === 'Bearer fresh' ? res(200, { login: 'kane', avatar_url: 'https://a/1' }) : res(401),
    )
    expect(await client.getUser()).toEqual({ login: 'kane', avatarUrl: 'https://a/1' })
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('writes UTF-8 base64 with the sha and maps 409/422 to ConflictError', async () => {
    const { client, fetchImpl } = setup((_url, init) => {
      const body = JSON.parse(init.body as string)
      return body.sha === 'stale' ? res(409, { message: 'conflict' }) : res(200, { content: { sha: 'new' } })
    })
    expect(await client.putFile('ideas.md', 'Ý tưởng\n', 'abc', 'hub: add idea "x"')).toEqual({ sha: 'new' })
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body as string)
    expect(sent).toEqual({ message: 'hub: add idea "x"', content: encodeBase64Utf8('Ý tưởng\n'), sha: 'abc' })
    await expect(client.putFile('ideas.md', 'x', 'stale', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('omits sha when creating a file and reports other failures as GitHubError', async () => {
    const { client, fetchImpl } = setup((_url, init) => (init.method === 'PUT' ? res(201, { content: { sha: 'n' } }) : res(500)))
    await client.putFile('ideas.md', 'x', null, 'm')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).not.toHaveProperty('sha')
    await expect(client.getFile('ideas.md')).rejects.toBeInstanceOf(GitHubError)
  })

  it('checks access: 404/403 mean no access', async () => {
    expect(await setup(() => res(200, {})).client.checkAccess()).toBe(true)
    expect(await setup(() => res(404)).client.checkAccess()).toBe(false)
    expect(await setup(() => res(403)).client.checkAccess()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/github`
Expected: FAIL — cannot find `./client`.

- [ ] **Step 3: Implement**

`src/apps/hub/github/client.ts`:

```ts
import { decodeBase64Utf8, encodeBase64Utf8 } from '@/apps/hub/lib/text'

/** Minimal GitHub REST client for the hub repo. The only module that talks to api.github.com. */

const API = 'https://api.github.com'

export interface RemoteFile {
  text: string
  sha: string
}

export interface DirEntry {
  name: string
  path: string
  type: string
}

export type Fetched<T> = { status: 'ok'; value: T; etag: string | null } | { status: 'not-modified' } | { status: 'missing' }

export class GitHubError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

/** The file changed on GitHub since we read it (sha mismatch). */
export class ConflictError extends GitHubError {
  constructor() {
    super(409, 'File changed on GitHub')
    this.name = 'ConflictError'
  }
}

export interface ClientDeps {
  repo: string
  fetch: typeof fetch
  getToken: () => Promise<string>
  refreshToken: () => Promise<string>
}

export interface GitHubClient {
  getUser(): Promise<{ login: string; avatarUrl: string }>
  checkAccess(): Promise<boolean>
  listDir(path: string, etag?: string | null): Promise<Fetched<DirEntry[]>>
  getFile(path: string, etag?: string | null): Promise<Fetched<RemoteFile>>
  putFile(path: string, text: string, sha: string | null, message: string): Promise<{ sha: string }>
}

export function createGitHubClient(deps: ClientDeps): GitHubClient {
  async function request(path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<Response> {
    const send = (token: string) =>
      deps.fetch(`${API}${path}`, {
        method: init.method ?? 'GET',
        body: init.body,
        cache: 'no-store',
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          authorization: `Bearer ${token}`,
          ...init.headers,
        },
      })
    const first = await send(await deps.getToken())
    if (first.status !== 401) return first
    return send(await deps.refreshToken())
  }

  const contents = (path: string) => `/repos/${deps.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const conditional = (etag?: string | null) => (etag ? { headers: { 'if-none-match': etag } } : {})

  return {
    async getUser() {
      const res = await request('/user')
      if (!res.ok) throw new GitHubError(res.status, 'Could not load your GitHub profile')
      const body = await res.json()
      return { login: String(body.login), avatarUrl: String(body.avatar_url ?? '') }
    },

    async checkAccess() {
      const res = await request(`/repos/${deps.repo}`)
      if (res.ok) return true
      if (res.status === 404 || res.status === 403) return false
      throw new GitHubError(res.status, 'Could not check access to the hub repo')
    },

    async listDir(path, etag) {
      const res = await request(contents(path), conditional(etag))
      if (res.status === 304) return { status: 'not-modified' }
      if (res.status === 404) return { status: 'missing' }
      if (!res.ok) throw new GitHubError(res.status, `Could not list ${path}`)
      const body = await res.json()
      if (!Array.isArray(body)) return { status: 'missing' }
      const value = body.map((e: { name: string; path: string; type: string }) => ({ name: String(e.name), path: String(e.path), type: String(e.type) }))
      return { status: 'ok', value, etag: res.headers.get('etag') }
    },

    async getFile(path, etag) {
      const res = await request(contents(path), conditional(etag))
      if (res.status === 304) return { status: 'not-modified' }
      if (res.status === 404) return { status: 'missing' }
      if (!res.ok) throw new GitHubError(res.status, `Could not load ${path}`)
      const body = await res.json()
      if (Array.isArray(body) || typeof body.content !== 'string') throw new GitHubError(422, `${path} is not a file`)
      return { status: 'ok', value: { text: decodeBase64Utf8(body.content), sha: String(body.sha) }, etag: res.headers.get('etag') }
    },

    async putFile(path, text, sha, message) {
      const res = await request(contents(path), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, content: encodeBase64Utf8(text), ...(sha ? { sha } : {}) }),
      })
      if (res.status === 409 || res.status === 422) throw new ConflictError()
      if (!res.ok) throw new GitHubError(res.status, `Could not save ${path}`)
      const body = await res.json()
      return { sha: String(body.content.sha) }
    },
  }
}
```

`src/apps/hub/github/instance.ts`:

```ts
import { HUB_REPO } from '@/apps/hub/config'
import { forceRefresh, getAccessToken } from '@/apps/hub/auth/session'
import { createGitHubClient, type GitHubClient } from '@/apps/hub/github/client'

let client: GitHubClient | null = null

/** The app-wide client. Task 13 adds the dev demo branch here. */
export function getHubClient(): GitHubClient {
  client ??= createGitHubClient({
    repo: HUB_REPO,
    fetch: (...args) => fetch(...args),
    getToken: () => getAccessToken(),
    refreshToken: () => forceRefresh(),
  })
  return client
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/apps/hub/github && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/github
git commit -m "feat(hub): GitHub contents client with ETags, 401 retry and conflict errors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Hub store — cache, refresh, writes, offline queue

**Files:**
- Create: `src/apps/hub/store/useHubStore.ts`
- Test: `src/apps/hub/store/useHubStore.test.ts`

**Interfaces:**
- Consumes: `GitHubClient`, `ConflictError`, `GitHubError` (client.ts); `parseNowNote`, `parseProjects`, `parseIdeas`, `addIdeaText`, `addNoteText`, `moveStageText`, `IdeaNotFoundError`; `AuthError`; `NOW_DIR`, `PROJECTS_PATH`, `IDEAS_PATH`; `uid` (`@/shared/lib/utils`)
- Produces:

```ts
export interface CachedFile { text: string; sha: string; etag: string | null }
export interface PendingIdea { localId: string; title: string; note?: string; createdOn: string }
export type HubStatus = 'idle' | 'loading' | 'ready' | 'offline'
export interface SectionErrors { now: string | null; projects: string | null; ideas: string | null }
export interface HubData { wip: WipCard[]; projects: Project[]; ideas: Idea[] }
export function parseHubData(files: Record<string, CachedFile>, nowFiles: string[]): HubData
export function describeError(error: unknown): string
export async function writeIdeasFile(client: GitHubClient, edit: (text: string | null) => string | null, message: string, maxRetries?: number): Promise<CachedFile>
export const HUB_STORAGE_KEY = 'nook-hub-cache'
export const useHubStore // state: files, nowFiles, nowListEtag, fetchedAt, status, errors, pending
  // actions:
  // refresh(client: GitHubClient, now?: number): Promise<void>
  // addIdea(client, input: { title: string; note?: string }, today: string): Promise<'saved' | 'queued'>
  // addNote(client, id: string, note: string, today: string): Promise<void>
  // moveStage(client, id: string, stage: Stage, today: string, why?: string): Promise<void>
  // syncPending(client): Promise<void>
  // reset(): void   — clears cache, keeps pending ideas
```

- [ ] **Step 1: Write the failing test** — `src/apps/hub/store/useHubStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ConflictError, type DirEntry, type Fetched, type GitHubClient, type RemoteFile } from '@/apps/hub/github/client'
import bill from '@/apps/hub/lib/__fixtures__/now-bill-splitter.md?raw'
import ideasMd from '@/apps/hub/lib/__fixtures__/ideas.md?raw'
import projectsMd from '@/apps/hub/lib/__fixtures__/projects.md?raw'
import { describeError, parseHubData, useHubStore, writeIdeasFile } from './useHubStore'

/** In-memory fake repo. `offline` makes every call throw like fetch does without a network. */
function fakeRepo(initial: Record<string, string>) {
  const files = new Map(Object.entries(initial))
  let version = 0
  const state = { offline: false, conflictsLeft: 0, loseNextPutResponse: false, puts: 0, dirMissing: false }
  const guard = () => { if (state.offline) throw new TypeError('Failed to fetch') }
  const client: GitHubClient = {
    async getUser() { return { login: 'kane', avatarUrl: '' } },
    async checkAccess() { return true },
    async listDir(path): Promise<Fetched<DirEntry[]>> {
      guard()
      if (state.dirMissing) return { status: 'missing' }
      const value = [...files.keys()].filter((p) => p.startsWith(`${path}/`)).map((p) => ({ name: p.slice(path.length + 1), path: p, type: 'file' }))
      return { status: 'ok', value: [...value, { name: '.gitkeep', path: `${path}/.gitkeep`, type: 'file' }, { name: 'old', path: `${path}/old`, type: 'dir' }], etag: null }
    },
    async getFile(path): Promise<Fetched<RemoteFile>> {
      guard()
      const text = files.get(path)
      return text === undefined ? { status: 'missing' } : { status: 'ok', value: { text, sha: `v${version}` }, etag: `e${version}` }
    },
    async putFile(path, text, sha) {
      guard()
      state.puts++
      if (state.conflictsLeft > 0) { state.conflictsLeft--; files.set(path, `${files.get(path) ?? ''}\n## Edited on the PC\n`); version++; throw new ConflictError() }
      if ((files.has(path) ? `v${version}` : null) !== sha) throw new ConflictError()
      files.set(path, text)
      version++
      if (state.loseNextPutResponse) { state.loseNextPutResponse = false; throw new TypeError('Failed to fetch') }
      return { sha: `v${version}` }
    },
  }
  return { client, files, state }
}

const TODAY = '2026-10-05'

beforeEach(() => {
  useHubStore.setState({ files: {}, nowFiles: [], nowListEtag: null, fetchedAt: null, status: 'idle', errors: { now: null, projects: null, ideas: null }, pending: [] })
})

describe('refresh', () => {
  it('loads NOW notes, projects and ideas, skipping non-markdown entries in now/', async () => {
    const { client } = fakeRepo({ 'now/bill-splitter.md': bill, 'projects.md': projectsMd, 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(client, 123)
    const s = useHubStore.getState()
    expect(s.status).toBe('ready')
    expect(s.fetchedAt).toBe(123)
    expect(s.nowFiles).toEqual(['now/bill-splitter.md'])
    const data = parseHubData(s.files, s.nowFiles)
    expect(data.wip.map((c) => c.project)).toEqual(['bill-splitter'])
    expect(data.projects).toHaveLength(4)
    expect(data.ideas).toHaveLength(4)
  })

  it('shows an empty Now list when now/ does not exist', async () => {
    const { client, state } = fakeRepo({ 'ideas.md': ideasMd })
    state.dirMissing = true
    await useHubStore.getState().refresh(client, 1)
    const s = useHubStore.getState()
    expect(s.status).toBe('ready')
    expect(s.errors).toEqual({ now: null, projects: null, ideas: null })
    expect(parseHubData(s.files, s.nowFiles).wip).toEqual([])
  })

  it('keeps the cached copy and goes offline when the network is down', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(repo.client, 1)
    repo.state.offline = true
    await useHubStore.getState().refresh(repo.client, 2)
    const s = useHubStore.getState()
    expect(s.status).toBe('offline')
    expect(s.fetchedAt).toBe(1)
    expect(parseHubData(s.files, s.nowFiles).ideas).toHaveLength(4)
  })
})

describe('writes', () => {
  it('adds a note and updates the cache', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().addNote(repo.client, 'photo-tagging-for-nomnoms', 'Round 5 done', TODAY)
    expect(repo.files.get('ideas.md')).toContain('- 2026-10-05 — Round 5 done')
    expect(useHubStore.getState().files['ideas.md'].text).toBe(repo.files.get('ideas.md'))
  })

  it('re-applies the edit on fresh text after a conflict, at most twice', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.conflictsLeft = 2
    await useHubStore.getState().moveStage(repo.client, 'photo-tagging-for-nomnoms', 'building', TODAY)
    expect(repo.files.get('ideas.md')).toContain('## Edited on the PC')
    expect(repo.files.get('ideas.md')).toContain('Stage: building')

    repo.state.conflictsLeft = 3
    await expect(useHubStore.getState().addNote(repo.client, 'photo-tagging-for-nomnoms', 'x', TODAY)).rejects.toBeInstanceOf(ConflictError)
  })

  it('stops when the idea no longer exists', async () => {
    const repo = fakeRepo({ 'ideas.md': '# Ideas\n' })
    await expect(useHubStore.getState().addNote(repo.client, 'gone', 'x', TODAY)).rejects.toThrow('not found')
    expect(describeError(new ConflictError())).toBe('ideas.md kept changing on GitHub. Try again.')
  })

  it('writeIdeasFile skips the write when the edit returns null', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const file = await writeIdeasFile(repo.client, () => null, 'm')
    expect(repo.state.puts).toBe(0)
    expect(file.text).toBe(ideasMd)
  })
})

describe('offline ideas', () => {
  it('queues an idea offline and syncs it exactly once', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.offline = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Weather that changes flowers' }, TODAY)).toBe('queued')
    expect(useHubStore.getState().pending).toHaveLength(1)

    repo.state.offline = false
    await Promise.all([useHubStore.getState().syncPending(repo.client), useHubStore.getState().syncPending(repo.client)])
    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Weather that changes flowers/g)).toHaveLength(1)
  })

  it('does not duplicate an idea whose save succeeded but whose response was lost', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.loseNextPutResponse = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Lost response' }, TODAY)).toBe('queued')
    await useHubStore.getState().syncPending(repo.client)
    expect(repo.files.get('ideas.md')!.match(/## Lost response/g)).toHaveLength(1)
    expect(useHubStore.getState().pending).toEqual([])
  })

  it('keeps later queued ideas when one fails mid-queue', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    useHubStore.setState({ pending: [{ localId: 'a', title: 'One', createdOn: TODAY }, { localId: 'b', title: 'Two', createdOn: TODAY }] })
    let calls = 0
    const flaky: GitHubClient = { ...repo.client, putFile: async (...args) => { if (++calls === 2) throw new TypeError('Failed to fetch'); return repo.client.putFile(...args) } }
    await useHubStore.getState().syncPending(flaky)
    expect(useHubStore.getState().pending.map((p) => p.localId)).toEqual(['b'])
  })

  it('reset clears the cache but keeps unsynced ideas', () => {
    useHubStore.setState({ files: { 'ideas.md': { text: 'x', sha: 's', etag: null } }, fetchedAt: 5, pending: [{ localId: 'a', title: 'Keep me', createdOn: TODAY }] })
    useHubStore.getState().reset()
    const s = useHubStore.getState()
    expect(s.files).toEqual({})
    expect(s.fetchedAt).toBeNull()
    expect(s.pending).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/apps/hub/store`
Expected: FAIL — cannot find `./useHubStore`.

- [ ] **Step 3: Implement** — `src/apps/hub/store/useHubStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/shared/lib/utils'
import { IDEAS_PATH, NOW_DIR, PROJECTS_PATH } from '@/apps/hub/config'
import { ConflictError, GitHubError, type GitHubClient } from '@/apps/hub/github/client'
import { AuthError } from '@/apps/hub/auth/github-auth'
import { parseNowNote } from '@/apps/hub/lib/parse-now'
import { parseProjects } from '@/apps/hub/lib/parse-projects'
import { addIdeaText, addNoteText, IdeaNotFoundError, moveStageText, parseIdeas } from '@/apps/hub/lib/ideas'
import type { Idea, Project, Stage, WipCard } from '@/apps/hub/lib/types'

/**
 * Hub's cache of personal-hub files, persisted so the dashboard opens instantly and offline.
 * All writes go through writeIdeasFile: fetch fresh text, apply one edit, PUT with the sha, retry on conflict.
 */

export interface CachedFile {
  text: string
  sha: string
  etag: string | null
}

export interface PendingIdea {
  localId: string
  title: string
  note?: string
  createdOn: string
}

export type HubStatus = 'idle' | 'loading' | 'ready' | 'offline'

export interface SectionErrors {
  now: string | null
  projects: string | null
  ideas: string | null
}

export interface HubData {
  wip: WipCard[]
  projects: Project[]
  ideas: Idea[]
}

interface HubState {
  files: Record<string, CachedFile>
  nowFiles: string[]
  nowListEtag: string | null
  fetchedAt: number | null
  status: HubStatus
  errors: SectionErrors
  pending: PendingIdea[]
  refresh(client: GitHubClient, now?: number): Promise<void>
  addIdea(client: GitHubClient, input: { title: string; note?: string }, today: string): Promise<'saved' | 'queued'>
  addNote(client: GitHubClient, id: string, note: string, today: string): Promise<void>
  moveStage(client: GitHubClient, id: string, stage: Stage, today: string, why?: string): Promise<void>
  syncPending(client: GitHubClient): Promise<void>
  reset(): void
}

export const HUB_STORAGE_KEY = 'nook-hub-cache'
const NO_ERRORS: SectionErrors = { now: null, projects: null, ideas: null }

const isNetworkError = (error: unknown): boolean => error instanceof TypeError

export function describeError(error: unknown): string {
  if (error instanceof IdeaNotFoundError) return 'This idea changed elsewhere — reload.'
  if (error instanceof ConflictError) return 'ideas.md kept changing on GitHub. Try again.'
  if (error instanceof AuthError) return 'Session ended, sign in again.'
  if (isNetworkError(error)) return 'Needs connection.'
  if (error instanceof GitHubError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong.'
}

export function parseHubData(files: Record<string, CachedFile>, nowFiles: string[]): HubData {
  return {
    wip: nowFiles.filter((path) => files[path]).map((path) => parseNowNote(path, files[path].text)),
    projects: parseProjects(files[PROJECTS_PATH]?.text ?? null),
    ideas: parseIdeas(files[IDEAS_PATH]?.text ?? null),
  }
}

/** Fetch fresh ideas.md, apply `edit` (null = nothing to write), PUT with the sha; retry on conflict. */
export async function writeIdeasFile(
  client: GitHubClient,
  edit: (text: string | null) => string | null,
  message: string,
  maxRetries = 2,
): Promise<CachedFile> {
  for (let attempt = 0; ; attempt++) {
    const current = await client.getFile(IDEAS_PATH)
    const text = current.status === 'ok' ? current.value.text : null
    const sha = current.status === 'ok' ? current.value.sha : null
    const next = edit(text)
    if (next === null) return { text: text ?? '', sha: sha ?? '', etag: null }
    try {
      const saved = await client.putFile(IDEAS_PATH, next, sha, message)
      return { text: next, sha: saved.sha, etag: null }
    } catch (error) {
      if (error instanceof ConflictError && attempt < maxRetries) continue
      throw error
    }
  }
}

const sectionOf = (path: string): keyof SectionErrors =>
  path === PROJECTS_PATH ? 'projects' : path === IDEAS_PATH ? 'ideas' : 'now'

let syncing: Promise<void> | null = null

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => {
      const storeIdeas = (file: CachedFile) => set((s) => ({ files: { ...s.files, [IDEAS_PATH]: file } }))
      const titleOf = (id: string) => parseIdeas(get().files[IDEAS_PATH]?.text ?? null).find((i) => i.id === id)?.title ?? id

      return {
        files: {},
        nowFiles: [],
        nowListEtag: null,
        fetchedAt: null,
        status: 'idle',
        errors: NO_ERRORS,
        pending: [],

        async refresh(client, now = Date.now()) {
          const start = get()
          if (!start.fetchedAt) set({ status: 'loading' })
          const errors: SectionErrors = { ...NO_ERRORS }
          const files = { ...start.files }
          let nowFiles = start.nowFiles
          let nowListEtag = start.nowListEtag
          let offline = false

          try {
            const list = await client.listDir(NOW_DIR, start.nowListEtag)
            if (list.status === 'missing') {
              nowFiles = []
              nowListEtag = null
            } else if (list.status === 'ok') {
              nowFiles = list.value.filter((e) => e.type === 'file' && e.name.endsWith('.md')).map((e) => e.path).sort()
              nowListEtag = list.etag
            }
          } catch (error) {
            if (error instanceof AuthError) return set({ status: start.fetchedAt ? 'ready' : 'idle' })
            if (isNetworkError(error)) offline = true
            else errors.now = describeError(error)
          }

          if (!offline) {
            for (const path of Object.keys(files)) if (path.startsWith(`${NOW_DIR}/`) && !nowFiles.includes(path)) delete files[path]
            const paths = [...nowFiles, PROJECTS_PATH, IDEAS_PATH]
            const results = await Promise.allSettled(paths.map((path) => client.getFile(path, files[path]?.etag)))
            results.forEach((result, i) => {
              const path = paths[i]
              if (result.status === 'rejected') {
                if (isNetworkError(result.reason)) offline = true
                else if (!(result.reason instanceof AuthError)) errors[sectionOf(path)] ??= describeError(result.reason)
                return
              }
              const fetched = result.value
              if (fetched.status === 'ok') files[path] = { ...fetched.value, etag: fetched.etag }
              else if (fetched.status === 'missing') delete files[path]
            })
          }

          if (offline) return set({ status: 'offline' })
          set({ files, nowFiles, nowListEtag, errors, status: 'ready', fetchedAt: now })
        },

        async addIdea(client, input, today) {
          const title = input.title.trim()
          if (!title) throw new Error('Title is required')
          const note = input.note?.trim() || undefined
          try {
            storeIdeas(await writeIdeasFile(client, (text) => addIdeaText(text, { title, note }, today), `hub: add idea "${title}"`))
            return 'saved'
          } catch (error) {
            if (!isNetworkError(error)) throw error
            set((s) => ({ pending: [...s.pending, { localId: uid(), title, note, createdOn: today }] }))
            return 'queued'
          }
        },

        async addNote(client, id, note, today) {
          storeIdeas(await writeIdeasFile(client, (text) => addNoteText(text ?? '', id, note, today), `hub: note on "${titleOf(id)}"`))
        },

        async moveStage(client, id, stage, today, why) {
          storeIdeas(await writeIdeasFile(client, (text) => moveStageText(text ?? '', id, stage, today, why), `hub: move "${titleOf(id)}" to ${stage}`))
        },

        syncPending(client) {
          syncing ??= (async () => {
            try {
              for (const item of [...get().pending]) {
                const file = await writeIdeasFile(
                  client,
                  (text) =>
                    // Already there (a previous save landed but its response was lost): nothing to write.
                    parseIdeas(text).some((idea) => idea.title === item.title && idea.added === item.createdOn)
                      ? null
                      : addIdeaText(text, { title: item.title, note: item.note }, item.createdOn),
                  `hub: add idea "${item.title}"`,
                )
                set((s) => ({ files: { ...s.files, [IDEAS_PATH]: file }, pending: s.pending.filter((p) => p.localId !== item.localId) }))
              }
            } catch (error) {
              if (!isNetworkError(error) && !(error instanceof AuthError)) throw error
            } finally {
              syncing = null
            }
          })()
          return syncing
        },

        reset() {
          set({ files: {}, nowFiles: [], nowListEtag: null, fetchedAt: null, status: 'idle', errors: NO_ERRORS })
        },
      }
    },
    {
      name: HUB_STORAGE_KEY,
      partialize: (s) => ({ files: s.files, nowFiles: s.nowFiles, nowListEtag: s.nowListEtag, fetchedAt: s.fetchedAt, pending: s.pending }),
    },
  ),
)
```

Note: the conflict test's fake repo appends `## Edited on the PC` on each forced conflict; the second `moveStage` attempt must read that fresh text, which `writeIdeasFile` does by re-fetching at the top of every loop.

- [ ] **Step 4: Run tests**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (all suites); no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/apps/hub/store
git commit -m "feat(hub): cached store with refresh, conflict-safe writes and an offline idea queue" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Sign-in screens, routes, launcher tile and Settings row

**Files:**
- Create: `src/apps/hub/pages/SignIn.tsx`, `src/apps/hub/pages/NoAccess.tsx`, `src/apps/hub/pages/AuthCallback.tsx`, `src/apps/hub/pages/HubHome.tsx`, `src/apps/hub/routes.tsx`, `src/settings/GitHubCard.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`, `src/launcher/registry.ts`, `src/settings/Settings.tsx`

**Interfaces:**
- Consumes: `startSignIn`, `completeSignIn`, `hasAuthCallback`, `AuthError` (github-auth.ts); `useAuthStore`; `getHubClient`; `useHubStore`
- Produces: routes `/hub` (HubHome), `/hub/callback` (AuthCallback), `/hub/ideas/:id` (IdeaDetail — created in Task 14; until then the route renders `HubHome`); `HubHome` renders `HubDashboard` (Task 13) when signed in with access — in this task it renders a placeholder `<p>` that Task 13 replaces.

- [ ] **Step 1: Create the pages**

`src/apps/hub/pages/SignIn.tsx`:

```tsx
import { useState } from 'react'
import { Github, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { AuthError, startSignIn } from '@/apps/hub/auth/github-auth'

export function SignIn() {
  const [busy, setBusy] = useState(false)

  async function signIn() {
    setBusy(true)
    try {
      await startSignIn()
    } catch (error) {
      setBusy(false)
      toast.error(
        error instanceof AuthError && error.code === 'not_configured'
          ? 'Sign-in is not set up for this build (VITE_GITHUB_CLIENT_ID is missing).'
          : 'Could not start sign-in.',
      )
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-7 w-7" />
        </span>
        <h2 className="mt-3 text-lg font-semibold">Hub</h2>
        <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
          Your work in progress, ideas and projects, from your personal-hub repo
        </p>
        <Button className="mt-5 w-full max-w-xs" onClick={signIn} disabled={busy}>
          <Github />
          Sign in with GitHub
        </Button>
        <p className="mt-3 max-w-[260px] text-xs text-muted-foreground">
          Nook can only read and edit the repo you install it on. Revoke any time in GitHub settings.
        </p>
      </div>
    </div>
  )
}
```

`src/apps/hub/pages/NoAccess.tsx`:

```tsx
import { ShieldX } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { HUB_REPO } from '@/apps/hub/config'

export function NoAccess() {
  const login = useAuthStore((s) => s.user?.login)
  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      <EmptyState
        icon={ShieldX}
        title={`Nothing set up for ${login ? `@${login}` : 'this account'}`}
        description={`Hub reads ${HUB_REPO}. This GitHub account can't see it.`}
      >
        <Button variant="outline" onClick={() => useAuthStore.getState().signOut()}>
          Sign out
        </Button>
      </EmptyState>
    </div>
  )
}
```

`src/apps/hub/pages/AuthCallback.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { AuthError, completeSignIn } from '@/apps/hub/auth/github-auth'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { getHubClient } from '@/apps/hub/github/instance'

let finishing: Promise<void> | null = null

/** Runs once per page load, even under StrictMode's double effects. */
function finishSignIn(): Promise<void> {
  finishing ??= (async () => {
    const search = window.location.search
    window.history.replaceState(null, '', `${window.location.pathname}#/hub/callback`)
    const session = await completeSignIn(search)
    useAuthStore.getState().setSession(session)
    const client = getHubClient()
    const [user, hasAccess] = await Promise.all([client.getUser(), client.checkAccess()])
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setAccess(hasAccess ? 'ok' : 'none')
  })()
  return finishing
}

function messageFor(error: unknown): string {
  if (error instanceof AuthError && error.code === 'cancelled') return 'Sign-in was cancelled.'
  if (error instanceof AuthError && error.code === 'state_mismatch') return 'This sign-in link expired. Try again.'
  return 'Sign-in failed. Try again.'
}

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    finishSignIn()
      .then(() => active && navigate('/hub', { replace: true }))
      .catch((e: unknown) => active && setError(messageFor(e)))
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      {error ? (
        <EmptyState icon={CircleAlert} title={error}>
          <Button asChild variant="outline">
            <Link to="/hub">Back to sign-in</Link>
          </Button>
        </EmptyState>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground" role="status">
          Signing you in…
        </p>
      )}
    </div>
  )
}
```

`src/apps/hub/pages/HubHome.tsx` (placeholder body replaced in Task 13):

```tsx
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { SignIn } from '@/apps/hub/pages/SignIn'
import { NoAccess } from '@/apps/hub/pages/NoAccess'

export function HubHome() {
  const session = useAuthStore((s) => s.session)
  const access = useAuthStore((s) => s.access)
  if (!session) return <SignIn />
  if (access === 'none') return <NoAccess />
  return <p className="p-4 text-sm text-muted-foreground">Signed in.</p>
}
```

`src/apps/hub/routes.tsx`:

```tsx
import { Route } from 'react-router-dom'
import { HubHome } from '@/apps/hub/pages/HubHome'
import { AuthCallback } from '@/apps/hub/pages/AuthCallback'

/** Route elements for the Hub app, mounted under /hub in App.tsx. */
export const hubRoutes = (
  <>
    <Route path="/hub" element={<HubHome />} />
    <Route path="/hub/callback" element={<AuthCallback />} />
  </>
)
```

- [ ] **Step 2: Wire routes, the callback hop, the tile and Settings**

`src/App.tsx` — add `import { hubRoutes } from '@/apps/hub/routes'` and render `{hubRoutes}` right after `{splitRoutes}`.

`src/main.tsx` — after the `applyTheme(getStoredTheme())` line add:

```ts
import { hasAuthCallback } from '@/apps/hub/auth/github-auth'
```

(at the top with the other imports) and:

```ts
// GitHub sends sign-in back to "/?code=…&state=…"; hop to the callback route before the router mounts.
if (hasAuthCallback(window.location.search)) window.location.hash = '#/hub/callback'
```

`src/launcher/registry.ts` — import `LayoutDashboard` next to `Receipt` and append to `apps`:

```ts
  {
    id: 'hub',
    name: 'Hub',
    description: "What I'm working on",
    icon: LayoutDashboard,
    to: '/hub',
  },
```

`src/settings/GitHubCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { useHubStore } from '@/apps/hub/store/useHubStore'

export function GitHubCard() {
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)

  function signOut() {
    useAuthStore.getState().signOut()
    useHubStore.getState().reset()
    toast.success('Signed out of GitHub')
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-base">GitHub</CardTitle>
        <CardDescription>Used by Hub to read and edit your personal-hub repo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {session ? (
          <>
            <div className="flex items-center gap-3">
              {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full ring-1 ring-border" />}
              <span className="font-medium">@{user?.login ?? 'unknown'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
              <Button asChild variant="outline">
                <a href="https://github.com/settings/apps/authorizations" target="_blank" rel="noreferrer">
                  Manage access
                </a>
              </Button>
            </div>
          </>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/hub">Sign in from Hub</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

`src/settings/Settings.tsx` — add `import { GitHubCard } from '@/settings/GitHubCard'` and render `<GitHubCard />` immediately before the `<Card className="mb-5">` whose `<CardTitle>` is `Backup`.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass, build succeeds.

Then start the dev server with the `dev` config in `.claude/launch.json` (preview tools), open `http://localhost:5173/#/`, and check: the launcher shows **Hub** next to **Split**; tapping it shows the sign-in screen; Settings shows a **GitHub** card with "Sign in from Hub"; opening `http://localhost:5173/?code=x&state=y#/` lands on `#/hub/callback` and shows "This sign-in link expired. Try again." No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/apps/hub src/App.tsx src/main.tsx src/launcher/registry.ts src/settings
git commit -m "feat(hub): sign-in screens, callback route, launcher tile and Settings GitHub row" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Hub home (layout A) and the dev demo

**Files:**
- Create: `src/apps/hub/dev/demo.ts`, `src/apps/hub/hooks/useOnline.ts`
- Create: `src/apps/hub/components/SectionHead.tsx`, `StageBadge.tsx`, `Linkified.tsx`, `NeedsYouList.tsx`, `WipList.tsx`, `IdeaRow.tsx`, `IdeasSection.tsx`, `ProjectList.tsx`, `SyncBanner.tsx`, `HubSkeleton.tsx`, `HubEmpty.tsx`, `HubAvatar.tsx`, `NewIdeaDialog.tsx`
- Create: `src/apps/hub/pages/HubDashboard.tsx`
- Modify: `src/apps/hub/pages/HubHome.tsx`, `src/apps/hub/github/instance.ts`, `src/main.tsx`, `src/shared/components/PageHeader.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–12.
- Produces: `PageHeader` gains an optional `className?: string` merged into the `<header>`; `StageBadge`, `STAGE_LABEL`, `SectionHead`, `IdeaRow` (reused by Task 14); `useOnline(): boolean`; dev URL `http://localhost:5173/?hub-demo#/hub`.

- [ ] **Step 1: Shared pieces**

`src/shared/components/PageHeader.tsx` — add `className?: string` to `PageHeaderProps`, import `cn` from `@/shared/lib/utils`, and change the header's `className` to:

```tsx
    <header className={cn('sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur', className)}>
```

(and destructure `className` in the function parameters).

`src/apps/hub/hooks/useOnline.ts`:

```ts
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
```

`src/apps/hub/components/SectionHead.tsx`:

```tsx
import type { ReactNode } from 'react'

export function SectionHead({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex min-h-9 items-center justify-between gap-3 px-1">
      <h2 className="text-base font-semibold">
        {title}
        {meta && <span className="ml-2 text-sm font-normal text-muted-foreground">{meta}</span>}
      </h2>
      {action}
    </div>
  )
}
```

`src/apps/hub/components/StageBadge.tsx`:

```tsx
import type { Stage } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

export const STAGE_LABEL: Record<Stage, string> = {
  idea: 'Idea',
  exploring: 'Exploring',
  building: 'Building',
  shipped: 'Shipped',
  dropped: 'Dropped',
}

const DOT: Record<Stage, string> = {
  building: 'bg-success',
  exploring: 'bg-primary',
  idea: 'bg-muted-foreground',
  shipped: 'bg-muted-foreground',
  dropped: 'bg-muted-foreground',
}

/** Neutral pill + colored dot: readable in every palette (colored text badges fail contrast in light themes). */
export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[stage])} aria-hidden />
      {STAGE_LABEL[stage]}
    </span>
  )
}
```

`src/apps/hub/components/Linkified.tsx`:

```tsx
import { Fragment } from 'react'

const TOKEN = /(PR #\d+|https?:\/\/[^\s)]+)/g

/** Turns `PR #n` (needs the project's repo link) and URLs into links; everything else stays text. */
export function Linkified({ text, repoLink }: { text: string; repoLink: string | null }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const href = part.startsWith('PR #') ? (repoLink ? `${repoLink.replace(/\/$/, '')}/pull/${part.slice(4)}` : null) : part
        return href ? (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      })}
    </>
  )
}
```

`src/apps/hub/components/HubAvatar.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { HubUser } from '@/apps/hub/auth/useAuthStore'

export function HubAvatar({ user }: { user: HubUser | null }) {
  const label = user ? `@${user.login} · Settings` : 'Settings'
  return (
    <Link to="/settings" aria-label={label} title={label} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-foreground">
          {(user?.login ?? '?').slice(0, 2)}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Section components**

`src/apps/hub/components/NeedsYouList.tsx`:

```tsx
import { useState } from 'react'
import { ChevronRight, Hand, Moon } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { ageLabel } from '@/apps/hub/lib/needs-you'
import type { NeedsYouItem } from '@/apps/hub/lib/types'

export function NeedsYouList({ items, onOpen }: { items: NeedsYouItem[]; onOpen: (item: NeedsYouItem) => void }) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const more = items.length - 3
  const shown = expanded ? items : items.slice(0, 3)
  return (
    <section className="mt-4 lg:mt-0">
      <SectionHead
        title="Needs you"
        action={
          more > 0 && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="h-8 rounded-md px-2 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              {expanded ? 'Show less' : `+${more} more`}
            </button>
          )
        }
      />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {shown.map((item, i) => (
          <li key={`${item.kind}-${i}-${item.title}`}>
            <button type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-foreground/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                {item.kind === 'waiting' ? <Hand className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.context} · {item.kind === 'waiting' ? `waiting ${ageLabel(item.days)}` : `quiet for ${ageLabel(item.days)}`}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`src/apps/hub/components/WipList.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, Hand } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { Linkified } from '@/apps/hub/components/Linkified'
import { THRESHOLDS } from '@/apps/hub/config'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, staleDays, waitingDays } from '@/apps/hub/lib/needs-you'
import type { WipCard } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

interface Props {
  cards: WipCard[]
  today: Date
  repoLinks: Map<string, string>
  error: string | null
}

export function WipList({ cards, today, repoLinks, error }: Props) {
  return (
    <section>
      <SectionHead title="Now" meta={`${cards.length} ${cards.length === 1 ? 'project' : 'projects'}`} />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load NOW notes. {error}</p>}
      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No NOW notes in personal-hub yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {cards.map((card) => (
            <WipRow key={card.file} card={card} today={today} repoLink={repoLinks.get(card.project) ?? null} />
          ))}
        </ul>
      )}
    </section>
  )
}

function WipRow({ card, today, repoLink }: { card: WipCard; today: Date; repoLink: string | null }) {
  const [open, setOpen] = useState(false)
  const stale = staleDays(card, today)
  const waiting = waitingDays(card, today)
  const meta = [card.machine, card.lastWorked && formatDay(card.lastWorked, today)].filter(Boolean).join(' · ')
  return (
    <li id={`wip-${card.project}`} className="scroll-mt-20 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold">{card.project}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {meta}
          {stale !== null && (
            <>
              {' · '}
              <span className="text-warning">{ageLabel(stale)} ago</span>
            </>
          )}
        </span>
      </div>
      {card.nextAction && (
        <p className="mt-1 text-pretty text-sm">
          <Linkified text={card.nextAction} repoLink={repoLink} />
        </p>
      )}
      {card.waitingOnMe && (
        <p className={cn('mt-2 flex items-start gap-1.5 text-pretty text-sm', waiting !== null && waiting >= THRESHOLDS.waitingAmberDays ? 'text-warning' : 'text-muted-foreground')}>
          <Hand className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Waiting on you{waiting ? ` ${ageLabel(waiting)}` : ''}</span>{' '}
            <span className="text-foreground/80">· {card.waitingOnMe}</span>
          </span>
        </p>
      )}
      {card.inFlight.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-ml-1 mt-1 inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            In flight ({card.inFlight.length})
          </button>
          {open && (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {card.inFlight.map((item, i) => (
                <li key={i}>
                  <Linkified text={item} repoLink={repoLink} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}
```

`src/apps/hub/components/IdeaRow.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { StageBadge } from '@/apps/hub/components/StageBadge'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, quietDays } from '@/apps/hub/lib/needs-you'
import type { Idea } from '@/apps/hub/lib/types'

export function IdeaRow({ idea, today }: { idea: Idea; today: Date }) {
  const last = idea.progress[idea.progress.length - 1]
  const quiet = quietDays(idea, today)
  return (
    <li>
      <Link to={`/hub/ideas/${idea.id}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-foreground/5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{idea.title}</p>
          {(last || idea.added) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {last ? `${formatDay(last.date, today)} · ${last.text}` : `Added ${formatDay(idea.added!, today)}`}
            </p>
          )}
          {quiet !== null && <p className="mt-0.5 text-xs text-warning">Quiet for {ageLabel(quiet)}</p>}
        </div>
        <StageBadge stage={idea.stage} className="mt-0.5" />
      </Link>
    </li>
  )
}
```

`src/apps/hub/components/IdeasSection.tsx`:

```tsx
import { useState } from 'react'
import { CloudOff, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { STAGE_LABEL, StageBadge } from '@/apps/hub/components/StageBadge'
import { IdeaRow } from '@/apps/hub/components/IdeaRow'
import { ACTIVE_STAGES, STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import type { PendingIdea } from '@/apps/hub/store/useHubStore'

type Filter = 'active' | Stage

const matches = (idea: Idea, filter: Filter) => (filter === 'active' ? ACTIVE_STAGES.includes(idea.stage) : idea.stage === filter)

interface Props {
  ideas: Idea[]
  pending: PendingIdea[]
  today: Date
  error: string | null
  onNew: () => void
}

export function IdeasSection({ ideas, pending, today, error, onNew }: Props) {
  const [filter, setFilter] = useState<Filter>('active')
  const includesPending = (f: Filter) => f === 'active' || f === 'idea'
  const count = (f: Filter) => ideas.filter((i) => matches(i, f)).length + (includesPending(f) ? pending.length : 0)
  const shown = ideas.filter((i) => matches(i, filter))
  const shownPending = includesPending(filter) ? pending : []
  const filters: Filter[] = ['active', ...STAGES]

  return (
    <section>
      <SectionHead
        title="Ideas"
        meta={`${count('active')} active`}
        action={
          <Button size="sm" className="hidden lg:inline-flex" onClick={onNew}>
            <Plus />
            New idea
          </Button>
        }
      />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load ideas.md. {error}</p>}
      <div className="-mx-4 mb-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 lg:flex-wrap" role="radiogroup" aria-label="Filter ideas by stage">
          {filters.map((f) => {
            const active = f === filter
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
                )}
              >
                {f === 'active' ? 'Active' : STAGE_LABEL[f]} <span>{count(f)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {shown.length === 0 && shownPending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'active' ? 'No ideas yet. Catch the next one with New idea.' : `No ${STAGE_LABEL[filter].toLowerCase()} ideas.`}
        </p>
      ) : (
        <ul className="space-y-0.5 rounded-2xl border border-border bg-card p-1">
          {shownPending.map((p) => (
            <li key={p.localId}>
              <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 outline-dashed outline-1 outline-border">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{p.title}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <CloudOff className="h-3.5 w-3.5" />
                    Not synced yet
                  </p>
                </div>
                <StageBadge stage="idea" className="mt-0.5" />
              </div>
            </li>
          ))}
          {shown.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} today={today} />
          ))}
        </ul>
      )}
    </section>
  )
}
```

`src/apps/hub/components/ProjectList.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import type { Project } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

const DOT = { active: 'bg-success', paused: 'bg-warning', archived: 'bg-muted-foreground' } as const

export function ProjectList({ projects, error }: { projects: Project[]; error: string | null }) {
  const [showAll, setShowAll] = useState(false)
  const active = projects.filter((p) => p.status === 'active')
  const rest = projects.filter((p) => p.status !== 'active')
  const shown = showAll ? [...active, ...rest] : active
  return (
    <section>
      <SectionHead title="Projects" meta={`${active.length} active`} />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load projects.md. {error}</p>}
      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Add projects.md to personal-hub to list your projects here.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {shown.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT[p.status])} aria-hidden />
                <span className="sr-only">{p.status}</span>
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                    {p.name}
                  </a>
                ) : (
                  <span className="truncate font-medium">{p.name}</span>
                )}
              </span>
              {p.stack && <span className="max-w-[50%] truncate text-sm text-muted-foreground">{p.stack}</span>}
            </li>
          ))}
          {rest.length > 0 && (
            <li>
              <button type="button" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                {showAll ? 'Hide paused and archived' : `Show ${rest.length} paused or archived`}
                <ChevronDown className={cn('h-4 w-4 transition-transform', showAll && 'rotate-180')} />
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
```

`src/apps/hub/components/SyncBanner.tsx`:

```tsx
import { CloudOff } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatStamp } from '@/apps/hub/lib/dates'

export function SyncBanner({ fetchedAt, onRetry }: { fetchedAt: number | null; onRetry: () => void }) {
  return (
    <div role="status" className="mt-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
      <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-warning">Can't reach GitHub</p>
        <p className="mt-0.5 text-pretty text-sm text-foreground/80">
          {fetchedAt ? `Showing your copy from ${formatStamp(fetchedAt)}. ` : ''}New ideas stay on this phone until you're back online.
        </p>
      </div>
      <div className="flex shrink-0 items-center self-center">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
```

`src/apps/hub/components/HubSkeleton.tsx`:

```tsx
const bar = (width: string) => <div className={`h-3 ${width} animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none`} />

export function HubSkeleton() {
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
      <div className="lg:col-span-7">
        <div className="mb-2 mt-6 h-4 w-24 rounded-full bg-foreground/5" />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {[['w-1/3', 'w-11/12', 'w-2/3'], ['w-2/5', 'w-4/5', 'w-1/2'], ['w-1/4', 'w-3/4']].map((row, i) => (
            <li key={i} className="space-y-2.5 px-4 py-4">
              {row.map((w) => <div key={w}>{bar(w)}</div>)}
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-5">
        <div className="mb-2 mt-6 h-4 w-20 rounded-full bg-foreground/5" />
        <ul className="rounded-2xl border border-border bg-card p-1">
          {['w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'].map((w) => (
            <li key={w} className="flex items-start gap-3 px-3 py-3">
              <div className="flex-1 space-y-2">
                {bar(w)}
                {bar('w-1/3')}
              </div>
              <div className="h-5 w-16 rounded-full bg-foreground/5" />
            </li>
          ))}
        </ul>
      </div>
      <span className="sr-only" role="status">
        Loading your hub
      </span>
    </div>
  )
}
```

`src/apps/hub/components/HubEmpty.tsx`:

```tsx
import { ExternalLink, Sprout } from 'lucide-react'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { githubRepoUrl } from '@/apps/hub/config'

export function HubEmpty() {
  return (
    <div className="mt-6">
      <EmptyState icon={Sprout} title="Nothing in personal-hub yet" description="Add NOW notes, projects.md or ideas.md to the repo and they show up here. Your first idea creates ideas.md for you.">
        <Button asChild variant="outline" size="sm">
          <a href={githubRepoUrl()} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open personal-hub on GitHub
          </a>
        </Button>
      </EmptyState>
    </div>
  )
}
```

`src/apps/hub/components/NewIdeaDialog.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

export function NewIdeaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setNote('')
    setError(null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the idea a title')
      return
    }
    setSaving(true)
    try {
      const result = await useHubStore.getState().addIdea(getHubClient(), { title, note }, localDate(new Date()))
      toast.success(result === 'saved' ? 'Idea saved' : "Saved on this phone — it syncs when you're back online")
      onOpenChange(false)
    } catch (e) {
      toast.error(describeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New idea</DialogTitle>
            <DialogDescription>Saved to ideas.md in personal-hub.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="idea-title">Title</Label>
            <Input
              id="idea-title"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'idea-title-error' : undefined}
            />
            {error && (
              <p id="idea-title-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="idea-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="idea-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save idea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: The dashboard page**

`src/apps/hub/pages/HubDashboard.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { getHubClient } from '@/apps/hub/github/instance'
import { relativeTime } from '@/apps/hub/lib/dates'
import { needsYou } from '@/apps/hub/lib/needs-you'
import type { NeedsYouItem } from '@/apps/hub/lib/types'
import { parseHubData, useHubStore } from '@/apps/hub/store/useHubStore'
import { NeedsYouList } from '@/apps/hub/components/NeedsYouList'
import { WipList } from '@/apps/hub/components/WipList'
import { IdeasSection } from '@/apps/hub/components/IdeasSection'
import { ProjectList } from '@/apps/hub/components/ProjectList'
import { SyncBanner } from '@/apps/hub/components/SyncBanner'
import { HubSkeleton } from '@/apps/hub/components/HubSkeleton'
import { HubEmpty } from '@/apps/hub/components/HubEmpty'
import { HubAvatar } from '@/apps/hub/components/HubAvatar'
import { NewIdeaDialog } from '@/apps/hub/components/NewIdeaDialog'

const FOREGROUND_REFRESH_MS = 5 * 60 * 1000

export function HubDashboard() {
  const navigate = useNavigate()
  const files = useHubStore((s) => s.files)
  const nowFiles = useHubStore((s) => s.nowFiles)
  const fetchedAt = useHubStore((s) => s.fetchedAt)
  const status = useHubStore((s) => s.status)
  const errors = useHubStore((s) => s.errors)
  const pending = useHubStore((s) => s.pending)
  const user = useAuthStore((s) => s.user)
  const [newOpen, setNewOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const today = useMemo(() => new Date(), [fetchedAt])
  const data = useMemo(() => parseHubData(files, nowFiles), [files, nowFiles])
  const repoLinks = useMemo(() => new Map(data.projects.filter((p) => p.link).map((p) => [p.name, p.link!])), [data.projects])
  const items = useMemo(() => needsYou(data.wip, data.ideas, today), [data, today])

  const sync = useCallback(async () => {
    const client = getHubClient()
    await useHubStore.getState().syncPending(client)
    await useHubStore.getState().refresh(client)
  }, [])

  useEffect(() => {
    void sync()
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > FOREGROUND_REFRESH_MS) void sync()
    }
    const onOnline = () => void sync()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [sync])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await sync()
    } finally {
      setRefreshing(false)
    }
  }

  function openItem(item: NeedsYouItem) {
    if (item.target.type === 'idea') navigate(`/hub/ideas/${item.target.id}`)
    else document.getElementById(`wip-${item.target.project}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const firstLoad = status === 'loading' && !fetchedAt
  const isEmpty = !firstLoad && fetchedAt !== null && data.wip.length === 0 && data.projects.length === 0 && data.ideas.length === 0 && pending.length === 0
  const subtitle = firstLoad ? 'Loading…' : fetchedAt ? `Updated ${relativeTime(fetchedAt, Date.now())}` : 'Not synced yet'

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 lg:max-w-6xl lg:px-8 lg:pb-12">
      <PageHeader
        title="Hub"
        subtitle={subtitle}
        backTo="/"
        className="mb-2 lg:-mx-8 lg:px-8"
        actions={
          <>
            <Button variant="ghost" size="icon" aria-label="Refresh" title="Refresh" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && 'animate-spin motion-reduce:animate-none')} />
            </Button>
            <HubAvatar user={user} />
          </>
        }
      />
      {status === 'offline' && <SyncBanner fetchedAt={fetchedAt} onRetry={onRefresh} />}
      {firstLoad ? (
        <HubSkeleton />
      ) : isEmpty ? (
        <HubEmpty />
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
          <div className="lg:col-span-7">
            <NeedsYouList items={items} onOpen={openItem} />
            <WipList cards={data.wip} today={today} repoLinks={repoLinks} error={errors.now} />
          </div>
          <div className="lg:col-span-5">
            <IdeasSection ideas={data.ideas} pending={pending} today={today} error={errors.ideas} onNew={() => setNewOpen(true)} />
            <ProjectList projects={data.projects} error={errors.projects} />
          </div>
        </div>
      )}
      {!firstLoad && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button className="w-full" onClick={() => setNewOpen(true)}>
              <Plus />
              New idea
            </Button>
          </div>
        </div>
      )}
      <NewIdeaDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}
```

`src/apps/hub/pages/HubHome.tsx` — replace the placeholder return with `return <HubDashboard />` and import it from `@/apps/hub/pages/HubDashboard`.

- [ ] **Step 4: Dev demo**

`src/apps/hub/dev/demo.ts`:

```ts
import nowBill from '@/apps/hub/lib/__fixtures__/now-bill-splitter.md?raw'
import nowIdle from '@/apps/hub/lib/__fixtures__/now-idle-farming.md?raw'
import projectsMd from '@/apps/hub/lib/__fixtures__/projects.md?raw'
import ideasMd from '@/apps/hub/lib/__fixtures__/ideas.md?raw'
import type { GitHubClient } from '@/apps/hub/github/client'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'

/**
 * DEV ONLY. Open http://localhost:5173/?hub-demo#/hub to use Hub with fixture data and no GitHub.
 * Every caller guards with `import.meta.env.DEV &&` so production builds drop this module.
 */
export function isHubDemo(): boolean {
  return new URLSearchParams(window.location.search).has('hub-demo')
}

export function seedDemoSession(): void {
  const far = Date.now() + 365 * 86_400_000
  useAuthStore.setState({
    session: { accessToken: 'demo', accessExpiresAt: far, refreshToken: 'demo', refreshExpiresAt: far },
    user: { login: 'demo', avatarUrl: '' },
    access: 'ok',
  })
}

export function createDemoClient(): GitHubClient {
  const files = new Map<string, string>([
    ['now/bill-splitter.md', nowBill],
    ['now/idle-farming.md', nowIdle],
    ['projects.md', projectsMd],
    ['ideas.md', ideasMd],
  ])
  let version = 0
  return {
    async getUser() {
      return { login: 'demo', avatarUrl: '' }
    },
    async checkAccess() {
      return true
    },
    async listDir(path) {
      const value = [...files.keys()].filter((p) => p.startsWith(`${path}/`)).map((p) => ({ name: p.slice(path.length + 1), path: p, type: 'file' }))
      return value.length ? { status: 'ok', value, etag: null } : { status: 'missing' }
    },
    async getFile(path) {
      const text = files.get(path)
      return text === undefined ? { status: 'missing' } : { status: 'ok', value: { text, sha: `demo-${version}` }, etag: null }
    },
    async putFile(path, text) {
      files.set(path, text)
      version++
      return { sha: `demo-${version}` }
    },
  }
}
```

`src/apps/hub/github/instance.ts` — replace the body of `getHubClient` with:

```ts
export function getHubClient(): GitHubClient {
  if (import.meta.env.DEV && isHubDemo()) {
    client ??= createDemoClient()
    return client
  }
  client ??= createGitHubClient({
    repo: HUB_REPO,
    fetch: (...args) => fetch(...args),
    getToken: () => getAccessToken(),
    refreshToken: () => forceRefresh(),
  })
  return client
}
```

and add `import { createDemoClient, isHubDemo } from '@/apps/hub/dev/demo'`.

`src/main.tsx` — add `import { isHubDemo, seedDemoSession } from '@/apps/hub/dev/demo'` and, after the callback hop line:

```ts
if (import.meta.env.DEV && isHubDemo()) seedDemoSession()
```

- [ ] **Step 5: Verify in the browser against wireframe A**

Run: `npm test && npx tsc --noEmit && npm run build`
Then confirm the demo is not in the production bundle: `grep -rl "hub-demo" dist` → expected: no output.

Start the `dev` preview, open `http://localhost:5173/?hub-demo#/hub` and check, at 375px and at 1440px, dark and light theme (Settings → Appearance):
- Blocks in order: header, Needs you (3 rows: photo-tagging grill, working title, photo-tagging quiet), Now (2 rows; idle-farming shows "fedora · 12 Sep · 3 weeks ago" with the age in amber), Ideas (Active 3 selected; Building/Exploring/Idea pills with dots), Projects (2 active, "Show 2 paused or archived").
- 1440px: two columns, left Needs you + Now, right Ideas + Projects; "New idea" in the Ideas header; no bottom bar.
- 375px: one column; the pinned "New idea" bar; chips scroll sideways.
- "New idea" → type a title → Save → toast "Idea saved" and the idea appears in Ideas.
- DevTools → Network → Offline, add an idea → toast "Saved on this phone…", dashed "Not synced yet" row; back Online → the row becomes a normal idea.
- `PR #2` in bill-splitter's In flight links to `https://github.com/Kane-SE/bill-splitter/pull/2`.

Then run the evon probe against wireframe A (if the evon plugin is installed): serve `docs/features/2026-10-hub-dashboard/` with a static server on any port, and run
`node "C:/Users/Admins/.claude/plugins/cache/evondevkit/evon/0.3.13/skills/ui-ux/scripts/probe.mjs" "http://localhost:5173/?hub-demo#/hub" --widths 375,1440 --pw "D:/study/automation-app" --wireframe "http://localhost:<port>/wireframe.html?v=a&mau=mau"` (replace `<port>` with the static server's port)
Fix every item it lists under "Việc phải đối chiếu" (things to reconcile) except differences caused by real data being different from the wireframe's sample data; note those in the commit message body.

- [ ] **Step 6: Commit**

```bash
git add src/apps/hub src/main.tsx src/shared/components/PageHeader.tsx
git commit -m "feat(hub): dashboard home in layout A with a dev demo mode" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Idea detail, Add note and Move stage

**Files:**
- Create: `src/apps/hub/pages/IdeaDetail.tsx`, `src/apps/hub/components/AddNoteDialog.tsx`, `src/apps/hub/components/MoveStageDialog.tsx`
- Modify: `src/apps/hub/routes.tsx`

**Interfaces:**
- Consumes: `parseIdeas`, `IDEAS_PATH`, `githubIdeaUrl`, `StageBadge`, `STAGE_LABEL`, `useOnline`, `useHubStore.addNote/moveStage`, `describeError`, `localDate`, `formatDay`.
- Produces: route `/hub/ideas/:id`.

- [ ] **Step 1: Dialogs**

`src/apps/hub/components/AddNoteDialog.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

interface Props {
  ideaId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddNoteDialog({ ideaId, open, onOpenChange }: Props) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNote('')
    setError(null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!note.trim()) {
      setError('Write what happened')
      return
    }
    setSaving(true)
    try {
      await useHubStore.getState().addNote(getHubClient(), ideaId, note, localDate(new Date()))
      toast.success('Note added')
      onOpenChange(false)
    } catch (e) {
      toast.error(describeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
            <DialogDescription>Added to this idea's progress with today's date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="idea-note-text">Note</Label>
            <Input
              id="idea-note-text"
              autoFocus
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'idea-note-error' : undefined}
            />
            {error && (
              <p id="idea-note-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

`src/apps/hub/components/MoveStageDialog.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'
import { STAGE_LABEL } from '@/apps/hub/components/StageBadge'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

interface Props {
  idea: Idea
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveStageDialog({ idea, open, onOpenChange }: Props) {
  const [stage, setStage] = useState<Stage>(idea.stage)
  const [why, setWhy] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStage(idea.stage)
    setWhy('')
  }, [open, idea.stage])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (stage === idea.stage) return
    setSaving(true)
    try {
      await useHubStore.getState().moveStage(getHubClient(), idea.id, stage, localDate(new Date()), why)
      toast.success(`Moved to ${STAGE_LABEL[stage].toLowerCase()}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(describeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Move stage</DialogTitle>
            <DialogDescription>Dropped ideas stay in ideas.md; nothing is deleted.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Stage" className="overflow-hidden rounded-lg border border-border">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stage === s}
                onClick={() => setStage(s)}
                className={cn('flex h-11 w-full items-center justify-between border-b border-border px-3 text-left text-sm last:border-b-0 hover:bg-foreground/5', stage === s && 'font-medium')}
              >
                {STAGE_LABEL[s]}
                {s === idea.stage && <span className="ml-2 text-xs text-muted-foreground">current</span>}
                {stage === s && <Check className="ml-auto h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-why">
              Why <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="stage-why" value={why} onChange={(e) => setWhy(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || stage === idea.stage}>
              {saving ? 'Saving…' : 'Move'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: The page and route**

`src/apps/hub/pages/IdeaDetail.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Plus, SearchX } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { githubIdeaUrl, IDEAS_PATH } from '@/apps/hub/config'
import { formatDay } from '@/apps/hub/lib/dates'
import { parseIdeas } from '@/apps/hub/lib/ideas'
import { useHubStore } from '@/apps/hub/store/useHubStore'
import { useOnline } from '@/apps/hub/hooks/useOnline'
import { StageBadge } from '@/apps/hub/components/StageBadge'
import { AddNoteDialog } from '@/apps/hub/components/AddNoteDialog'
import { MoveStageDialog } from '@/apps/hub/components/MoveStageDialog'
import { SignIn } from '@/apps/hub/pages/SignIn'

export function IdeaDetail() {
  const { id = '' } = useParams()
  const ideasText = useHubStore((s) => s.files[IDEAS_PATH]?.text ?? null)
  const session = useAuthStore((s) => s.session)
  const online = useOnline()
  const [noteOpen, setNoteOpen] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const idea = useMemo(() => parseIdeas(ideasText).find((i) => i.id === id) ?? null, [ideasText, id])
  const today = new Date()

  if (!session) return <SignIn />
  if (!idea) {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Idea" backTo="/hub" />
        <EmptyState icon={SearchX} title="Idea not found" description="It may have been renamed on GitHub.">
          <Button asChild variant="outline">
            <Link to="/hub">Back to Hub</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32">
      <PageHeader title={idea.title} backTo="/hub" />
      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={idea.stage} />
        {idea.added && <span className="text-sm text-muted-foreground">Added {formatDay(idea.added, today)}</span>}
      </div>
      {idea.note && <p className="mt-3 text-pretty">{idea.note}</p>}

      <h2 className="mb-3 mt-6 text-base font-semibold">Progress</h2>
      {idea.progress.length === 0 ? (
        <p className="text-sm text-muted-foreground">No progress notes yet.</p>
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {idea.progress.map((p, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" aria-hidden />
              <p className="text-xs text-muted-foreground">{formatDay(p.date, today)}</p>
              <p className="text-pretty text-sm">{p.text}</p>
            </li>
          ))}
        </ol>
      )}

      <a href={githubIdeaUrl(idea.title)} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        Edit on GitHub <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
          <Button className="flex-1" disabled={!online} onClick={() => setNoteOpen(true)}>
            <Plus />
            Add note
          </Button>
          <Button className="flex-1" variant="outline" disabled={!online} onClick={() => setStageOpen(true)}>
            Move stage
          </Button>
        </div>
        {!online && <p className="pb-2 text-center text-xs text-muted-foreground">Needs connection</p>}
      </div>

      <AddNoteDialog ideaId={idea.id} open={noteOpen} onOpenChange={setNoteOpen} />
      <MoveStageDialog idea={idea} open={stageOpen} onOpenChange={setStageOpen} />
    </div>
  )
}
```

`src/apps/hub/routes.tsx` — add `import { IdeaDetail } from '@/apps/hub/pages/IdeaDetail'` and the route `<Route path="/hub/ideas/:id" element={<IdeaDetail />} />`.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit && npm run build`
In the demo (`?hub-demo#/hub`): open "Photo-tagging for Nomnoms" → timeline shows 17 Aug and 2 Sep; Add note "Round 5 answered" → toast, new last line dated Today; Move stage → Building with why "Spec approved" → badge becomes Building and the timeline gains "Moved to building · Spec approved"; going back, the Needs-you "quiet" row for this idea is gone. Offline: both buttons disabled with "Needs connection". `/hub/ideas/nope` shows "Idea not found".

- [ ] **Step 4: Commit**

```bash
git add src/apps/hub
git commit -m "feat(hub): idea detail with add-note and move-stage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: PWA, security headers, env and setup docs

**Files:**
- Modify: `vite.config.ts`, `index.html`, `README.md`
- Create: `public/status-bar.js`, `vercel.json`, `.env.example`, `docs/hub-setup.md`

- [ ] **Step 1: Keep the service worker away from the API**

`vite.config.ts` — inside `workbox`, add:

```ts
        // /api/* is the token function, never the app shell. GitHub calls are cross-origin and never cached.
        navigateFallbackDenylist: [/^\/api\//],
```

- [ ] **Step 2: Move the inline status-bar script so CSP can forbid inline scripts**

`public/status-bar.js`:

```js
// Match the status bar to the saved palette before anything else loads
// (iOS only reads it at launch). Kept in sync by applyTheme() in src/shared/lib/theme.ts.
try {
  var c = localStorage.getItem('bill-splitter-status-bar')
  if (c) document.querySelector('meta[name="theme-color"]').content = c
} catch (e) {}
```

`index.html` — replace the whole inline `<script>…</script>` block in `<head>` with:

```html
    <script src="/status-bar.js"></script>
```

(a classic, synchronous script: it still runs before the app loads.)

- [ ] **Step 3: CSP**

`vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data: https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Env and docs**

`.env.example`:

```bash
# Hub — copy to .env.local for local dev (ignored by git via *.local)
VITE_GITHUB_CLIENT_ID=
# Optional overrides
# VITE_HUB_REPO=Kane-SE/personal-hub
# VITE_AUTH_BASE_URL=/api

# Server side — set these in Vercel → Project → Settings → Environment Variables, never with a VITE_ prefix:
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
```

`docs/hub-setup.md`:

```markdown
# Hub setup

Hub signs in with a **GitHub App** and reads/writes the private `personal-hub` repo.

## 1. Create the GitHub App (once)

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

- **Name:** Nook Hub (any)
- **Homepage URL:** your production Nook URL
- **Callback URLs:** `https://<production-domain>/`, `https://<preview-domain-pattern>/` you use, and `http://localhost:5173/`
- **Expire user authorization tokens:** on
- **Request user authorization (OAuth) during installation:** off
- **Webhook:** off
- **Repository permissions → Contents:** Read and write. Nothing else.
- **Where can this app be installed:** Only on this account

Create it, then **Generate a new client secret**. Note the **Client ID**.

Install the app: **Install App** → your account → **Only select repositories** → `personal-hub`.

## 2. Vercel environment variables

Project → Settings → Environment Variables (Production and Preview):

| Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | the app's Client ID |
| `GITHUB_CLIENT_SECRET` | the client secret |
| `VITE_GITHUB_CLIENT_ID` | the app's Client ID (public, baked into the bundle) |

Redeploy after adding them.

## 3. Local development

- UI with fixture data and no GitHub: `npm run dev`, open `http://localhost:5173/?hub-demo#/hub`.
- Real sign-in locally needs the `/api` function: run `npx vercel dev` (Vercel CLI, logged in, project linked) and copy the env vars into `.env.local`.

## 4. Revoking access

GitHub → Settings → Applications → Authorized GitHub Apps → Nook Hub → Revoke. Signing out in Nook only forgets the keys on that device.
```

`README.md` — add a short section after the existing app description:

```markdown
## Hub

A second mini-app: your NOW notes, ideas and projects from the private `personal-hub` repo, with
"New idea", "Add note" and "Move stage" saved back as commits. Sign-in uses a GitHub App and one
Vercel function (`api/github/token.ts`). Setup: [docs/hub-setup.md](docs/hub-setup.md).
Design: [docs/features/2026-10-hub-dashboard/spec.md](docs/features/2026-10-hub-dashboard/spec.md).
```

- [ ] **Step 5: Verify**

Run: `npm test && npx tsc --noEmit && npm run build`
Then check the built HTML has no inline script: `grep -c "<script>" dist/index.html` → expected `0`. Start the `dev` preview and confirm the status bar color still follows the palette (Settings → switch palette → reload → `document.querySelector('meta[name="theme-color"]').content` equals the stored value) and the console shows no errors.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts index.html public/status-bar.js vercel.json .env.example docs/hub-setup.md README.md
git commit -m "chore(hub): CSP, service-worker exclusions, env example and setup guide" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: personal-hub data files and NOW-note conventions (separate repo)

This task runs in **`D:\study`** (the `personal-hub` repo), not in bill-splitter. personal-hub takes direct pushes to `main`. **Ask the user before pushing.**

**Files (in `D:\study`):**
- Create: `projects.md`, `ideas.md`
- Modify: `.gitignore`, `machine-setup/setup.mjs`, `machine-setup/skills/wrap/SKILL.md`

- [ ] **Step 1: Allow-list the new files** — in `D:\study\.gitignore`, after `!/CLAUDE.md` add:

```gitignore
!/projects.md
!/ideas.md
```

- [ ] **Step 2: Create `D:\study\projects.md`** from the CLAUDE.md project table:

```markdown
# Projects

## bill-splitter
Status: active
Stack: Vite · React · TS · Tailwind · Zustand · PWA
Link: https://github.com/Kane-SE/bill-splitter

Nook: a small offline PWA of everyday tools (Split, Hub).

## automation-app
Status: active
Stack: Electron · React · Playwright

Desktop browser-automation app (the "Nordstrom bot").

## idle-farming
Status: active
Stack: Godot 4 · design docs

Cozy flower-garden idle game.

## nordstrom-spike
Status: paused
Stack: Node · Playwright

Residential-proxy assessment for automation-app.

## entra-id
Status: paused
Stack: Next.js · next-auth

Auth demo against Microsoft Entra ID.

## ready-2-print
Status: paused
Stack: Next.js · zustand · cropperjs

Image-crop-and-print web app.

## excel-validation
Status: paused
Stack: Vite · TypeScript · ExcelJS

Excel template validation utilities.

## calendar
Status: paused
Stack: Vanilla JS

Standalone calendar widget.

## test
Status: archived
Stack: React

Throwaway experiments.
```

(Ask the user to confirm the statuses; they are a best guess from the NOW notes.)

- [ ] **Step 3: Create `D:\study\ideas.md`**:

```markdown
# Ideas

## Hub dashboard in Nook
Stage: building
Added: 2026-10-04

A Nook mini-app showing NOW notes, ideas and projects from personal-hub.

- 2026-10-04 — Idea captured
- 2026-10-05 — Design and plan approved
```

- [ ] **Step 4: Machine names** — in `machine-setup/setup.mjs`, after the `claudeDir` constant add:

```js
// 0. Machine name, written into NOW notes by /wrap ("Last worked: <date> · <name>").
//    Usage: node machine-setup/setup.mjs --machine pc   (pc | fedora | work-laptop)
//    Cloud sessions never run this script, so a missing file means "phone".
const machineArg = process.argv.indexOf('--machine');
const machineFile = path.join(claudeDir, 'machine-name');
if (machineArg !== -1 && process.argv[machineArg + 1]) {
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(machineFile, `${process.argv[machineArg + 1].trim()}\n`);
  console.log(`name   ${process.argv[machineArg + 1].trim()} -> ${machineFile}`);
} else if (!fs.existsSync(machineFile)) {
  console.log('name   not set — re-run with --machine <pc|fedora|work-laptop>');
}
```

and in the usage block at the top of `machine-setup/README.md` (if it documents the command), change `node machine-setup/setup.mjs` to `node machine-setup/setup.mjs --machine <pc|fedora|work-laptop>`.

- [ ] **Step 5: wrap skill rules** — in `machine-setup/skills/wrap/SKILL.md`, in the NOW-note template change

```
   Last worked: <YYYY-MM-DD> · <hostname>
   Next action: <one concrete step, verb first, naming the file or command to start from>
```

to

```
   Last worked: <YYYY-MM-DD> · <machine name: contents of ~/.claude/machine-name, or "phone" if that file does not exist>
   Next action: <one plain sentence — verb, what, why — with references (PR, branch, file) in brackets at the end; never a bare commit hash>
```

- [ ] **Step 6: Run setup on this PC and commit**

```bash
node machine-setup/setup.mjs --machine pc
git -C /d/study add .gitignore projects.md ideas.md machine-setup/setup.mjs machine-setup/skills/wrap/SKILL.md machine-setup/README.md
git -C /d/study commit -m "hub: add projects.md and ideas.md; name machines in NOW notes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Then ask the user: "Push personal-hub now?" and run `git -C /d/study push` only on a yes.

---

### Task 17: End-to-end check and PR

**Files:** none new.

- [ ] **Step 1: Full local check**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all green.

- [ ] **Step 2: Push the branch and open a PR** (ask the user first)

```bash
git push -u origin feature/hub-dashboard
gh pr create --title "Hub: personal dashboard mini-app" --body-file - <<'EOF'
Adds Hub, a second Nook mini-app: NOW notes, ideas and projects from the private personal-hub repo,
with New idea / Add note / Move stage saved back as commits.

- GitHub App sign-in (PKCE) + one Vercel function for the token swap (`api/github/token.ts`)
- Line-surgical edits to ideas.md, conflict retry, offline idea queue
- Layout A from the wireframe; new `--warning` token; CSP via vercel.json

Spec: docs/features/2026-10-hub-dashboard/spec.md
Setup: docs/hub-setup.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 3: Manual checks on the Vercel preview** (the user does the GitHub-side steps in `docs/hub-setup.md` first)

- Sign in with GitHub on the preview URL → lands on Hub with real data.
- A second GitHub account → "Nothing set up for @…".
- Offline (airplane mode on the phone): add an idea → "Not synced yet"; back online → synced, exactly one commit `hub: add idea "…"` in personal-hub.
- Conflict: edit `ideas.md` on the PC and push; without refreshing the phone, add a note → it saves, and both edits are in the file.
- Cancel on GitHub's approve screen → "Sign-in was cancelled."
- Browser console on the preview shows no CSP violations.
- Probe the preview build against wireframe A at 375 and 1440, dark and light (same command as Task 13, Step 5, with the preview URL).

Report each check's result to the user; anything that fails goes back to the owning task.
