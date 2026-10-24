# PIU chart filter: mobile list, search and filter UI

Research date: **2026-10-13**. Every URL was read on that date. Library versions, release dates and licences come from the npm registry on that date. "Measured" means I ran it myself. The scripts are in the session scratchpad, not in the repo.

Context used for every recommendation:
- **Stack on `origin/main`:** React **18.3.1**, react-router-dom 6.30.4 (`<HashRouter>`), Zustand 5.0.14, Tailwind 3.4, Vite 6, vite-plugin-pwa 0.21. Installed Radix packages: dialog, label, select, slot.
- **Shared UI to reuse:**
  - `PageHeader`: sticky, top.
  - `BottomBar`: fixed, portalled, safe-area aware.
  - `DialogContent`: already a bottom sheet on phones (`inset-x-0 bottom-0`, `max-h-[92vh]`, `overflow-y-auto`).
  - `Button`: `default` is `h-11` (44 px), `sm` is `h-9` (36 px).
- **Routing:** `App.tsx` keys each route on `location.pathname`. A list page therefore **unmounts** when you navigate to a detail route.
- **Use:** one hand, standing at a cabinet, dim and loud room, 1–2 minutes between songs.
- **Data:** about 5,400 charts across about 670 songs.

---

## 1. Recommendation

1. **One row per chart, sorted by level, under sticky level headers ("Lv 19 · 51").** A filtered set rarely has more than one chart per song at a given mode and level, so grouping by song adds a header per row and saves little. Lists also beat cards when people are hunting for a specific item ([NN/g 2016](https://www.nngroup.com/articles/cards-component/)). The level headers mirror the in-game level folders.
2. **Rows of 64 px with two lines and no images; the whole row is the target.** The left edge carries a level badge, e.g. **S19**, with the mode shown by letter plus colour. Line 1 is the title; line 2 is artist · song type (when it is not Arcade) · version. The right edge carries up to 2 skill tags. Users read the left of each entry first ([NN/g list entries 2016](https://www.nngroup.com/articles/list-entries/)). About 9–10 rows fit on a 390×844 screen, against about 5 PIU Scores cards (§8).
3. **Search sits in the bottom dock, filters as you type, and has no submit step.** About half of observed phone use is one-handed ([Hoober 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)). Apple now says "Place search at the bottom if there's room" ([HIG Search fields, 2025-06-09](https://developer.apple.com/design/human-interface-guidelines/search-fields)). **Risk:** on both iOS and Chrome Android the keyboard covers fixed bottom bars, so this needs a `visualViewport` fix (§3.1).
4. **Plain normalised substring matching. No search library.** Normalise with NFKD, strip marks, lower-case; split into tokens; AND the tokens; rank title-prefix > word-start > contains > artist. It cost **about 0.1 ms per keystroke** on 5,372 charts (measured, §6). NFKD also matches half-typed Hangul: 9 of 10 IME states match, against 4 of 10 without it (measured, §3.3).
5. **Feed the query through `useDeferredValue` (available in React 18) into a `memo`'d list. Do not debounce.** Deferred renders are interruptible and need no fixed delay ([react.dev](https://react.dev/reference/react/useDeferredValue)).
6. **Two filter tiers.**
   - Bottom dock: a scrolling chip row with **S / D / HD**, a **Lv 18–20** chip, any selected skills, and **Clear**.
   - **Filters (n)** button: opens every facet in the existing Radix `Dialog` bottom sheet.

   Promoting key filters above the list helps users, yet 61% of sites don't ([Baymard 2023](https://baymard.com/blog/promoting-product-filters)). M3 shows filter chips next to the search field ([M3 Chips](https://m3.material.io/components/chips/guidelines)).
7. **Apply live, and show the live count on one primary button: "Show 37 charts".** Every way of closing the sheet keeps the changes. A **Reset** button sits in the sheet. Filtering takes under 1 ms, and NN/g says interactive filtering is fine when results arrive in under about 1 s ([NN/g 2016](https://www.nngroup.com/articles/applying-filters/)). The count on the button covers Baymard's "Show X Results" advice. It also avoids Apple's Cancel/Done pair, which needs a confirm-discard step.
8. **Pick levels from a 7×4 grid of buttons (1–28, each at least 44 px). Tap one level, then a second to select the range between them.** Not a two-thumb slider:
   - On a phone, slider steps are about **12 px (about 2 mm)** apart (§4.4).
   - Sliders suit approximate values only ([NN/g 2015](https://www.nngroup.com/articles/gui-slider-controls/)).
   - Over 50% of test users misread dual-handle sliders ([Baymard 2015](https://baymard.com/blog/slider-interfaces)).
9. **Combine with OR inside a facet and AND across facets. Skills get an "any / all" switch, defaulting to any.** Write the logic into labels ("Skills · any of") and into the summary ("S or D · Lv 18–20 · twist or bracket"). Users expect OR within a facet ([Baymard 2024](https://baymard.com/blog/allow-applying-of-multiple-filter-values)). piucenter uses AND for skills, which drops twists from 1,432 to 45 charts once bracket is added (§8).
10. **Accessibility:**
    - Chips are `<button aria-pressed>` with a visible checkmark, inside `role="group"` with `aria-labelledby`.
    - The result count lives in a persistent `role="status"`.
    - The sheet focuses its title, not an input.
    - Back closes the sheet.
    - Slide animations respect `prefers-reduced-motion`.

    Sources: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [Baymard back button 2020](https://baymard.com/blog/back-button-expectations).
11. **During a session the URL is the source of truth. Zustand `persist` stores the last-used filters and named presets.** The URL looks like `#/piu?m=S,D&lv=18-20&sk=twist`. Each chip toggle calls `setSearchParams(…, {replace:true})`. The app restores the last filters when it opens with no params. URLs are back-safe and shareable, and presets survive restarts ([RR useSearchParams](https://reactrouter.com/6.30.1/hooks/use-search-params), [Zustand persist](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md)).
12. **Virtualise with `@tanstack/react-virtual` `useWindowVirtualizer`.**
    - Fixed row and header heights, so no measuring.
    - Sticky headers through `rangeExtractor`.
    - Chart details open in a **sheet over the list**, so the list never unmounts and keeps its scroll position.

    Rendering all 5,400 rows cost **265 ms** on a desktop CPU; a 60-row window cost **3 ms** (measured, §6). The library is 8.3 KB gzipped and MIT-licensed.

**New dependencies: only `@tanstack/react-virtual`.** Chips, the level grid and the sheet use plain buttons and the existing `Dialog`. I don't recommend these packages:

| Package | Why not |
|---|---|
| `vaul` | Unmaintained. |
| Radix ToggleGroup | Renders `role="toolbar"` with roving focus (§5.3). |
| Radix Slider | The two-thumb slider is rejected (§4.4). |

---

## 2. List presentation (Q1)

### 2.1 What the sources say

| Claim | Source |
|---|---|
| Card layouts are less scannable than lists, and "not appropriate when users search for a specific item". | [NN/g, "Cards: UI-Component Definition", Laubheimer, 2016-11-06](https://www.nngroup.com/articles/cards-component/) |
| For similar items, use a plain vertical list, or an image grid only when the category is narrow. | same |
| Front-load each entry, since attention sits top-left. Keep the same attribute in the same place. Use no more than 2–3 kinds of indicator. Too little detail causes pogo-sticking to the detail page. | [NN/g, "The Anatomy of a List Entry", Flaherty, 2016-04-10](https://www.nngroup.com/articles/list-entries/) |
| An icon plus colour works best as a differentiator. Text alone works worst. Colour alone fails colour-blind users. | [NN/g, "Visual Indicators to Differentiate Items in a List", Harley, 2016-08-07](https://www.nngroup.com/articles/visual-indicators-differentiators/) |
| "Prefer text in lists". "Keep item text succinct". Grouped styles use headers to separate groups. | [Apple HIG, Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) (last change 2023-06-21) |
| M3 list item heights: one-line **56 dp**, two-line **72 dp**, three-line **88 dp**. Targets are at least 48×48 dp. | [M3 Lists specs](https://m3.material.io/components/lists/specs); token values from [androidx `ListTokens.kt` (tokens v29.0.0)](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ListTokens.kt) |
| Horizontal scrolling of wide tables on mobile is only "somewhat acceptable", and the UI must signal it. | [NN/g, "Mobile Tables", 2017-09](https://www.nngroup.com/articles/mobile-tables/) |

### 2.2 Options for "song with many charts"

| Layout | Rows for 5,400 charts | Scan by level | Fits "pick a chart" | Cost |
|---|---|---|---|---|
| **A. Flat chart rows, level headers** (recommended) | 5,400 rows + 28 headers | Excellent: sorted, sticky "Lv 19" | Direct: the row *is* the chart | Repeats the title when a song has several matching charts |
| B. Song row with matching chart chips (e.g. `[S18][S19][D20]`) | ~670 rows | Weak: a song spans levels | One extra target per chart. Each chip must be at least 24 px (AA) and ideally 44 px | Rows vary in height (chips wrap). A 20-chart song is about 3 chip lines |
| C. Cards (PIU Scores style) | 5,400 cards of 114–136 px | Slow: about 5 per screen | Direct | Less scannable (NN/g) |
| D. Multi-column table (piucenter style) | 4,414 rows, 6 columns | OK on desktop | Direct | Page is 648 px wide inside a 390 px viewport; needs horizontal scrolling (§8) |

**Trade-off.** A wins once any chart-level filter is active (mode, level or skill). With one mode and a 3-level range, a song contributes at most about 3 charts. This holds structurally, because a song rarely has two charts with the same mode and level, so A barely repeats titles. B wins for browsing by song, e.g. a search with no chart filters. I could not confirm the typical ratio on real data here. My synthetic set gave 271 charts across 229 songs. See open question 1.

**Density at 390×844:**
- Header about 56 px; bottom dock about 150 px including the safe area. That leaves about 630 px of list.
- 64 px rows: **about 9–10 rows** per screen.
- M3 two-line rows (72 px): about 8.
- PIU Scores cards: about 5.

### 2.3 Row content (A)

| Slot | Content | Why |
|---|---|---|
| Leading 40×40 | `S19` / `D22` / `HD20`. The mode letter plus a mode colour, never colour alone | Front-load the main differentiator; don't rely on colour alone (NN/g) |
| Line 1 | Title, truncated at the end. A Korean title as a muted suffix when it exists | Succinct text (HIG) |
| Line 2 (muted) | Artist · `Short Cut`/`Remix`/`Full Song` (omit Arcade) · version short form | Deviations only, to keep it to 2–3 indicator kinds |
| Trailing | Up to 2 skill tags, plus an icon for HIDDEN or a title chart | Indicators ≤ 3 kinds (NN/g) |

---

## 3. Search (Q2)

### 3.1 Placement

| Option | For | Against | Sources |
|---|---|---|---|
| Top, sticky in `PageHeader` | Material default. Works reliably with the keyboard: results sit between the field and the keyboard | Needs a stretch to reach one-handed | [M3 Search](https://m3.material.io/components/search/guidelines): "Search bars should usually be placed at the top of the content" |
| **Bottom dock, in `BottomBar`** (recommended) | Thumb zone. Matches iOS (2025+). The field sits right above the keyboard | Keyboard covers fixed bottom bars on iOS Safari **and** Chrome ≥108 by default; needs a `visualViewport` offset | [HIG Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields): "Place search at the bottom if there's room" (changelog 2025-06-09, 2026-06-08) |
| Inline at the top of the list (scrolls away) | Zero chrome | Gone once you scroll | HIG: "consider pinning it to the top toolbar when scrolling" |

Thumb-reach evidence ([Hoober, UXmatters, 2013-02](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)):
- Of 780 people touching their screens: 49% one-handed, 36% cradled, 15% two-handed.
- One-handed use was 67% right thumb.
- The upper-left corner is hard to reach.
- Caveat: in 2017 the author asked readers to treat his reach drawings as a simplification.

Keyboard facts:
- From Chrome 108, Android resizes only the visual viewport, "matching Safari on iOS". Fixed bottom elements can end up under the keyboard ([Chrome blog, 2022-10](https://developer.chrome.com/blog/viewport-resize-behavior)).
- `interactive-widget=resizes-content` restores the old behaviour, but in Chrome only.
- The portable fix is `window.visualViewport` `resize`/`scroll` listeners that translate the bar. This is Baseline widely available since 2021-08, and MDN has a bottom-bar example that warns about flicker ([MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)).

### 3.2 As you type vs submit; debounce vs React

- Apple: "If possible, start search immediately when a person types" (HIG Search fields).
- M3: results "can show as someone is typing or after a search is executed".
- Keep the query in the field. Users try 3–5 query variants before giving up ([Baymard, 2021-02-23](https://baymard.com/blog/persist-search-queries)).

| Technique | Behaviour | Fit here |
|---|---|---|
| Debounce, e.g. 150 ms | Delays the work; the render still blocks when it runs | Not needed: filtering takes about 0.1 ms |
| **`useDeferredValue(query)`** + `memo` list | Input updates first; the list re-renders in the background and the render is "interruptible by default" | **Use this.** Cheap insurance for slow phones. "Unlike debouncing or throttling, it doesn't require choosing any fixed delay" ([react.dev](https://react.dev/reference/react/useDeferredValue)). Requires the list to be wrapped in `memo` |
| `useTransition` / `startTransition` | Same scheduling, plus an `isPending` flag | Use it for filter-chip taps if the list ever feels slow |

Both hooks shipped in React 18.0 ([React v18.0 post, 2022-03-29](https://react.dev/blog/2022/03/29/react-v18)). To show stale results, dim the list while `query !== deferredQuery` (react.dev pattern).

Input attributes:
- `type="search"`.
- `enterkeyhint="search"`, Baseline since 2021-11 ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint)).
- `autocapitalize="none"`, `autocorrect="off"`, `spellcheck={false}`.

### 3.3 Case, diacritics, Korean

| Step | Why | Verified |
|---|---|---|
| `s.normalize('NFKD')` | Splits accents from letters. Folds full-width and compatibility forms. Maps compatibility jamo such as `ㄱ` to conjoining jamo | MDN describes the NFD/NFKD forms ([MDN normalize](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)) |
| `.replace(/\p{M}/gu, '')` | Strips combining marks: `Café → cafe`, `Ñandú → nandu` | Measured in Node 20: Hangul conjoining jamo are not `\p{M}`, so Korean text survives |
| `.toLowerCase()` | Case-insensitive | — |
| Keep **both** sides decomposed; don't re-compose | A half-typed syllable (`하`, `한ㄱ`) is a code-point prefix of the full one | Measured against `사랑 한글`. Of the IME states `ㅅ 사 살 사라 사랑 하 한 한ㄱ 한그 한글`, NFKD matches **9/10** and NFC matches **4/10**. The miss, `살`, is a transient state in which the final consonant becomes the next syllable's initial |

Optional:
- **Choseong (initial-consonant) search**, e.g. `ㅅㄹ` → 사랑, for Korean users. [`es-hangul`](https://github.com/toss/es-hangul) 2.4.0 (MIT, 2026-07-09) provides `getChoseong`. The same result takes about 10 lines of Unicode syllable arithmetic, `(code − 0xAC00) / 588`, which I checked in Node.
- Composition events (`compositionstart`/`end`) exist if you ever need to wait for the IME ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionend_event)). With NFKD matching, you don't.

### 3.4 Prefix, substring or fuzzy

- **Recommended default:** token-AND substring with match-sorter-style ranking. Rank order: equal, starts-with, word-starts-with, contains, acronym ([match-sorter README](https://github.com/kentcdodds/match-sorter)).
- Fuzzy matching (typo tolerance) mostly helps long English titles. For a 2–4-letter query, it mainly adds noise.
- Fuse.js defaults (`threshold: 0.6`, `distance: 100`, `ignoreLocation: false`) penalise matches far from the start of the string ([Fuse `src/core/config.ts`](https://github.com/krisk/Fuse/blob/main/src/core/config.ts)).

| Library (npm, 2026-10-13) | Licence | Last release | min / gzip | Model | Diacritics | Speed signal |
|---|---|---|---|---|---|---|
| **none** (≈30 lines) | — | — | 0 | substring + ranking | NFKD (above) | **0.1 ms/keystroke** at 5,372 charts (measured) |
| [match-sorter](https://github.com/kentcdodds/match-sorter) 8.3.0 | MIT | 2026-04-15 | 6.8 / 3.3 KB¹ | ranked substring/acronym | strips by default (`keepDiacritics`) | ~2.4 ms/search scaled² |
| [@leeoniya/ufuzzy](https://github.com/leeoniya/uFuzzy) 1.0.19 | MIT | 2025-08-22 | 8.4 / 4.0 KB³ | regex fuzzy, no index | `uFuzzy.latinize()`; "optimized for the Latin/Roman alphabet"; `unicode:true` is "50%-75% slower" | ~0.17 ms/search scaled² |
| [MiniSearch](https://github.com/lucaong/minisearch) 7.2.0 | MIT | 2025-09-16 | 17.8 / 5.8 KB¹ | inverted index; token prefix and fuzzy | custom `processTerm` | ~0.6 ms/search scaled², plus index build |
| [Fuse.js](https://github.com/krisk/Fuse) 7.5.0 | Apache-2.0 | 2026-07-13 | 26.5 / 9.4 KB¹ | Bitap fuzzy | `ignoreDiacritics` (off by default) | ~13 ms/search scaled². Own docs: 10k items index in about 28 ms ([performance.md](https://github.com/krisk/Fuse/blob/main/docs/performance.md)) |
| [fuzzysort](https://github.com/farzher/fuzzysort) 4.0.2 | MIT | 2026-08-13 | 21.1 / 8.2 KB¹ | subsequence fuzzy | — | ~0.5 ms/search scaled² |

Table notes:
1. Sizes from the [bundlephobia API](https://bundlephobia.com/), a measuring tool.
2. Scaling is my arithmetic on uFuzzy's README benchmark, which the author calls "A biased appraisal". It ran in 2023-10 on a Ryzen 7 5850U with Chrome 117: 86 keystroke searches over a 162,000-phrase corpus. For example, match-sorter took 6,245 ms in total, which is 72.6 ms per search. Dividing by 30 for about 5,400 items assumes linear scaling.
3. I measured `dist/uFuzzy.iife.min.js` with gzip -9, because bundlephobia rate-limited me.

**Verdict:** start with no library. Add uFuzzy (4 KB, no index) if typo tolerance becomes a real request.

---

## 4. Filters on mobile (Q3)

### 4.1 Where filters live

| Pattern | Strength | Weakness | Sources |
|---|---|---|---|
| **Inline chip row** (promoted filters) | One tap, always visible, shows state | Fits only 2–3 chips per line; needs horizontal scrolling | [Baymard, "Consider Promoting Important Filters (61% Don't)", Scott, 2023-11-21](https://baymard.com/blog/promoting-product-filters): a horizontal scrolling row with a truncation cue. [M3 Chips](https://m3.material.io/components/chips/guidelines): "Chip sets can be scrolled horizontally". At more than two rows, scroll instead of wrapping |
| **Modal bottom sheet** (recommended for the full set) | Keeps context; reuses the existing `Dialog` | Covers the list, so live results behind it are not visible | [M3 Bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines): the initial height is capped at 50% and can be pulled to full screen. Dismiss by scrim, swipe down, or close affordance. A drag handle needs a single-pointer alternative. [HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets): medium/large detents; include a grabber if resizable; support swipe to dismiss |
| Side tray (results visible behind) | "continuous visibility of results" | Only a sliver of results shows | [NN/g, "Mobile Faceted Search with a Tray", Whitenton, 2015-07-26](https://www.nngroup.com/articles/mobile-faceted-search/) (Amazon iPhone app, eBay) |
| Full-screen filter page | Room for many facets | "pogo-sticking between filters and results" | same |

**Recommendation:**
- Promoted chips in the dock: mode, level, selected skills, Clear.
- Everything else in the bottom sheet.

**Existing-code gaps for the sheet:**
- **Footer:** make the primary button a `sticky bottom-0` footer inside `DialogContent`.
- **Close button:** enlarge the existing `DialogPrimitive.Close` to 44×44. Today it is a `h-5 w-5` icon with no padding, about 20 px. That only passes WCAG 2.5.8 through the spacing exception.

### 4.2 Live vs batch apply

| Model | Evidence for | Evidence against |
|---|---|---|
| Batch (an Apply button) | NN/g recommends batch on mobile *because* "page loads are often slow on the go" ([NN/g, "User Intent Affects Filter Design", Sherwin, 2016-02-07](https://www.nngroup.com/articles/applying-filters/)). A Baymard Knowledge Hub explainer says mobile filters "should require a deliberate apply action" ([Baymard explainer, MacDonald, 2026-04-17](https://baymard.com/blog/ecommerce-filter-ui); a marketing explainer, not a research article) | "Delaying the presentation of results makes it difficult to give users continuous feedback" (NN/g). Risks zero-result combinations. HIG then requires paired Cancel/Done and a confirmation to discard |
| Live (interactive) | NN/g: under about 1 s, interactive filtering is less disruptive, even for focused users. Baymard: live updates on sliders encourage exploration, with 250–500 ms as the upper latency ([Baymard, 2015-09-15](https://baymard.com/blog/slider-interfaces)) | Can distract when the page reflows (not an issue here: the sheet covers the list) |
| **Hybrid (recommended)** | Apply live, plus a **"Show N charts"** button whose count updates live (Baymard explainer: "Always include a prominent 'Show X Results' button") | — |

Here filtering plus counting takes about 0.2 ms (§6), so NN/g's slow-network reason for batch doesn't apply.

### 4.3 Counts, applied summary, clear

| Need | Guidance | Implementation |
|---|---|---|
| Count per option, e.g. "Single (2,752)" | Counts help users judge whether to apply a filter ([Baymard 2023](https://baymard.com/blog/promoting-product-filters)) and avoid zero results (NN/g 2016). Baymard guideline **#467**, "Indicating the Number of Matches for Filtering Options", is **Premium (paywalled)**; I read only its public summary | Count each option with all *other* facets applied: **0.13 ms** for three facets (measured) |
| Applied-filters overview | 28% of sites lack one, which slows tailoring and disorients users. On mobile, use a horizontally scrolling list with truncation cues ([Baymard, Reeves, 2020-10-06, updated 2026-05-13](https://baymard.com/blog/how-to-design-applied-filters)). Guideline **#2572** (mobile) is Premium | The dock chip row *is* the overview. Selected chips come first, each with ✕, and there is a trailing **Clear** |
| One-tap clear | Same article: removal should be quick | **Clear** in the dock; **Reset** in the sheet |
| Long value lists | Truncate after about 10 and offer "Show all" ([Baymard, Macy's, 2015-07-01](https://baymard.com/blog/macys-filtering-experience)) | Skills: 5 main skills, then a "More skills" disclosure (drill, jack, …) |
| Order | "Relevance to users is the ultimate prioritization criterion"; numeric values run low to high ([NN/g, Moran, 2018-07-15](https://www.nngroup.com/articles/filter-categories-values/)) | Facet order: Mode → Level → Skills → Song type → Version → Flags |

### 4.4 Level range control (touch accuracy)

Physical scale: an iPhone 15 screen is 1179 px across at 460 ppi ([Apple specs](https://support.apple.com/en-us/111831)). That is 65.1 mm, or 393 CSS px at DPR 3, so **about 6.0 CSS px per mm**.

| Control | Size per step at 390 px | Taps for "18–20" | Evidence |
|---|---|---|---|
| Two-thumb slider, 1–28 | About 330 px track / 27 steps ≈ **12 px ≈ 2 mm** per level. The average thumb contact patch is **2.5 cm ≈ 150 px**, about 12 levels ([NN/g, Harley, 2019-05-05](https://www.nngroup.com/articles/touch-target-size/)) | 2 drags plus correction | Use sliders only "when the specific value does not matter", and dragging is hard one-handed ([NN/g 2015](https://www.nngroup.com/articles/gui-slider-controls/)). More than 50% misread dual-point sliders, and text inputs are required as a fallback ([Baymard 2015](https://baymard.com/blog/slider-interfaces)). M3: "Avoid having too many stop indicators" ([M3 Sliders](https://m3.material.io/components/sliders/guidelines)). Install cost: Radix Slider 9.3 KB gzip |
| Stepper pair (− 18 + / − 20 +) | 44 px buttons | 2–6 | Precise, but one level per tap; no overview of counts |
| Two native `<select>`s (zetaraku style) | OS picker | 4 | Precise; slow; picker covers the screen |
| **Level grid, 7×4** (recommended) | (358 − 6×6) / 7 ≈ **46 × 44 px ≈ 7.6 × 7.3 mm** | **2** (tap 18, tap 20) | Meets Apple's 44 pt and WCAG 2.5.5 (44 px). Close to M3's 48 dp. Each cell can show a count dot |

Grid behaviour:
- Tap 1 selects that single level.
- Tap 2 selects the inclusive range between the two taps.
- Tap 3 starts a new selection.
- Show the result as text: "Lv 18–20".
- I found no research on this range-tap pattern for filters. It is a design proposal (see open question 3).

### 4.5 Multi-select semantics

- **OR within a facet, AND across facets** is the user expectation. 15% of sites get it wrong. Show the options as checkboxes so multi-select is obvious ([Baymard, Olah, 2024-01-23](https://baymard.com/blog/allow-applying-of-multiple-filter-values)). For chips, M3 says selecting a filter chip "appends a leading checkmark".
- Skills are *multi-valued tags*: one chart can have twist and bracket. So AND ("charts with all of these") is a meaningful mode, and piucenter uses it. OR is the safer default, because AND quickly hits zero (1,432 → 45 on piucenter).
- Show logic in three places:
  - the facet label ("Skills · any of");
  - an **any / all** segmented switch for Skills only;
  - the summary line ("twist **or** bracket").
- M3: don't mix single- and multi-select chip sets on one page. Every chip set here is multi-select. The level grid is a range control, not a chip set.

### 4.6 Zero results

- Dead-end no-results pages drive users away; offer ways forward ([Baymard, Sousa, 2019-02-04, updated 2025-02-18](https://baymard.com/blog/no-results-page)).
- For filters: "either preventing the selection or offering a clear recovery path" (Baymard explainer 2026).
- Proposal (design, not sourced):
  - Show `(0)` on dead options and dim them, but keep them tappable.
  - On an empty list, show one button per active filter, e.g. "Remove *bracket* → 18 charts", with the count that removal would give. This is cheap: one counting pass per filter.
  - Add a "Clear all" button.

---

## 5. Touch and accessibility (Q4)

### 5.1 Target sizes

| Standard | Minimum | ≈ mm on iPhone 15 | Source |
|---|---|---|---|
| WCAG 2.2 **2.5.8** (AA) | 24×24 CSS px, or spacing so that 24 px circles don't overlap | 4.0 mm | [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| WCAG 2.2 **2.5.5** (AAA) | 44×44 CSS px | 7.3 mm | [Understanding 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) |
| Apple (iOS) | default 44×44 pt, minimum 28×28 pt | 7.3 mm | [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| Material 3 | 48×48 dp; at least 8 dp between chips | 8.0 mm | [M3 Chips](https://m3.material.io/components/chips/guidelines) |
| NN/g | 1×1 cm | ≈ 60 px | [NN/g 2019](https://www.nngroup.com/articles/touch-target-size/) |

**Use 44 px for everything tappable.** That covers chips, rows, level cells, ✕ and the sheet close button. The app's `Button` default is already 44 px; avoid `size="sm"` (36 px) here. A visible chip can be 32–36 px tall if its padding extends the hit area to 44 px; M3 explicitly allows "the target can extend beyond the visible container".

### 5.2 Thumb reach

Put frequent actions in the bottom third: mode chips, level, Filters, search. Rare actions can sit at the top: presets, share, back. Basis: [Hoober 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php), §3.1.

### 5.3 ARIA

| Element | Markup | Source |
|---|---|---|
| Filter chip | `<button type="button" aria-pressed={on}>` plus a check icon when on. **The label must not change** with state | [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/): "it is critical the label on a toggle does not change when its state changes" |
| Facet | `<div role="group" aria-labelledby="facet-mode">` (or `<fieldset>`/`<legend>`) | [MDN group role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/group_role) |
| Radix ToggleGroup (not recommended) | `type="multiple"` renders **`role="toolbar"`** with roving tabindex, so the facet becomes one Tab stop. `type="single"` renders `radiogroup`/`radio` with `aria-checked`. Install cost: 8.2 KB gzip | Source of [`@radix-ui/react-toggle-group` 1.2.0](https://unpkg.com/@radix-ui/react-toggle-group@1.2.0/dist/index.mjs) (published 2026-10-12); [docs](https://www.radix-ui.com/primitives/docs/components/toggle-group) |
| Result count | Render a persistent `<p role="status">` once, then update its text ("212 charts"). Feed it the *deferred* count so it doesn't announce on every keystroke | [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and technique ARIA22 (example: "5 results returned"); `status` is implicitly `aria-live="polite"` and `aria-atomic="true"` ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)) |
| Sheet focus | Radix Dialog traps focus, closes on Esc, returns focus to the trigger, and requires a Title ([Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)). On open, call `preventDefault` in `onOpenAutoFocus` and focus the title (`tabIndex={-1}`). Don't focus an input, which would raise the keyboard over the sheet | [APG Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): for list-like content, focus "a static element at the start" |
| Back closes the sheet | Push one history entry on open; `popstate` closes the sheet. 37% of sites fail this ([Baymard, Holst, 2020-07-20](https://baymard.com/blog/back-button-expectations)). HIG says a sheet's own Back *button* isn't for dismissing; that's about iOS in-sheet navigation, not the system or browser Back | — |

### 5.4 Reduced motion

- `prefers-reduced-motion` has been Baseline since 2020-01 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).
- Apple: replace x/y slides with fades and track gestures directly ([HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- `index.css` already disables route slides under `reduce`. **`DialogContent` still uses `slide-in-from-bottom` unconditionally**, so add Tailwind `motion-reduce:` variants for the sheet.

### 5.5 Contrast in a dark room

| Rule | Source |
|---|---|
| Text 4.5:1 (3:1 at 18 pt or bold); check both appearances | [HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| UI-component *state* indicators (selected/pressed) need 3:1 against adjacent colours | [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| Dark themes reduce luminance and eye strain "in dark environments". Use dark grey (#121212), not pure black, and desaturated accents | [Material 2 Dark theme](https://m2.material.io/design/color/dark-theme.html) (legacy, still the most explicit guidance) |

Measured from the app's tokens (`src/index.css`):

| Theme | fg/bg | muted/bg | primary/bg | muted surface / bg |
|---|---|---|---|---|
| default dark | 17.4 | 6.3 | 5.45 | **1.24** |
| default light | 17.4 | 4.74 | **4.19** | **1.07** |
| espresso dark | 15.2 | 7.55 | 9.48 | **1.42** |

What the numbers imply:
- A **selected** chip needs a primary fill plus a checkmark, not just a `secondary` fill. The surface-vs-background ratio is about 1.1–1.4:1.
- Don't use `primary` as small text in the light theme (4.19:1).
- Default to the dark themes at the arcade, or follow `prefers-color-scheme`.

---

## 6. Performance with about 5,000 rows (Q5)

### 6.1 Measured

**Render cost.** Vanilla DOM, 3-element rows (2 text lines plus 2 chips) of at least 56 px. Chrome 152 on an i5-12400F; synchronous build plus forced style/layout; median of 9 runs. This excludes React and paint. Phone estimate: × 4, Lighthouse's default CPU multiplier for "mid-tier mobile" ([Lighthouse throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)).

| Rendering | Build | Style + layout | Total | Est. mid-tier phone |
|---|---|---|---|---|
| All 5,400 rows | 26 ms | 239 ms | **265 ms** | ~1.06 s |
| All 5,400 + `content-visibility:auto; contain-intrinsic-size:auto 56px` | 29 ms | 26 ms | **55 ms** | ~220 ms |
| 200 rows (one "page") | 1.5 ms | 8.7 ms | 10 ms | ~40 ms |
| **60 rows (virtual window)** | 0.3 ms | 2.7 ms | **3 ms** | ~12 ms |

**JavaScript cost.** Node 20, same CPU, synthetic set of 5,372 charts and 670 songs, median of 200 runs.

| Operation | Median |
|---|---|
| Facet filter (mode set + level range + skill bitmask) | 0.08 ms |
| Filter + query, per keystroke (9 keystrokes = 0.87 ms) | ~0.1 ms |
| Facet counts, 3 facets | 0.13 ms |
| Filter + group by song | 0.09 ms |
| Filter + sort (level, then title with `localeCompare`) | 0.15 ms |
| Filter + sort with `Intl.Collator` | 0.21 ms |
| Build normalised search keys for all songs | 0.20 ms |

Reading these against budgets:
- INP counts as "good" at **≤ 200 ms** ([web.dev INP](https://web.dev/articles/inp)). Rendering everything (~1 s on a phone) fails, and so does re-rendering everything on each chip tap. `content-visibility` is borderline. A virtual window passes.
- The filter logic is negligible even at × 10.
- React's guidance: memoise if a calculation takes 1 ms or more ([react.dev useMemo](https://react.dev/reference/react/useMemo)). Use `useMemo` here mainly for stable references into the `memo` list.
- Lighthouse warns at about 800 DOM nodes and errors at about 1,400, and points React users to windowing ([Chrome docs, updated 2024-06-21](https://developer.chrome.com/docs/lighthouse/performance/dom-size)). 5,400 rows of 7 nodes is about 38,000 nodes.

### 6.2 Options

| Approach | For | Against | Sources |
|---|---|---|---|
| Render all | Simplest; find-in-page works | ~1 s on a phone; every filter change pays it again | measured |
| `content-visibility: auto` | One CSS line; 7× faster in web.dev's demo (232 ms → 30 ms). Content stays in the accessibility tree and find-in-page. Baseline 2024 (newly available since 2024-09) | Still builds and reconciles 5,400 React rows; scrollbar jumps unless sized | [web.dev, 2020-08-05, updated 2025-09-23](https://web.dev/articles/content-visibility); [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) |
| Incremental "show more" or pagination | No dependency | Paging is costly on a phone (piucenter has 45 pages, PIU Scores 191). Infinite lists hurt finding and "return to" tasks | [NN/g, Neusesser, 2022-09-04](https://www.nngroup.com/articles/infinite-scrolling-tips/) |
| **Virtualise** (recommended) | Constant ~60 rows in the DOM | One dependency; scroll restoration must be handled | below |

### 6.3 Virtualisers

| Library (npm, 2026-10-13) | Size (min/gzip) | Window scroll (the app scrolls the page) | Variable heights | Sticky group headers | Restore position |
|---|---|---|---|---|---|
| **[@tanstack/react-virtual](https://tanstack.com/virtual/latest/docs/api/virtualizer) 3.14.17** (core 3.19.2), MIT, released 2026-10-12 | 28.3 / **8.3 KB**¹ | `useWindowVirtualizer`; `scrollMargin` for content above the list | `measureElement` ref plus `data-index`; docs say to estimate "the largest possible size" | `rangeExtractor` with an official [sticky example](https://github.com/TanStack/virtual/tree/main/examples/react/sticky) | `initialOffset`, `scrollOffset`, `scrollToIndex` |
| [react-virtuoso](https://github.com/petyosi/react-virtuoso) 4.18.16, MIT, 2026-09-29 | ≤ 24.8 KB gzip² | `useWindowScroll` | Automatic. A "probe" item sets the default height; `defaultItemHeight` skips the probe | **Built in:** `GroupedVirtuoso` with `groupCounts`, "sticky group headers" | `getState()` → `restoreStateFrom` ("previously measured item sizes and the scroll location") |
| [react-window](https://github.com/bvaughn/react-window) 2.3.4, MIT, 2026-10-10 | 15.8 / 5.4 KB¹ | Not in the v2 `List` API (it renders its own scroll container) | `rowHeight` function or `useDynamicRowHeight` ("not as efficient as predetermined sizes") | Not in the API | `listRef.scrollToRow` |

Table notes:
1. bundlephobia.
2. My gzip of the unminified `dist/index.mjs`. This is an upper bound; bundlephobia was rate-limited. Sources: the packages' type definitions (`index.d.ts`, `react-window.d.ts`) and READMEs.

**Pick TanStack:**
- Fixed 64 px rows and 32 px headers, so no measuring.
- Headless, which fits the Tailwind components.
- Smallest bundle that supports window scrolling.
- react-virtuoso is the fallback if variable-height song-grouped rows (option B) win; its grouped sticky headers come built in.

### 6.4 Scroll restoration on back navigation

- React Router's `<ScrollRestoration>` "only works if using a data router" ([docs](https://reactrouter.com/6.30.1/components/scroll-restoration)). The app uses `<HashRouter>`, and it remounts each route keyed on pathname.
- Baymard: 87% of sites return users to the last item clicked. Losing the place hurts most on mobile ([Baymard, Crowley, 2020-11-17](https://baymard.com/blog/return-same-place)).
- **Recommended:** open chart details as a sheet over the list, reusing `Dialog` and pushing a history entry so Back closes it. The list never unmounts.
- If details must be a route: store `virtualizer.scrollOffset` in a non-persisted store, keyed by the search string, and pass it as `initialOffset` on remount.

### 6.5 Data loading

- Vite's `json.stringify: 'auto'` emits `JSON.parse(…)` for JSON over 10 kB ([Vite config](https://vite.dev/config/shared-options.html)). V8 measured that as 1.7× faster than object literals ([V8 blog, 2019-06-25](https://v8.dev/blog/cost-of-javascript-2019)).
- **Offline gotcha:** the Workbox `globPatterns` in `vite.config.ts` don't include `json`. *Import* the data so it is bundled and precached, or add `json` to the patterns.

---

## 7. State (Q6)

| Option | Back-button safe | Shareable | Survives restart | Notes |
|---|---|---|---|---|
| **URL search params** in the hash route (`#/piu?m=S,D&lv=18-20&sk=twist&q=vook`) | ✔ | ✔ (copy or share) | ✗ | `setSearchParams(next, { replace: true })` per toggle avoids flooding history ([RR useSearchParams](https://reactrouter.com/6.30.1/hooks/use-search-params)) |
| **Zustand `persist`** (localStorage) | ✗ | ✗ | ✔ | Use `partialize` to persist only `lastFilters` and `presets`; use `version`/`migrate` for schema changes. `createJSONStorage` does "no runtime validation", so validate on read with zod, which is already a dependency ([Zustand persist docs](https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md)) |
| Zustand URL-hash storage | — | — | — | The [official recipe](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/connect-to-state-with-url-hash.md) writes `location.hash`, which **conflicts with `<HashRouter>`**. Don't use it |

**Recommendation: both.** The URL is the live state. On every change, mirror it into `lastFilters`. If the screen opens with no params, `navigate` to `lastFilters` with `replace`.

History granularity:
- Baymard's guidance is that *each* filter change should be a history entry. 27% of sites get filtering Back wrong ([Baymard 2020](https://baymard.com/blog/back-button-expectations); Macy's does this, [Baymard 2015](https://baymard.com/blog/macys-filtering-experience)).
- One-handed, ten chip taps would mean ten Backs to leave the screen.
- Proposal: `replace` for chip taps; **push** when the sheet opens, so Back closes it; push when a preset is applied. This is a deliberate deviation from Baymard (open question 5).

Sharing:
- A standalone PWA has no address bar, so sharing needs a button.
- `navigator.share` has "Limited availability". It needs HTTPS and a user gesture, so fall back to copying the link ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)).

Presets: I found no research source on these, so this is a proposal.
- Store `{ id, name, query }`, where `query` is the URL search string.
- Show presets as a chip row at the top of the sheet, e.g. "S18–20 twist", plus "Save current…".
- One tap applies a preset (push).
- Long-press, or an edit mode, renames or deletes.

---

## 8. Prior art (Q7)

How I observed these: live pages at a 390×844 viewport in Chrome 152 (Browser pane), on 2026-10-13. I only read pages; I didn't sign in.

| Site | List | Search | Filters | Apply / URL | On a phone |
|---|---|---|---|---|---|
| **piucenter.com/search** (PIU) | A table with 6 columns (Name + level such as "SONIC BOOM S7", Skills, BPM info, NPS, Sustain time, Total time under tension). 100 rows per page, 45 pages, 4,414 charts | "Name filter" text box at the top | Form at the top: singles/doubles `<select>`, sort `<select>`, level min/max number inputs (71×32 px), NPS and sustain min/max, a **"Select Skills (0 selected)"** modal with 29 checkboxes (13×13 px) and Done, and "Clear All Filters" | Live. Skills combine with **AND** (twists 1,432 → +bracket **45**). The URL holds only `?levelSort=`; a "Copy URL to filtered results" button exists | Page is 648 px wide inside a 390 px viewport, so it scrolls horizontally. **The skills modal is half off-screen**; tiny checkboxes |
| **piuscores.arroweclip.se/Charts** (PIU) | One card per chart: jacket, level badge, title, artist · step artist, 3 skill chips, pass difficulty, NPS/BPM/length. Cards are 114–136 px tall (about 5 per screen). 24 per page, 191 pages. Views: Comfortable / Compact / Table | "Song name contains" inside the filter drawer; bottom nav has Search | Filters icon (36×36) opens a full-screen drawer: name field, **two-thumb level slider 1–29** with ticks, CHART TYPE chips **with counts** (Single 2,690 · Double 1,736 · Co-Op 145; 40 px tall), and a "More filters" picker that *adds* fields (song type, channel, artists, BPM, NPS, notes, duration, skills, debut mix, version, difficulties). Close button | Live (4,571 → 2,690 on tapping Single). **URL updated** (`?Type=Single`) | Good pattern: counts and progressive "More filters". Chips are `<span role="button">` with no `aria-pressed` |
| **arcade-songs.zetaraku.dev/maimai** (maimai DX) | Grid / Detail / Summary views. Grid shows one jacket tile per chart ("sheet"). 156 pages | "Title" field with an exact/partial toggle | **14 stacked fields** (Category, Title, Difficulty, Min/Max Level with a "link" toggle, Version, Type, Artist, Notes Designer, Region, Min/Max BPM). "Filter mode / My list". **"DRAW RANDOM SHEET!"** | Count shows **charts and songs**: "7464 / 7464 sheets (1875 / 1875 songs)" | The first result is about 1,614 px down, roughly 2 screens of filters. Icon-only buttons have no accessible names |
| **3icecream.com/difficulty_list/15** (DDR, Sanbai) | One page per level. Jacket grid grouped under sub-level headers ("15.95", "15.90") | "Search..." input at the page bottom | Era `<select>`; Single/Double and level `<select>`s | — | No viewport meta, so a 980 px desktop layout is scaled down; small targets |
| ddr.stepcharts.com | — | — | — | — | **Not accessed**: navigation failed |

General-purpose patterns, as documented by the research firms:
- **NN/g's tray** (Amazon iPhone app, eBay mobile, 2015): results stay visible behind the filter panel; the result count is pinned at the top.
- **Macy's (Baymard 2015):** promoted filters, multiple values per type, applied filters in two places, and each change as a history entry.

| Copy | Avoid |
|---|---|
| Counts on options (PIU Scores) | Wide tables and horizontal page scrolling (piucenter) |
| Live apply with URL state (PIU Scores) | Filters stacked above results (zetaraku: 2 screens) |
| Chart *and* song counts (zetaraku) | Two-thumb level sliders (PIU Scores) |
| Random pick from the current results (zetaraku), which suits "what do I play next?" | Paging with small page buttons (all four) |
| Level-grouped headers (Sanbai) | AND-only skills with no indication (piucenter); unlabeled icon buttons (zetaraku) |

---

## 9. Wireframes (about 390 px, ASCII)

### Main screen

```
+--------------------------------------------+
| <  PIU charts                  [Presets]   |  PageHeader, sticky (56)
|    212 charts · 141 songs                  |  role="status"
+--------------------------------------------+
| LV 18 · 64                                 |  sticky level header (32)
| +----+ Song title A                 twist  |
| |S18 | Artist · Full Song · FIESTA    run  |  row, 64 px, whole row = target
| +----+                                     |
| +----+ Song title B               bracket  |
| |D18 | Artist · PRIME 2                    |
| +----+                                     |
| +----+ Latin title  한글 제목         half |  Korean title as muted suffix
| |S18 | Artist · XX                         |
| +----+                                     |
|   ... (virtualised, ~60 rows in DOM)       |
| LV 19 · 51                                 |
| ...                                        |
+--------------------------------------------+
| [v S][v D][ HD][Lv 18-20 v][twist x][Clear]|  chip row, scrolls sideways (44)
| +--------------------------+ +-----------+ |
| | Q  Search title, artist  | | Filters 3 | |  BottomBar (44), safe-area aware;
| +--------------------------+ +-----------+ |  lifted above keyboard by visualViewport
+--------------------------------------------+
```

### Filter sheet (existing `Dialog`, max 92vh, body scrolls, footer sticky)

```
+--------------------------------------------+
| Filters                        Reset  [ X ]|  title gets focus; X is 44x44
| [S18-20 twist] [D22 brackets] [+ Save]     |  presets (chip row)
|--------------------------------------------|
| Mode · any of                              |  role="group"
| [v Single 2,752][v Double 1,783][HD 790]   |
|                                            |
| Level · 18-20                              |  tap start, tap end
| [ 1][ 2][ 3][ 4][ 5][ 6][ 7]               |  7 x 4 grid, cells 46 x 44
| [ 8][ 9][10][11][12][13][14]               |
| [15][16][17][#18][#19][#20][21]            |  # = in range
| [22][23][24][25][26][27][28]               |
|                                            |
| Skills   ( any of | all of )               |  segmented switch
| [v twist 412][run 380][bracket 220]        |
| [half 95][gimmick 60]   More skills v      |
|                                            |
| Song type · any of                         |
| [Arcade][Short Cut][Remix][Full Song]      |
| Version · any of        (scrolls sideways) |
| [FIESTA][FIESTA EX][FIESTA 2][INFINITY]... |
| Flags  [Hide HIDDEN] [Skill-title charts]  |
|--------------------------------------------|
| [          Show 212 charts            ]    |  sticky footer, live count, closes
+--------------------------------------------+
```

### Zero results (list area)

```
| No charts match.                           |
| [Remove bracket  -> 18 charts]             |
| [Remove Lv 18-20 -> 7 charts ]             |
| [Clear all]                                |
```

---

## 10. Open questions for you

1. **Flat chart rows or song-grouped rows?** I recommend flat rows with level headers, because you pick charts and a filtered set is mostly 1 chart per song. Should a search with no chart filters switch to song-grouped rows (option B)? That needs variable heights, so react-virtuoso.
2. **Search at the bottom or the top?** The bottom is thumb-friendly but needs the `visualViewport` keyboard fix on iOS and Android. Test on your own phone; if it flickers, fall back to the top (M3 default).
3. **Level picking:** is "tap start, tap end" on a grid natural for you, or do you prefer two steppers? Do you ever want non-contiguous levels (S18 + S22)?
4. **Skills default:** any (OR) or all (AND)? piucenter uses AND.
5. **Back button:** should each chip tap be undoable with Back (Baymard), or should Back only close the sheet and leave the screen (proposed)?
6. **Promoted chips:** which facets earn the dock? I propose Mode, Level and selected skills. Should Song type ("hide Short Cut / Full Song") join them?
7. **Default sort and level headers:** level ascending (matches in-game folders), or title?
8. **Random pick:** add a "Random chart" button over the current results (zetaraku)?
9. **Hidden charts and HD mode:** hide HIDDEN charts by default? Show Half-double (Steam-link only) by default?

---

## Sources I could not fully access

- **Baymard guidelines #467** ("Indicating the Number of Matches for Filtering Options") and **#2572** ("Applied Filters on Mobile"): Premium, paywalled. I used Baymard's public articles that cite them.
- **ddr.stepcharts.com:** the page failed to load in the browser pane, so it is not described.
- **Material 3 pages** (`m3.material.io`) render client-side and return an empty body to plain fetch. I read them through the browser pane. I took the list heights from the Compose token source, because the M3 page shows them only in images.
- **Fuse.js options page** (`fusejs.io/api/options.html`): returned 404. I took the defaults from `src/core/config.ts`.
- **bundlephobia:** rate-limited me for `react-virtuoso`, `@leeoniya/ufuzzy` and `es-hangul`. For the first two I measured gzip myself; es-hangul is unmeasured.
- **Hoober 2013** is on UXmatters (practitioner research, not NN/g or Baymard). Its 2017 author note says to treat the reach drawings as a simplification.
