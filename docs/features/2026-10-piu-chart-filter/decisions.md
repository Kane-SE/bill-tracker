# Pump — decisions log

The grilling record behind [`spec.md`](spec.md): four rounds on 2026-10-13, answered in chat and on mockups. The spec is authoritative where the two differ; it also records the smaller calls made while writing it.

Questions as first drafted (with the then-recommended defaults) are in git history: `docs/features/2026-10-piu-chart-filter/plan.md` at commit `7839d62`.

**Round 1 — 2026-10-13**

| # | Decision | Note |
|---|---|---|
| ✅ D1 | **Purpose: (a) practise a skill at my level + (b) chase the official skill titles.** No random pick (D18 dropped). No personal to-play/cleared lists in v1 | b needs its own design: see round 2 |
| ✅ D2 | **PHOENIX 2 only.** No version switch | Data shape stays single-level (§4.2) |
| ✅ D5 | **"Half" = Double charts on the middle panels**, the skill behind the official [HALF] titles. Those charts existed long before P2's Half-Double mode | How the Half-Double *mode* itself is handled is folded into D4 (round 2) |
| ◐ D9 | **Gimmick follows the official sense**: the user picked (v) "slow", recognising Twist of Fate as a gimmick song. Exact definition and source: round 2 | Fact: Twist of Fate S19 was **[GIMMICK] Lv.8 in PHOENIX** and is on the **SLOW** track in P2. Its step file has **no** speed, scroll, stop, warp or fake changes, so a timing-based rule would never flag it |
| ✅ D6 | **Ship derived facts only, credit the sources, ask both maintainers before the PR merges.** Fallback: an import-on-phone data file | Claude drafts the two messages; the user sends them |
| ✅ D21 | **"Pump"**, lucide `Footprints`, "Find charts to play". Route `#/pump`, folder `src/apps/pump/` | |
| ✅ D24 | **Fix the shared Dialog in this branch** (44 px close, reduced motion, sticky footer slot) | |
| ✅ D25 | **Branch `feature/piu-charts` from `origin/main`**; commit the docs and push the branch now; PR after the build | Done: `d59c88c` |

**Round 2 — 2026-10-13**

| # | Decision | Note |
|---|---|---|
| ✅ D3 | **Every song available in PHOENIX 2**, old ones included, plus a "Version" filter | 462 S/D charts debuted before FIESTA, and 19 of the 67 matched P2 title charts are among them |
| ✅ D4 | **Include everything, with the Steam Link content hidden behind a filter**: Half-Double mode (790 charts) and the 10 RISE songs (87 charts). Premium-mode charts (172) are in, with an icon. Co-op and UCS are out | None of the Steam Link charts have skill data, so skill filters never match them. The detail sheet says "no skill data" |
| ✅ D9 | **Gimmick = every chart ever required by an official GIMMICK title (any version with records) + PHOENIX 2's SLOW track.** No user-curated list. No tag computed from timing | Result ([`research-gimmick-titles.md`](research-gimmick-titles.md)): titles exist only in **XX, PHOENIX and PHOENIX 2**; PRIME 2 and earlier had none. Ladders: XX Gimmick (community sources only), P1 [GIMMICK], P2 [GIMMICK] + [SLOW] → **22 charts in P2** (19 S, 3 D). Older ladders add Bad Apple!! S15 (XX) and 8 6 S16 (P1); LOVE SCENARIO is gone from P2. Match on pumpout chart IDs, not levels: e.g. Take Out D23 [SLOW] was D22 before P2. Wicked Legend D21 ("All Gimmick Ver." in community files) is **not** a title chart, so it's excluded under this rule |
| ✅ D1-b | **Titles screen**: PHOENIX 2's 9 tracks, each Lv.1→10. Tap a title to open its chart. **Tick the titles you've earned**; ticks are saved on the phone and included in the Settings backup | The only personal data in v1. P1 ladders are not shown, since they didn't carry over |
| ✅ D8 | **6 skills: half, run, twist, bracket, gimmick, drill.** Tagged when coverage passes a tuned threshold; official title charts are always tagged. Finer tags appear only in the detail sheet | |
| ✗ D7/D10/D23 | Unclear as asked ("don't get it") → re-asked in plain words in round 3 | |

**Round 3 — 2026-10-13** (answered on mockups)

| # | Decision | Note |
|---|---|---|
| ✅ D10 | **Data refresh on request**: Claude runs `npm run piu:data`, shows what changed, commits | D7 (two sources, pumpout pinned) and D23 (data bundled into the lazy Pump chunk) are engineering defaults with no visible trade-off; kept as proposed |
| ✅ D11/D17 | **One row per chart, sorted by level, sticky level headers** | |
| ✅ D12 | **Search in the bottom bar** (with the keyboard fix; move to the top only if it fails on the phone) | |
| ✅ D13 | **7×4 level grid, tap start then end; ranges only** | "Separate levels" was left unanswered → default (ranges only). Presets cover separate levels |
| ✅ D14 | **Skills: any by default, with an any/all switch** | |
| ✅ D16 | **Bottom bar: S/D (+HD when Steam Link is on), level range, selected skills, Clear; search + Filters (n)** | |
| ✅ D20 | **Presets in v1**, as chips at the top of the Filters sheet | |
| ✅ Nav | **Charts \| Titles tabs in the header** | |
| ✅ D15 | **Back closes the open sheet, otherwise leaves Pump** | |
| ✗ D19 | Chart sheet mockup was read as a search result → re-asked as a tap-a-row flow in round 4 | |

**Round 4 — 2026-10-13** (answered on mockups)

| # | Decision | Note |
|---|---|---|
| ✅ D19 | **Tapping a row opens a sheet over the list** with that chart's details: title, artist, type, debut version, BPM, step artist, old level if changed, skill bars, and its title with an "earned" tick. Back or swipe down returns to the same place | |
| ✅ Empty | **No results → suggest which filter to remove**, with the count each removal would give, plus Clear all | |
| ✅ D22 | **Add `@tanstack/react-virtual`** (8 KB) for the list | The one new runtime dependency |
| ✅ D9 detail | **Wicked Legend D21 stays out** (not a title chart). No objection raised | |

**Frontier empty: every §2 decision is settled.** Next: the user confirms the shared understanding → `spec.md` → user review → task-by-task plan.

