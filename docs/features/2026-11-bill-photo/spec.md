# Split: Add from a bill photo — Design

**Date:** 2026-11-17 · **Status:** approved (grilling rounds 1–5), ready for planning
**Branch:** `feature/bill-photo` → one PR
**Decisions log:** `decisions.md` (rounds 1–5) · **Mockups:** explainer "Nook Split, Explained", section 7, https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4#photo

## Problem

A restaurant bill has many lines. Today each line goes through ItemDialog: description, payer, amount and split, one dialog per line. With the printed bill in hand, you want to look at it and say who had what. That is quicker than retyping it item by item from memory.

## Decisions

The first 15 rows are yours, from `decisions.md`. The rest are my calls made while writing this spec. They are flagged for review.

| # | Decision | Whose |
|---|---|---|
| 1 | The subject is a **printed bill**. Capture, storage and tagging are **offline and manual**. No OCR and no cloud in v1. | yours |
| 2 | The photo is **downscaled** so its long edge is at most 1600px, saved as a **JPEG** in **IndexedDB**, one store per device, and kept **out of** the JSON backup. | yours |
| 3 | **One payer per photo**, chosen from the Nomnom's people and applied to every line. | yours |
| 4 | Each tagged line becomes one ordinary `Item` with a new optional **`photoId`**. `calc.ts` doesn't change. | yours |
| 5 | Entry is **"From photo"** in NightDetail's Items card. A Nomnom can hold several bills. | yours |
| 6 | Tagging screen: the zoomable bill **pinned on top** and a **line list** below (label, amount, people). | yours |
| 7 | **"+ add name"** on a line adds that person to the Nomnom's people and to known names. | yours |
| 8 | Tax and tip are **their own lines**, split equally by default. An optional **bill total** shows assigned-so-far. No proportional spread. | yours |
| 9 | Several people on a line means an **equal split**. **"Uneven? Adjust ›"** opens ItemDialog for that line. | yours (Q13) |
| 10 | The photo is **saved at once**. Lines are **drafts** until **Done**, then added in one go. | yours (Q14) |
| 11 | Tapping a bill photo **reopens tagging** to add the lines still missing. | yours (Q14b) |
| 12 | Produced items are **ordinary**: no marker, no group, edited in ItemDialog, and `photoId` is kept on edit. | yours (Q15) |
| 13 | Deleting a photo asks first, then **removes its lines** too. Deleting a Nomnom **purges** its photos. Settling **keeps** them. | yours |
| 14 | "From photo" opens the **system picker** (`<input type="file" accept="image/*">` without `capture`). On a phone the OS offers camera or library, and on desktop it's a file picker. There's no custom sheet, so it's one tap fewer than the mockup. | my call |
| 15 | The **payer and bill total are stored on the photo record**, so resuming a photo with no lines still knows them. | my call |
| 16 | Names added with "+ add name" join the Nomnom **when you tap Done**, in the same write as the lines, and only if they are on at least one finished line. Leaving midway changes nothing in the Nomnom (#10). | my call |
| 17 | On **resume**, lines already added from this photo show read-only at the top ("Already added · edit them in the Nomnom") and count toward the bill total. New lines are added after them. | my call |
| 18 | **Done** needs a payer and at least one complete line (amount > 0 and at least one person). A half-filled line blocks Done and is outlined. A line left completely blank is dropped. | my call |
| 19 | **Quick lines:** "+ Add line" (nobody picked), "+ Tax / service" and "+ Tip" (label filled in, everyone on the bill picked). | my call |
| 20 | On an adjusted line, changing the **amount or the people** goes back to an equal split. The footer says "back to equal split". | my call |
| 21 | The **payer defaults** to the photo's saved payer, then to the payer of its existing lines, then to "me" (Copy for Excel's choice) if that name is in the Nomnom. Otherwise it is empty and must be picked. | my call |
| 22 | On a **settled** Nomnom the photo opens **read-only**: the bill and its lines, with no Done, no edits and no delete. | my call |
| 23 | `photoId` **stays in the backup** with its item. On another device, or after the photo is deleted, it points to nothing and the item behaves like any other. | my call |
| 24 | After a **backup restore**, photos whose Nomnom no longer exists are swept from IndexedDB. | my call |
| 25 | After the first photo is saved, the app asks the browser once to keep its storage (`navigator.storage.persist()`), as a best effort. | my call |
| 26 | **No new libraries:** a hand-written IndexedDB wrapper, canvas downscaling and pointer-event pan/zoom. | my call |

## Example

Hotpot Sat: Minh, Lan and Huy. Huy paid a 765.000 ₫ bill:

| Line | Amount | Who | Shares |
|---|---|---|---|
| Lẩu Thái | 330.000 | Minh, Lan, Huy | 110.000 each |
| Bò Mỹ | 180.000 | Minh, Huy | 90.000 each |
| Trà đá x3 | 30.000 | Minh, Lan, Huy | 10.000 each |
| Bia Tiger x4 | 120.000 | Minh, Huy, adjusted | Minh 90.000 · Huy 30.000 |
| Kem dừa | 45.000 | Lan | 45.000 |
| Phí phục vụ (tax / service) | 60.000 | Minh, Lan, Huy | 20.000 each |

Done adds 6 items, each with `payer: 'Huy'` and the photo's id. The Nomnom's balances: Minh → Huy 320.000, Lan → Huy 185.000.

## Data

### Item (`src/apps/split/types.ts`)

```ts
export const itemSchema = z.object({
  id: z.string(),
  label: z.string(),
  payer: z.string(),
  amount: z.number().nonnegative(),
  shares: z.array(shareSchema),
  // Set on items made from a bill photo (see docs/features/2026-11-bill-photo). Optional, so old data stays valid.
  photoId: z.string().optional(),
})
```

There's no persist-version bump and no backup-version bump. Backups now carry `photoId`, while older backups have none.

### Photo record (IndexedDB)

The database is `nook-split`, version 1, with one object store `billPhotos` (keyPath `id`) and an index `nightId`.

```ts
export interface BillPhoto {
  id: string
  nightId: string
  blob: Blob          // image/jpeg, long edge ≤ 1600px
  width: number
  height: number
  createdAt: string   // ISO
  payer?: string      // saved on Done (#15)
  total?: number      // bill total, saved on Done when entered
}
```

## Logic

### Draft lines (`src/apps/split/lib/billDraft.ts`, pure, unit-tested)

```ts
export interface DraftLine {
  key: string               // local id for React
  label: string
  amount: number            // whole VND
  people: string[]          // in bill-people order
  shares?: Share[]          // set by Adjust; cleared when amount or people change (#20)
}
export type LineStatus = 'empty' | 'incomplete' | 'ready'

export function lineStatus(line: DraftLine): LineStatus
export function lineShares(line: DraftLine): Share[]            // shares ?? equalShares(amount, people)
export function setLineAmount(line: DraftLine, amount: number): DraftLine
export function toggleLinePerson(line: DraftLine, name: string, order: string[]): DraftLine
export function assignedTotal(lines: DraftLine[], alreadyAdded: number): number
export function reconcile(assigned: number, total: number | undefined):
  | { kind: 'none' } | { kind: 'left'; amount: number } | { kind: 'over'; amount: number } | { kind: 'exact' }
export function draftToItems(lines: DraftLine[], payer: string, photoId: string): Omit<Item, 'id'>[]
export function initialPayer(opts: { saved?: string; existingPayers: string[]; me: string | null; participants: string[] }): string
```

- `lineStatus`: a line is `empty` when its trimmed label is `''`, its amount is 0 and nobody is picked. It is `ready` when amount > 0 and at least one person is picked. Anything else is `incomplete`.
- `draftToItems` turns `ready` lines into items, in order: an empty label becomes `'Item'`, the payer is the given payer, and the shares come from `lineShares`.
- `assignedTotal` adds up the amounts of `ready` lines, plus `alreadyAdded`, the sum of this photo's existing items.

### Image (`src/shared/lib/image.ts`)

```ts
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } // pure, tested
export async function downscaleToJpeg(file: Blob, max = 1600, quality = 0.8): Promise<{ blob: Blob; width: number; height: number }>
```

Uses `createImageBitmap(file, { imageOrientation: 'from-image' })` and a canvas `toBlob('image/jpeg', quality)`. It throws when the browser can't decode the file, for example HEIC in desktop Chrome.

### Photo store (`src/apps/split/lib/photoStore.ts`)

A thin promise wrapper over IndexedDB: `savePhoto`, `getPhoto`, `listPhotos(nightId)` (oldest first), `updatePhoto(id, { payer, total })`, `deletePhoto(id)`, `deletePhotosForNight(nightId)`, `sweepOrphanPhotos(nightIds)`. It is checked in the browser, not in Vitest, because the test environment has no IndexedDB and adding a fake one would be a new library (#26).

### Store (`useSplitStore.ts`)

```ts
/** Add a bill's lines and any names added while tagging, in one write. */
addItemsFromPhoto(nightId: string, items: Omit<Item, 'id'>[], newNames: string[]): void
/** Remove every item made from this photo; returns how many were removed. */
deleteItemsByPhoto(nightId: string, photoId: string): number
```

- `addItemsFromPhoto` appends each item with a fresh `uid()`. It appends names not already in the Nomnom (case-insensitive, like ParticipantEditor), then calls `addKnownName` for each new name and `promoteFrequentNames`.
- Payments are left as they are, as `deleteItem` does today.

## UI

### NightDetail

- **Items card header:** a **"From photo"** button (camera icon, secondary, small) sits before **"Add"**. It is disabled by the same rule (no people yet) and only shown on an active Nomnom.
- Tapping it opens a hidden `<input type="file" accept="image/*">`. After a pick, the button shows "Saving…" while the photo is downscaled and saved. Then the app navigates to `/split/night/:id/photo/:photoId`. On failure it shows a toast: "Couldn't read that image" (decode) or "Couldn't save the photo" (IndexedDB).
- **"Bill photos" card**, above Items, shown when the Nomnom has at least one photo. Each row has a thumbnail, then "Huy paid 765.000 ₫" (the sum of its items) or "Not tagged yet", then "6 lines". Tapping a row opens the tagging screen. A trash button (active Nomnom only) opens the confirm dialog.
- **Delete photo:** "Delete this bill photo?" · "Its 6 lines (765.000 ₫) are removed too." or "It has no lines yet." Confirm runs `deleteItemsByPhoto` and `deletePhoto`, then a toast says "Bill photo deleted".
- **Delete Nomnom:** the description becomes "This permanently removes the Nomnom, its items and its bill photos. This can't be undone." After `deleteNight`, the app calls `deletePhotosForNight`. An error there is logged and doesn't block.
- Item rows are unchanged (#12).

### Tagging screen (`pages/BillTagging.tsx`, route `/split/night/:id/photo/:photoId`)

- **Header:** ✕ on the left, then "Tag the bill" with the Nomnom's name below it, and **Done** on the right. In read-only mode (#22) the title is "Bill photo" and there's no Done.
- **Photo panel:** sticky at the top, about 38% of the screen height. Pinch or drag on touch, ctrl+wheel on desktop, double-tap toggles 1× and 2.5×, plus + / − / fit buttons. A chevron collapses the panel to a 56px strip so there's room while typing.
- **Paid by** (a Select of the Nomnom's people, default from #21) and **Bill total (optional)** (MoneyInput, prefilled from the photo).
- **Check bar:** with a total it says "Assigned 660.000 ₫ · 105.000 ₫ left", "Over by 15.000 ₫" in the destructive colour, or "All assigned ✓" in the success colour, with a progress bar. Without a total it says "Assigned 660.000 ₫ · 4 lines".
- **Already added** (resume, #17): compact read-only rows with the label, amount and people, under the heading "Already added · edit them in the Nomnom".
- **Line cards:** a label input, a MoneyInput, then chips for everyone on the bill: the Nomnom's people plus names added here. The last chip is **"+ add name"**, which opens an inline Combobox suggesting known names not yet on the bill. A new name is added to the bill and picked on that line.
  - The footer shows "110.000 ₫ each", "Lan only", or for an adjusted line "Minh 90.000 · Huy 30.000" with an **uneven** pill. With 2 or more people and an amount, it also has **"Uneven? Adjust ›"**. Each card has × to remove the line.
- **Adjust:** opens ItemDialog with `participants` set to everyone on the bill, `initial` built from the line, and a new prop **`payerLocked`** (the Select is disabled and shows the bill's payer). On save, the line takes the dialog's label, amount, people (from included shares) and shares.
- **Add buttons:** "+ Add line", "+ Tax / service" and "+ Tip" (#19). A new photo starts with one empty line.
- **Done** (#18): if a line is incomplete, it shows "Fill in or remove 1 line" and outlines the line. Otherwise it runs `addItemsFromPhoto`, `updatePhoto({ payer, total })`, a toast "6 lines added", and navigates back to the Nomnom.
- **Leaving with drafts:** ✕ when at least one line isn't empty opens "Discard 4 lines?" · "The photo stays on the Nomnom. Tap it to tag again." The browser or hardware Back button leaves without asking. That's a known limit: HashRouter (not a data router) can't block navigation.
- **Photo not found** (deleted, or a restored backup on another device): an EmptyState says "This bill photo isn't on this device", with a back button.

### Settings → restore backup

After `applyBackup`, call `sweepOrphanPhotos` with the restored Nomnom ids (#24).

## Testing

- `billDraft.test.ts`: line status, equal and adjusted shares, the reset back to equal, assigned total and the reconcile kinds, `draftToItems` (order, empty label, only ready lines), and `initialPayer` order. Plus the hotpot example, which must give Minh → Huy 320.000 and Lan → Huy 185.000 through `computeNightLines`.
- `image.test.ts`: `fitWithin` (landscape, portrait, already small, square).
- `useSplitStore.test.ts`: `addItemsFromPhoto` (one write, new names deduplicated case-insensitively, known names updated), `deleteItemsByPhoto` (count, other items untouched), and `updateItem` keeping `photoId`.
- `backup.test.ts`: `photoId` round-trips.
- In a real browser at 390px: pick a bill image, tag 6 lines with one Adjust, Done, then check balances. Leave midway and resume. Delete the photo and confirm the lines go. Delete the Nomnom and confirm IndexedDB is empty. Settle the Nomnom and check read-only mode. Reload offline and the photo still shows.

## Risks

- **Storage eviction:** the browser may clear IndexedDB under storage pressure, though an installed PWA is rarely evicted. #25 asks for persistence, and the lines survive anyway because they live in the JSON store.
- **HEIC on desktop:** some browsers can't decode it, so the user gets a clear toast. Phones hand the picker a JPEG.
- **Names with spaces:** a bug captured in Hub on 2026-10-19 says a name with spaces causes errors, with the place still unknown. "+ add name" may hit it.

## Out of scope

OCR and "Scan (beta)" (research: `docs/features/2026-10-image-to-text/research.md`, which is still only on the local WIP commit of `feature/hub-dashboard`). Also out: pins on the image, spreading tax in proportion, photos in the backup, a payer per line, grouped items, and blocking the browser Back button.
