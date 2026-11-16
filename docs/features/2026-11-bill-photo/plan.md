# Split: Add from a bill photo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From a Nomnom, snap or pick a photo of a printed bill, then tag each line to the people who had it. Done adds the lines as ordinary items with one payer. The photo stays on the device so tagging can resume.

**Architecture:** Line rules (status, equal or adjusted shares, the bill-total check, draft → items) are pure functions in `src/apps/split/lib/billDraft.ts`, unit-tested like `calc.ts`. Photos live in IndexedDB behind a thin promise wrapper. The JSON store only gains `Item.photoId` and two batch actions. One new page, `BillTagging`, holds the draft in component state. NightDetail gains the entry button and a "Bill photos" card.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind 3, Radix Dialog/Select, zustand 5 (persist), zod 3, sonner, react-router-dom 6 (`HashRouter`), Vitest 2 (node environment, no DOM).

**Spec:** `docs/features/2026-11-bill-photo/spec.md` (decisions #1–#28, numbered as cited below) and `decisions.md`. Mockups: https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4#photo

## Global Constraints

- Branch `feature/bill-photo`. Never commit to or push `main`; a pre-push hook rejects it. One commit per task, each message ending with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run from `D:\study\bill-splitter`. Tests: `npx vitest run [file]`. Types: `npx tsc --noEmit`. Baseline: **425 tests passing** in 39 files.
- **No new libraries** (#26): no `idb`, no `fake-indexeddb`, no pan/zoom or image packages.
- Money is integer VND. Format only with `formatMoney` from `@/apps/split/lib/format`. Equal splits use `equalShares` from `calc.ts`, so shares always add up to the amount.
- Names: on-bill matching is **exact** (as in the debt math). Adding a name reuses an existing one that matches **case-insensitively**, as `ParticipantEditor.add` does.
- `calc.ts` doesn't change. No persist-version bump, no backup-version bump.
- Photo: long edge ≤ **1600px**, `image/jpeg`, quality **0.8**. IndexedDB database `nook-split` v1, store `billPhotos` (keyPath `id`, index `nightId`).
- Route: `/split/night/:id/photo/:photoId`.
- UI copy, exactly: "From photo", "Saving…", "Couldn't read that image", "Couldn't save the photo", "Bill photos", "Not tagged yet", "N line"/"N lines", "Delete this bill photo?", "Its N lines (X) are removed too." / "It has no lines yet.", "Bill photo deleted", "Tag the bill", "Bill photo", "Done", "Paid by", "Bill total (optional)", "Bill shows thousands (×1.000)", "Everyone", "Assigned X · Y left", "Over by X", "All assigned ✓", "Assigned X · N lines", "Already added · edit them in the Nomnom", "+ add name", "{amount} each", "{name} only", "uneven", "Uneven? Adjust ›", "back to equal split", "+ Add line", "+ Tax / service", "+ Tip", "Fill in or remove N line(s)", "N lines added", "Discard N lines?", "The photo stays on the Nomnom. Tap it to tag again.", "This bill photo isn't on this device", and the Delete Nomnom text "This permanently removes the Nomnom, its items and its bill photos. This can't be undone."

## Review Focus

1. **An amount that doesn't divide evenly** (100.000 ₫ among 3): the shares must add up to exactly 100.000, never 99.999. Pinned in Task 2 (`lineShares uneven division`).
2. **"+ add name" with a different case** ("lan" when "Lan" is on the bill): it picks the existing Lan and adds no second person. On Done, a name differing only in case doesn't duplicate a participant either. Pinned in Task 2 (`addBillPerson`) and Task 3 (`dedupes case-insensitively`).
3. **Resuming a photo whose saved payer has since been removed from People:** the payer must fall back and not offer a name that isn't in the Nomnom. Pinned in Task 2 (`initialPayer ignores a saved payer who left`).
4. **Unticking someone on an adjusted line** (Minh 90.000 · Huy 30.000, then Huy is removed): the line goes back to an equal split for whoever is left. Removing the last person makes it incomplete. Pinned in Task 2 (`toggle clears adjusted shares`).
5. **Double-tapping Done** on a slow phone: the lines must be added once. Pinned in Task 7 (Done sets a `committing` flag before writing and ignores further taps; the browser check taps twice quickly).

---

## File map

| File | Responsibility |
|---|---|
| `src/apps/split/types.ts` (modify) | `photoId` on `itemSchema` |
| `src/apps/split/lib/billDraft.ts` (create) | draft-line rules, pure |
| `src/apps/split/lib/billDraft.test.ts` (create) | tests |
| `src/apps/split/store/useSplitStore.ts` (modify) | `addItemsFromPhoto`, `deleteItemsByPhoto` |
| `src/apps/split/store/useSplitStore.test.ts` (modify) | tests |
| `src/settings/backup.test.ts` (modify) | `photoId` round-trip |
| `src/shared/lib/image.ts` (create) + `image.test.ts` | `fitWithin`, `downscaleToJpeg` |
| `src/apps/split/lib/photoStore.ts` (create) | IndexedDB wrapper |
| `src/apps/split/store/useBillPhotos.ts` (create) | React hook: a Nomnom's photos + object URLs |
| `src/shared/components/PanZoom.tsx` (create) | pinch/drag/wheel zoom of one image |
| `src/apps/split/components/ItemDialog.tsx` (modify) | `payerLocked` prop |
| `src/apps/split/lib/format.ts` (modify) + `format.test.ts` | `scaleMoney` for the ×1.000 switch |
| `src/shared/components/MoneyInput.tsx` (modify) | `unit?: 1 \| 1000` prop |
| `src/apps/split/components/BillLineCard.tsx` (create) | one draft line: label, amount, chips, footer |
| `src/apps/split/pages/BillTagging.tsx` (create) | the tagging screen |
| `src/apps/split/routes.tsx` (modify) | the new route |
| `src/apps/split/components/BillPhotosCard.tsx` (create) | NightDetail's photo list |
| `src/apps/split/pages/NightDetail.tsx` (modify) | entry button, card, delete flows |
| `src/settings/Settings.tsx` (modify) | orphan sweep after restore |
| `README.md`, spec, explainer, `now/bill-splitter.md` | docs (Task 9) |

---

### Task 1: `photoId` on items

**Files:**
- Modify: `src/apps/split/types.ts` (`itemSchema`)
- Test: `src/apps/split/store/useSplitStore.test.ts`, `src/settings/backup.test.ts`

**Interfaces:**
- Produces: `Item.photoId?: string`, used by Tasks 2, 3, 7 and 8.

- [ ] **Step 1: Write the failing tests.**
  - `useSplitStore.test.ts` › `describe('photoId')` › `it('updateItem keeps photoId when the patch has none')`: `addNight`, then `addItem(id, { label: 'Bò', payer: 'Huy', amount: 180000, shares: [...], photoId: 'ph1' })`, then `updateItem(id, itemId, { label: 'Bò Mỹ', payer: 'Huy', amount: 180000, shares: [...] })`. Expect `item.photoId === 'ph1'` and `item.label === 'Bò Mỹ'`.
  - `backup.test.ts` › `it('keeps photoId on items through parseBackup')`: a v2 file with one night holding an item `{ ..., photoId: 'ph1' }`. Expect `r.data.apps.split.nights[0].items[0].photoId === 'ph1'`.
- [ ] **Step 2: Run** `npx vitest run src/settings/backup.test.ts src/apps/split/store/useSplitStore.test.ts`. Expected: the backup test FAILS (zod strips the unknown key). The store test fails to type-check, or fails on `photoId`.
- [ ] **Step 3: Add** `photoId: z.string().optional()` to `itemSchema`, with the one-line comment from the spec's Data section.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npx tsc --noEmit` is clean.
- [ ] **Step 5: Commit** `feat(split): optional photoId on items`.

### Task 2: Draft-line rules (`billDraft.ts`)

**Files:**
- Create: `src/apps/split/lib/billDraft.ts`, `src/apps/split/lib/billDraft.test.ts`

**Interfaces:**
- Consumes: `equalShares`, `computeNightLines` from `calc.ts`; `Item`, `Share` from `types.ts`.
- Produces (exported):
  ```ts
  interface DraftLine { key: string; label: string; amount: number; people: string[]; shares?: Share[] }
  type LineStatus = 'empty' | 'incomplete' | 'ready'
  type Reconcile = { kind: 'none' } | { kind: 'left'; amount: number } | { kind: 'over'; amount: number } | { kind: 'exact' }
  newLine(key: string, preset?: { label?: string; people?: string[] }): DraftLine
  lineStatus(line: DraftLine): LineStatus
  lineShares(line: DraftLine): Share[]
  setLineAmount(line: DraftLine, amount: number): DraftLine            // clears shares when the amount changes
  toggleLinePerson(line: DraftLine, name: string, order: string[]): DraftLine // keeps `people` in `order`; clears shares
  toggleEveryone(line: DraftLine, order: string[]): DraftLine // #28: all picked → nobody; else everyone in `order`; clears shares
  addBillPerson(billPeople: string[], raw: string): { people: string[]; name: string | null } // trims; case-insensitive reuse; '' → null
  assignedTotal(lines: DraftLine[], alreadyAdded: number): number
  reconcile(assigned: number, total: number | undefined): Reconcile // total undefined or 0 → 'none'
  draftToItems(lines: DraftLine[], payer: string, photoId: string): Omit<Item, 'id'>[]
  initialPayer(o: { saved?: string; existingPayers: string[]; me: string | null; participants: string[] }): string // '' when none
  ```

- [ ] **Step 1: Write the failing tests** in `billDraft.test.ts`:
  - `lineStatus`: `newLine('a')` → `'empty'`; label only → `'incomplete'`; amount 30000 with nobody → `'incomplete'`; amount 30000 and `['Lan']` → `'ready'`; a label of only spaces with amount 0 and nobody → `'empty'`.
  - `lineShares uneven division`: amount 100000, people `['Minh','Lan','Huy']` → amounts that sum to 100000, equal to `equalShares(100000, people)`.
  - `lineShares uses adjusted shares`: with `shares: [{Minh,90000},{Huy,30000}]` it returns them unchanged.
  - `toggle clears adjusted shares`: start from the adjusted Bia Tiger line (120000, `['Minh','Huy']`, shares 90k/30k). `toggleLinePerson(l, 'Huy', ['Minh','Lan','Huy'])` → `people: ['Minh']`, `shares: undefined`, `lineShares` = `[{Minh,120000}]`. Toggling Minh off as well → `lineStatus` = `'incomplete'`.
  - `toggle keeps bill order`: toggling Huy then Minh on, with order `['Minh','Lan','Huy']` → `people: ['Minh','Huy']`.
  - `toggleEveryone`: on `['Lan']` with order `['Minh','Lan','Huy']` → `['Minh','Lan','Huy']`. Again → `[]`. On the adjusted Bia Tiger line → everyone, `shares: undefined`.
  - `setLineAmount clears shares only on change`: the same amount keeps `shares`; a new amount clears them.
  - `addBillPerson`: `(['Minh','Lan'], '  lan ')` → `{ people: ['Minh','Lan'], name: 'Lan' }`; `(['Minh'], 'Thảo')` → `{ people: ['Minh','Thảo'], name: 'Thảo' }`; `(['Minh'], '   ')` → `name: null`.
  - `assignedTotal and reconcile`: ready lines 330000+180000+30000+120000 with `alreadyAdded` 0 → 660000. `reconcile(660000, 765000)` → `{kind:'left', amount:105000}`; `reconcile(780000, 765000)` → `{kind:'over', amount:15000}`; `reconcile(765000, 765000)` → `{kind:'exact'}`; `reconcile(660000, undefined)` → `{kind:'none'}`. Incomplete lines don't count toward the assigned total.
  - `draftToItems`: drops empty and incomplete lines, keeps order, turns label `''` into `'Item'`, and sets `payer` and `photoId` on each item.
  - `initialPayer`: the saved payer in participants wins; else the first existing payer that is a participant; else `me` if a participant; else `''`. **`initialPayer ignores a saved payer who left`**: saved `'Tú'`, participants `['Minh','Lan','Huy']`, existing payers `['Huy']` → `'Huy'`.
  - `hotpot example`: the spec's six lines (Bia Tiger adjusted to 90k/30k), `draftToItems(lines, 'Huy', 'ph1')` placed in a night with participants Minh, Lan, Huy. `computeNightLines` gives exactly Minh → Huy 320000 and Lan → Huy 185000.
  - `sample 1 (SoBanHang)` and `sample 2 (handwritten)`: the two real bills from spec › Example › Two real bills, with the same people, payers and adjusted lines. The amounts add up to 260000 and 27143000, and `computeNightLines` gives exactly the balances listed there. In sample 2, Cua's shares are 3488334/3488333/3488333, and every item's shares add up to its amount.
- [ ] **Step 2: Run** `npx vitest run src/apps/split/lib/billDraft.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `billDraft.ts` with the signatures above. All functions are pure and return new objects.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then run the full suite: 425 + the new tests passing.
- [ ] **Step 5: Commit** `feat(split): draft-line rules for tagging a bill photo`.

### Task 3: Store batch actions

**Files:**
- Modify: `src/apps/split/store/useSplitStore.ts`
- Test: `src/apps/split/store/useSplitStore.test.ts`

**Interfaces:**
- Produces: `addItemsFromPhoto(nightId: string, items: Omit<Item,'id'>[], newNames: string[]): void` and `deleteItemsByPhoto(nightId: string, photoId: string): number`.

- [ ] **Step 1: Write the failing tests** (`describe('bill photo actions')`):
  - `adds every line`: `addItemsFromPhoto(id, [two items with photoId 'ph1'], [])` → the night has those 2 items, in order, with distinct ids and `photoId` kept.
  - `dedupes case-insensitively`: participants `['Minh','Lan']`, `newNames ['lan','Thảo']` → participants `['Minh','Lan','Thảo']`, and `knownNames` contains `'Thảo'`.
  - `deleteItemsByPhoto`: a night with items from `ph1` (2), `ph2` (1) and a hand-typed one (no photoId) → returns 2, leaving the `ph2` item and the hand-typed item. A second call returns 0.
- [ ] **Step 2: Run** `npx vitest run src/apps/split/store/useSplitStore.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both actions next to the item actions, with doc comments from the spec. `addItemsFromPhoto` does one `set()` for items and participants, then calls `addKnownName` per new name and `promoteFrequentNames`. `deleteItemsByPhoto` computes the count from `get()` before its `set()`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(split): add and remove a bill photo's lines in one go`.

### Task 4: Photo storage (image, IndexedDB, hook)

**Files:**
- Create: `src/shared/lib/image.ts`, `src/shared/lib/image.test.ts`, `src/apps/split/lib/photoStore.ts`, `src/apps/split/store/useBillPhotos.ts`

**Interfaces:**
- Produces:
  ```ts
  // image.ts
  fitWithin(width: number, height: number, max: number): { width: number; height: number }
  downscaleToJpeg(file: Blob, max?: number /*1600*/, quality?: number /*0.8*/): Promise<{ blob: Blob; width: number; height: number }>
  // photoStore.ts
  interface BillPhoto { id; nightId; blob: Blob; width; height; createdAt: string; payer?: string; total?: number; thousands?: boolean }
  savePhoto(p: Omit<BillPhoto,'id'|'createdAt'>): Promise<BillPhoto>
  getPhoto(id: string): Promise<BillPhoto | undefined>
  listPhotos(nightId: string): Promise<BillPhoto[]>            // oldest first
  updatePhoto(id: string, patch: Pick<BillPhoto,'payer'|'total'|'thousands'>): Promise<void>
  deletePhoto(id: string): Promise<void>
  deletePhotosForNight(nightId: string): Promise<void>
  sweepOrphanPhotos(nightIds: string[]): Promise<number>      // returns how many were removed
  requestPersistentStorage(): void                             // once per session, best effort (#25)
  // useBillPhotos.ts
  useBillPhotos(nightId: string | undefined): { photos: (BillPhoto & { url: string })[]; loading: boolean; reload(): void }
  ```

- [ ] **Step 1: Write the failing test** `image.test.ts` › `fitWithin`: `(4000,3000,1600)` → `{1600,1200}`; `(3000,4000,1600)` → `{1200,1600}`; `(800,600,1600)` → `{800,600}` (never upscaled); `(2000,2000,1600)` → `{1600,1600}`. Results are rounded to integers.
- [ ] **Step 2: Run** `npx vitest run src/shared/lib/image.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `image.ts`. `downscaleToJpeg` uses `createImageBitmap(file, { imageOrientation: 'from-image' })`, draws onto an `HTMLCanvasElement` sized by `fitWithin`, calls `toBlob('image/jpeg', quality)` and closes the bitmap. It rejects when decoding fails or the blob is null. It must not run at import time, so the node tests can import the file.
- [ ] **Step 4: Run** the image test. Expected: PASS.
- [ ] **Step 5: Implement** `photoStore.ts`: one cached `openDb()` promise (`indexedDB.open('nook-split', 1)`, with `onupgradeneeded` creating the store and the `nightId` index). Each function wraps one transaction in a Promise and resolves on `tx.oncomplete`. Ids come from `uid()`; `createdAt` is `new Date().toISOString()`.
- [ ] **Step 6: Implement** `useBillPhotos`: load with `listPhotos`, create object URLs, revoke them on change and unmount, and expose `reload`. With `nightId` undefined it returns an empty list.
- [ ] **Step 7: Verify** with `npx tsc --noEmit` (clean) and the full suite (all passing). Browser behaviour is checked in Task 9.
- [ ] **Step 8: Commit** `feat(split): store bill photos on the device (IndexedDB)`.

### Task 5: `PanZoom` image viewer

**Files:**
- Create: `src/shared/components/PanZoom.tsx`

**Interfaces:**
- Produces: `PanZoom({ src, alt, className }: { src: string; alt: string; className?: string })`. It fills its parent, which sets the height.

- [ ] **Step 1: Implement** the component. The image starts fitted (contain). Pointer events with `touch-action: none` and `setPointerCapture` track one pointer to pan and two to pinch. Scale is clamped to **1–4**. Pan is clamped so the image never leaves the box. Double-tap or double-click toggles **1× ↔ 2.5×**. Ctrl+wheel zooms around the cursor. Overlay buttons **+ / − / fit** (lucide `ZoomIn`, `ZoomOut`, `Maximize`) step by ×1.5. It uses only `transform: translate() scale()` on the `<img>` and doesn't change the page's own zoom.
- [ ] **Step 2: Verify** with `npx tsc --noEmit` (clean). It is checked live in Task 9 (pinch with two pointers via Playwright, and the buttons).
- [ ] **Step 3: Commit** `feat(shared): PanZoom for zooming into a photo`.

### Task 6: Tagging screen — lines and people

**Files:**
- Create: `src/apps/split/components/BillLineCard.tsx`, `src/apps/split/pages/BillTagging.tsx`
- Modify: `src/apps/split/routes.tsx`

**Interfaces:**
- Consumes: Task 2 (all of `billDraft.ts`), Task 4 (`getPhoto`), Task 5 (`PanZoom`), `useNight`, `useSplitStore` (`knownNames`), `useMe`, `Combobox`, `MoneyInput`, `Select`, `PageHeader`, `EmptyState`.
- Produces: `BillLineCard({ line, billPeople, knownNames, invalid, onChange, onAddPerson, onAdjust, onRemove })`, where `onAddPerson(raw: string)` returns the name that was picked. Also the route `/split/night/:id/photo/:photoId` → `BillTagging`.

- [ ] **Step 1: Add the route** in `routes.tsx`.
- [ ] **Step 2: Build `BillTagging`'s layout:**
  - `getPhoto(photoId)` with a loading state. A missing photo or Nomnom shows the EmptyState "This bill photo isn't on this device" with a back link to the Nomnom (or `/split`).
  - The object URL for the blob is revoked on unmount.
  - Header: ✕ (handled in Task 7) and the title "Tag the bill", with the Nomnom's title or date below.
  - The sticky photo panel is `h-[38vh]`, holds `PanZoom`, and has a chevron that collapses it to `h-14`.
  - "Paid by" is a Select of `night.participants`, defaulting to `initialPayer`. "Bill total (optional)" is a MoneyInput prefilled from `photo.total`.
  - The switch "Bill shows thousands (×1.000)" (#27) is a checkbox styled like ItemDialog's, starting from `photo.thousands ?? false`. While it's on, the bill total and every line amount get `unit={1000}`.
- [ ] **Step 3: Draft state** lives in the component: `lines: DraftLine[]`, starting as `[newLine(k)]`, and `extraPeople: string[]`. Bill people = `night.participants` + `extraPeople`.
  - Quick buttons: "+ Add line" adds `newLine(k)`; "+ Tax / service" adds `newLine(k, { label: 'Tax / service', people: billPeople })`; "+ Tip" adds `newLine(k, { label: 'Tip', people: billPeople })`.
- [ ] **Step 4: Build `BillLineCard`.**
  - Label input, MoneyInput (calls `setLineAmount`), then an **Everyone** chip (calls `toggleEveryone`; it's on when every bill person is picked), then chips for `billPeople` (calls `toggleLinePerson`; a picked chip uses the primary colours, as in the mockup).
  - "+ add name" opens an inline `Combobox` whose suggestions are `knownNames` not on the bill (case-insensitive). On select, it calls `onAddPerson`, then toggles the returned name on.
  - Footer: "{amount} each" when everyone's share is equal, "{name} only" for one person, and the adjusted breakdown with an "uneven" pill. When a change cleared the adjusted shares, it shows "back to equal split" for that render.
  - "Uneven? Adjust ›" appears when there are at least 2 people and an amount. A × removes the line. `invalid` gives a destructive outline.
- [ ] **Step 5: `MoneyInput` `unit`.** First write the failing test in `format.test.ts`:
  - `scaleMoney.parse('250', 1000)` → 250000;
  - `scaleMoney.display(3488334, 1000)` → `'3.488'` (rounded down);
  - `scaleMoney.display(250000, 1)` → `'250.000'`.
  Then add `scaleMoney = { parse(text: string, unit: number): number; display(value: number, unit: number): string }` to `format.ts`. It is built on `parseMoney` and `formatNumber`; `display` returns `''` for 0. `MoneyInput` uses it and shows the suffix `.000 ₫` instead of `₫` when `unit` is 1000. Existing callers don't change.
- [ ] **Step 6: Check bar** from `assignedTotal` and `reconcile`, using the exact copy from Global Constraints and a progress bar (`min(assigned/total, 1)`).
- [ ] **Step 7: Verify** with `npx tsc --noEmit` (clean) and the full suite (all passing).
- [ ] **Step 8: Commit** `feat(split): tagging screen with bill lines and people chips`.

### Task 7: Tagging screen — Adjust, Done, leaving, resume, read-only

**Files:**
- Modify: `src/apps/split/components/ItemDialog.tsx`, `src/apps/split/pages/BillTagging.tsx`

**Interfaces:**
- Consumes: Task 3 (`addItemsFromPhoto`), Task 4 (`updatePhoto`), Task 2 (`draftToItems`, `lineStatus`).
- Produces: `ItemDialog` prop `payerLocked?: boolean`. When true, the payer Select is disabled and shows `initial.payer`. Existing callers don't change.

- [ ] **Step 1: ItemDialog `payerLocked`.** Add the prop and disable the Select. With `payerLocked`, the effect that resets on open keeps `initial.payer` even if no participant row exists yet.
- [ ] **Step 2: Adjust.** It opens `ItemDialog` with `participants = billPeople`, `payerLocked`, and `initial = { id: line.key, label, payer, amount, shares: lineShares(line) }`. On submit, the line takes the label, amount, `people` (included share names in bill order) and `shares`. Adjust is disabled until a payer is chosen, with the hint "Pick who paid first".
- [ ] **Step 3: Done.**
  - Lines with status `incomplete` → a toast "Fill in or remove N line(s)", and those cards get `invalid`.
  - Otherwise: set `committing` (ignore further taps — Review Focus 5), then `addItemsFromPhoto(night.id, draftToItems(lines, payer, photo.id), newNames)`, where `newNames` is the names in `extraPeople` picked on at least one ready line (a name added and then left unused doesn't join the Nomnom), `await updatePhoto(photo.id, { payer, total: total || undefined, thousands })`, a toast "N lines added", and `navigate(-1)` back to the Nomnom.
  - Done is disabled when there's no payer or no ready line.
- [ ] **Step 4: Leaving.** ✕ with at least one non-empty line opens a `ConfirmDialog` ("Discard N lines?" · "The photo stays on the Nomnom. Tap it to tag again.", destructive "Discard"). Otherwise ✕ navigates back at once.
- [ ] **Step 5: Resume (#17).** Items in the Nomnom whose `photoId` matches are listed under "Already added · edit them in the Nomnom" as compact rows (label, amount, people) and passed as `alreadyAdded` to `assignedTotal`. Their payers feed `initialPayer`.
- [ ] **Step 6: Read-only (#22).** When `night.status === 'settled'`, the title is "Bill photo", there's no Done, no payer or total inputs, no draft lines and no add buttons: only the photo and the added lines.
- [ ] **Step 7: Verify** with `npx tsc --noEmit` and the full suite.
- [ ] **Step 8: Commit** `feat(split): finish, resume and leave a bill tagging session`.

### Task 8: NightDetail — entry, Bill photos card, delete flows

**Files:**
- Create: `src/apps/split/components/BillPhotosCard.tsx`
- Modify: `src/apps/split/pages/NightDetail.tsx`

**Interfaces:**
- Consumes: Task 4 (`downscaleToJpeg`, `savePhoto`, `deletePhoto`, `deletePhotosForNight`, `requestPersistentStorage`, `useBillPhotos`), Task 3 (`deleteItemsByPhoto`).
- Produces: `BillPhotosCard({ photos, items, readOnly, onOpen(photoId), onDelete(photoId) })`.

- [ ] **Step 1: "From photo" button.**
  - It goes before "Add" in the Items card header (lucide `Camera`, `size="sm" variant="secondary"`), only on an active Nomnom, disabled when there are no participants, and shows "Saving…" while busy.
  - It clicks a hidden `<input type="file" accept="image/*">` (no `capture`, #14) and resets the input's value after each pick.
  - On a pick: `downscaleToJpeg` fails → "Couldn't read that image"; `savePhoto({ nightId, blob, width, height })` fails → "Couldn't save the photo". On success it calls `requestPersistentStorage()` and navigates to the photo route.
- [ ] **Step 2: `BillPhotosCard`.**
  - It renders above Items when there's at least one photo. Each row has a 48×64 `object-cover` thumbnail and a summary built from the items with this `photoId`: "{payer} paid {sum}" or "Not tagged yet", and "N line(s)".
  - The row is a button to `onOpen`. When not `readOnly`, a trash button calls `onDelete`.
- [ ] **Step 3: Delete photo.** A `ConfirmDialog` with the spec copy (count and sum from the items). On confirm: `deleteItemsByPhoto`, `await deletePhoto`, `reload()`, and a toast "Bill photo deleted".
- [ ] **Step 4: Delete Nomnom.** Change the description to the spec copy. After `deleteNight(id)`, call `deletePhotosForNight(id).catch(console.error)` before navigating.
- [ ] **Step 5: Verify** with `npx tsc --noEmit` and the full suite.
- [ ] **Step 6: Commit** `feat(split): add a bill photo from a Nomnom and manage its photos`.

### Task 9: Restore sweep, docs, browser check

**Files:**
- Modify: `src/settings/Settings.tsx`, `README.md`, `docs/features/2026-11-bill-photo/spec.md`, `D:\study\now\bill-splitter.md` (personal-hub repo)

- [ ] **Step 1: Restore sweep (#24).** In `Settings.tsx`, right after `applyBackup(result.data)`, call `sweepOrphanPhotos(result.data.apps.split.nights.map(n => n.id)).catch(console.error)`.
- [ ] **Step 2: Browser check** at 390×844 (`npm run dev`, Playwright; the recipe is in memory `explainer-artifact-sync`). Use your two sample images: the SoBanHang screenshot and the handwritten Hóa đơn bán lẻ. They are kept outside the repo and never committed. Tag sample 2 with the ×1.000 switch on and the Everyone chip, and check that its balances match spec › Example. Then and run every scenario in the spec's Testing list, plus:
  - two quick taps on Done → 6 items, not 12;
  - pinch zoom and the + / − / fit buttons;
  - an unreadable file (rename a `.txt` to `.jpg`) → the toast.
  Record the results.
- [ ] **Step 3: Docs.**
  - `README.md`: one line on bill photos under Split's features, noting photos stay on the device and aren't in backups.
  - The spec: a **Verified (date)** section like the Excel spec's, listing the test count, the browser runs and anything not verified (for example a real phone camera).
- [ ] **Step 4: Run** the full suite and `npm run build`. Both must be clean. Then commit in bill-splitter: `feat(split): sweep orphan photos after restore; bill photo docs`.
- [ ] **Step 5: Explainer.** Turn section 7 of "Nook Split, Explained" from MOCKUP to REAL screenshots. Replace the custom capture sheet with the system picker (#14). Update the Synced line. Read the live page first and republish to the same URL.
- [ ] **Step 6: Push and PR.** Push `feature/bill-photo` and open the PR with the pr skill. Then update `now/bill-splitter.md` in personal-hub and commit it there.
