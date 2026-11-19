# Add from a bill photo — design decisions

The grilling log for `spec.md`. Rounds 1–4 were settled by 2026-08-17. Round 5 was answered on 2026-11-17, all as recommended, plus yes to resuming tagging.
Mockups of every round: the explainer "Nook Split, Explained", section 7 (https://claude.ai/artifact/TmrnZ3PofbjKp8Ped4ZFs4#photo).

**Goal:** in a Nomnom, take or upload a photo of a meal or hangout bill, then tag each line item to a person. It is the same splitter with a new way in that produces normal items.

## Rounds 1–4 (settled)

| # | Topic | Decision |
|---|---|---|
| 1 | Photo subject | A **printed** meal or hangout bill (typed lines and prices), not a photo of the food. |
| 2 | Scan approach | **Offline, on-device, manual first.** Keeps the app's local-only, offline, no-backend promise. OCR (Tesseract.js WASM) comes later as a "Scan (beta)" prefill, not in v1. No cloud vision. |
| 3 | Photo storage | Saved **per Nomnom in IndexedDB** as a compressed blob, and left **out of** the localStorage JSON backup. |
| 4 | Model mapping | **One payer per photo**, chosen once from the Nomnom's people and applied to every line. Each tagged line is one `Item { label, payer, amount, shares }`. `calc.ts` and the balance math don't change. |
| 5 | Capture | One "Add bill photo" action: camera or library on a phone, a file picker on desktop. Downscaled to ~1600px and JPEG-compressed before saving. |
| 6 | Tagging UI (v1) | **Photo as reference:** the zoomable bill is pinned on top, with a line list underneath to fill in (add line → amount → assign people). Interactive pins on the image come later. |
| 7 | Entry point | A dedicated "Add from photo" flow launched from NightDetail that produces a batch of items. A Nomnom can hold several bills. Items carry a new optional `photoId` field, a backward-compatible schema addition. |
| 8 | Someone not in the Nomnom | The person picker on each line has "+ add name", which adds the person to the Nomnom's people and to known names. |
| 9 | Tax, tip, total | Tax and tip are their **own lines**, split equally by default, plus an optional "bill total" field that shows a running assigned-so-far check. No proportional distribution in v1. |
| 10 | Produced items | **Ordinary items**, edited or deleted one by one in the existing ItemDialog and indistinguishable from hand-typed lines. `photoId` is kept on edit. |
| 11 | Lifecycle | Deleting a photo asks first, and confirming also removes the lines it produced. Deleting a Nomnom purges its photos from IndexedDB. Settling a Nomnom keeps its photos. |

## Round 5 (answered 2026-11-17)

| # | Question | Decision |
|---|---|---|
| Q13 | One shared line, several eaters | **Layered.** Tapping several people on a line splits it equally. "Uneven? Adjust ›" opens the existing ItemDialog to redistribute. |
| Q14 | When things are saved | The **photo is saved immediately** on capture. Lines stay **drafts until "Done"**, then are added in one go, so leaving midway never leaves a half-filled Nomnom. |
| Q14b | Resume after leaving | **Yes.** A photo left with no lines (or only some) stays on the Nomnom. Tapping it reopens tagging to finish later. |
| Q15 | After "Done" | **Ordinary items**, with no locked group (confirms #10). |

## Round 6: two real bills (2026-11-17)

Two sample bills were run through the design and through `calc.ts` (spec › Example › Two real bills): a SoBanHang app screenshot and a handwritten "Hóa đơn bán lẻ".

| # | Finding | Decision |
|---|---|---|
| R6-1 | Handwritten bills write amounts in thousands ("250" = 250.000 ₫). Sample 2 would need "000" typed 14 times. | **Yes:** a "Bill shows thousands (×1.000)" switch (spec #27). |
| R6-2 | 9 of sample 2's 13 lines are shared by everyone, which is about 45 taps. | **Yes:** an "Everyone" chip on each line (spec #28). |
| R6-3 | A tall screenshot shrinks in the photo panel when fitted whole. | **Not now:** zoom and the panel's collapse cover it. |
| R6-4 | Equal splits leave odd đồng (3.488.334). | **Not now:** that's today's `equalShares` for every item, outside this feature. |
