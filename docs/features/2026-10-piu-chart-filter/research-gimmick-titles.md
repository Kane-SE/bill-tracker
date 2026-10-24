# PIU gimmick titles: every chart an official GIMMICK or SLOW title required

Research date: **2026-10-13**. This file extends [research.md](research.md) §3.3, §3.7 and §6 and does not repeat them. "Primary" means Andamiro material or an authenticated scrape of an Andamiro page. "Community" means a wiki, fan site or hand-made list. Levels "then" are the levels written in the title requirement. "P2" levels are PHOENIX 2 v1.01.0 levels from pumpout (`aaaaaa2493/pumpout-db-updates` @ `ed314a8`, `db/pumpout-phoenix-2-1.01.db`, state rule of research.md §6.2), cross-checked against the PIU Scores CSV [`Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType`](https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType) (fetched 2026-10-13, 4,675 rows). The two agree on all 22 charts in §4.

The rule applied (from the app owner): every chart ever required by an official GIMMICK title counts as gimmick, and so does every chart in PHOENIX 2's SLOW track.

---

## 1. Answer first

- **Only three versions had a title system: XX (2019), PHOENIX (2022) and PHOENIX 2 (2026).** XX introduced titles. Its official intro page lists "Reward Title" among its features, earned through gameplay achievements, "more than 100 reward titles" ([piugame.com XX intro, Wayback 2019-01-10](https://web.archive.org/web/20190110030401/http://www.piugame.com:80/piu.xx/intro/piu_Intro.php), primary). PRIME 2's own "New function" page lists Random Train, Rival and Auto Velocity, and its site has no title page. PRIME's site has none either. I found no title system in FIESTA, FIESTA EX, FIESTA 2 or INFINITY. Those versions had mission or quest zones, which use their own quest charts and award no titles (§3.5).
- **Gimmick-like categories:**
  - XX: "Gimmick LV.1–10". namu.wiki labels it "GIMMICK(변속)", "변속" meaning speed change. Each title needs **SS** on one named chart.
  - PHOENIX: "[GIMMICK] Lv.1–10", each needing **SSS** on one named chart.
  - PHOENIX 2: "[GIMMICK] LV.1–10" plus "[SLOW] LV.1–10", each needing **SSS** on one named chart.
  - No version has a "Speed", "Special", "Trick" or "Scroll" title category.
- **XX's ladder** is the PHOENIX ladder with two different charts: **Bad Apple!! feat. Nomico S15** and **LOVE SCENARIO S17**. It also has Everybody Got 2 Know at S19, a level later raised to S21. LOVE SCENARIO was deleted at PHOENIX v1.00.1. Bad Apple!! S15 is still in PHOENIX 2 at S15. The XX list is **community-sourced only**, because the XX title page was login-only.
- **No other PHOENIX or PHOENIX 2 title mentions gimmick** (question 2). Outside the ladders, the only titles that mention one are "[GIMMICK] EXPERT" (earn all 10) and "SPECIALIST" (earn every skill title). Neither names a chart. Two chart-specific titles come close but say nothing about gimmicks, so they are not counted: HUMAN METRONOME (Yeo rae a S1, "180,000 Point or less") and GRAND DADDY (PHOENIX 2: Big Daddy S21, "Clear with AV999"). PHOENIX's skill titles were **not** carried into PHOENIX 2 ([transfer notice wr_id=338](https://www.piugame.com/phoenix2_notice?wr_id=338), primary).
- **Final PHOENIX 2 gimmick list: 22 charts (19 Single, 3 Double)** (§4). The ladders hold 23 distinct charts. 22 exist in PHOENIX 2; LOVE SCENARIO S17 does not. The 20 PHOENIX 2 GIMMICK and SLOW charts are all included. The older ladders add 2 more: Bad Apple!! S15 (XX) and 8 6 S16 (PHOENIX). Yeo rae a S13 and Twist of Fate S19 were GIMMICK in XX and PHOENIX and moved to SLOW in PHOENIX 2.

---

## 2. Sources

| Source | Kind | What it gives |
|---|---|---|
| [XX intro page](https://web.archive.org/web/20190110030401/http://www.piugame.com:80/piu.xx/intro/piu_Intro.php) and [XX web-open notice wr_id=330](https://web.archive.org/web/20190109033928/http://piugame.com:80/bbs/board.php?bo_table=global_notice&wr_id=330) (2019-01-07: "Reward titling WEB pages … are opened first") | primary (Wayback) | Titles are new in XX |
| [XX title page `piu.xx/mydata/game_title.php`](https://web.archive.org/web/20190111093546/http://www.piugame.com:80/piu.xx/mydata/game_title.php) (captures 2019-01-11, 2023-03-23, 2023-06-01) | primary | **Login only.** All three captures are the "Use after log in" alert page |
| namu.wiki "펌프 잇 업 XX" §7.2 "스킬 관련", [Wayback 2020-05-30](https://web.archive.org/web/20200530013810/https://namu.wiki/w/%ED%8E%8C%ED%94%84%20%EC%9E%87%20%EC%97%85%20XX) | community | Full XX skill ladders. The common condition is "대상 채보 SS랭크 이상", i.e. SS or better on the target chart, with RUN Lv.9 the one exception |
| [pumpitup.fandom.com "Titles"](https://pumpitup.fandom.com/wiki/Titles?oldid=1872) (rev 1872, 2025-03-09; page created 2021-10-06 by user TheDrMurloc) | community | XX skill ladders; same 10 GIMMICK charts as namu |
| [`XXTitleList.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Domain/Models/Titles/XX/XXTitleList.cs) lines 91–101, `DrMurloc/PumpItUpScoreTracker` @ `78499c4` | community | Same list. Probably the same author as the Fandom page, so it does not count as independent |
| [`AccountTitles.html`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Tests.E2E/PiuGame/Fixtures/AccountTitles.html) @ `78499c4`, header: "PII-scrubbed raw capture of phoenix.piugame.com (2026-07-03)" | **primary (authenticated scrape)** | All 213 PHOENIX titles with their requirement text verbatim. GIMMICK block at lines 2584–2760 |
| [`PhoenixTitleList.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix/PhoenixTitleList.cs) lines 180–190 @ `78499c4` (unchanged since [`89e7aca`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/89e7aca667c5a72e8aceb19895ba4411bb917669/ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix/PhoenixTitleList.cs), 2024-03-25) | community copy | PHOENIX ladder |
| PSS snapshot `.ssc` `#CHARTNAME` (`DrMurloc/PiuScoresStepfiles` @ `0f551b5`, `snapshots/piucenter-snapshot-092326.zip`, `stepfiles/`) | community | PHOENIX titles only, e.g. `#CHARTNAME:[GIMMICK] Lv.8 - SSS Grade or more;`. No XX titles appear in any `.ssc` |
| [`Phoenix2TitleList.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.Domain/Models/Titles/Phoenix2/Phoenix2TitleList.cs) lines 246–267 @ `78499c4` | primary (authenticated scrape, 2026-07-09) | PHOENIX 2 GIMMICK and SLOW ladders, as in research.md §3.7 |

---

## 3. Ladders

### 3.1 XX: Gimmick LV.1–LV.10 (requirement: SS or better)

The source for every row is community: namu.wiki XX §7.2 (2020-05-30 snapshot), Fandom "Titles", and `XXTitleList.cs` lines 91–100. In XX, "SS" is the rank that earlier versions called gold S; namu §2 gives the renaming as "실버 S → S, 골드 S → SS, SS → SSS". pumpout has every one of these charts at the stated level at XX v1.00.1 and at XX v2.08.0, with no re-rate in between.

| Title | Chart then (XX) | P2 status (level now) | pumpout chartId |
|---|---|---|---|
| Gimmick LV.1 | Yeo rae a S13 | yes, S13 | 1502 |
| Gimmick LV.2 | Bad Apple!! feat. Nomico S15 (Arcade cut) | yes, S15 | 3317 |
| Gimmick LV.3 | LOVE SCENARIO S17 (namu: "사랑을 했다") | **no**: song deleted at PHOENIX v1.00.1, and absent from the PIU Scores P2 CSV | 5510 |
| Gimmick LV.4 | Come to Me S17 | yes, **S18** (re-rated at P2 v1.00.0) | 183 |
| Gimmick LV.5 | Rock the house - SHORT CUT - S18 | yes, S18 | 1856 |
| Gimmick LV.6 | Miss S' story S19 | yes, S19 | 2503 |
| Gimmick LV.7 | Nakakapagpabagabag S19 | yes, S19 | 4623 |
| Gimmick LV.8 | Twist of Fate (feat. Ruriling) S19 | yes, S19 | 4667 |
| Gimmick LV.9 | Everybody Got 2 Know S19 (Remix) | yes, **S21** (S19 → S21 at PHOENIX v1.00.1) | 1084 |
| Gimmick LV.10 | 8 6 S20 (namu and Fandom write "86") | yes, S20 | 5542 |
| Gimmick Expert | all 10 above | n/a | |

### 3.2 PHOENIX: [GIMMICK] Lv.1–Lv.10 (requirement: "SSS Grade or more")

The requirement text is quoted verbatim from the authenticated capture `AccountTitles.html`. `PhoenixTitleList.cs` lines 181–190 and the `.ssc` `#CHARTNAME` tags agree on all 10. Each chart is at the stated level at PHOENIX v2.12.0 in pumpout.

| Title | Requirement (verbatim) | P2 status (level now) | pumpout chartId | `.ssc` `#CHARTNAME` file (PSS `stepfiles/`) |
|---|---|---|---|---|
| [GIMMICK] Lv.1 | [Yeo rae a S13] SSS Grade or more | yes, S13 (now [SLOW] LV.1) | 1502 | `10 - FIESTA 2/(1) 1341 - Yeo Rae A/…ssc` l.1405 |
| [GIMMICK] Lv.2 | [8 6 S16] SSS Grade or more | yes, S16 | 5541 | `14 - XX/1670 - 8 6/1670 - 8 6.ssc` l.2187 |
| [GIMMICK] Lv.3 | [Ugly Dee S17] SSS Grade or more | yes, S17 (chart added at XX v2.07.0) | 6772 | `05 - NX~NX2/(2) D18 - Ugly Dee/…ssc` l.3195 |
| [GIMMICK] Lv.4 | [Come to Me S17] SSS Grade or more | yes, **S18** | 183 | `03 - REBIRTH~PREX 3/(1) 826 - Come to Me/…ssc` l.3472 |
| [GIMMICK] Lv.5 | [Rock the house - SHORT CUT - S18 ] SSS Grade or more | yes, S18 | 1856 | `12 - PRIME/14E4 - [Short Cut] Rock The House/…ssc` l.809 |
| [GIMMICK] Lv.6 | [Miss S' story S19] SSS Grade or more | yes, S19 | 2503 | `03 - REBIRTH~PREX 3/(2) 716 - Miss's Story/…ssc` l.3312 |
| [GIMMICK] Lv.7 | [Nakakapagpabagabag S19] SSS Grade or more | yes, S19 | 4623 | `13 - PRIME 2/1577 - Nakakapagpabagabag/…ssc` l.1650 |
| [GIMMICK] Lv.8 | [Twist of Fate S19] SSS Grade or more | yes, S19 (now [SLOW] LV.2) | 4667 | `13 - PRIME 2/1536 - Twist of Fate (feat. Ruriling)/…ssc` l.4192 |
| [GIMMICK] Lv.9 | [8 6 S20] SSS Grade or more | yes, S20 | 5542 | `14 - XX/1670 - 8 6/1670 - 8 6.ssc` l.6629 |
| [GIMMICK] Lv.10 | [Everybody Got 2 Know S21] SSS Grade or more | yes, S21 | 1084 | `09 - FIESTA EX/1132 - [Remix] Everybody Got 2 Know/…ssc` l.2267 |
| [GIMMICK] EXPERT | "Earn  [GIMMICK Lv.1~10]" | n/a | | |

### 3.3 PHOENIX 2: [GIMMICK] LV.1–LV.10 (requirement: SSS)

Source: `Phoenix2TitleList.cs` lines 246–256, an authenticated scrape (primary). The level then is the level now: the list was scraped on 2026-07-09 at P2 v1.00, and none of these charts changed level at v1.01.

| Title | Chart (P2) | Level history (pumpout) | pumpout chartId |
|---|---|---|---|
| [GIMMICK] LV.1 | STAGER S17 | S17 since PHOENIX v1.07.0 | 7427 |
| [GIMMICK] LV.2 | Ugly Dee S17 | S17 since XX v2.07.0 | 6772 |
| [GIMMICK] LV.3 | Rock the house - SHORT CUT - S18 | S18 since PRIME | 1856 |
| [GIMMICK] LV.4 | Come to Me S18 | S17 in XX and PHOENIX, S18 from P2 v1.00.0 | 183 |
| [GIMMICK] LV.5 | Miss S' story S19 | S19 since XX v1.00.1 | 2503 |
| [GIMMICK] LV.6 | Nakakapagpabagabag S19 | S19 since XX v1.00.1 | 4623 |
| [GIMMICK] LV.7 | 8 6 S20 | S20 since XX v1.00.1 | 5542 |
| [GIMMICK] LV.8 | Tales of Pumpnia S20 | S19 in XX, S20 from PHOENIX v1.00.1 | 5967 |
| [GIMMICK] LV.9 | CHAOS AGAIN S21 | S21 chart added at PHOENIX v2.00.0. pumpout labels it **PREMIUM MODE EXCLUSIVE** at P2 v1.01 | 7568 |
| [GIMMICK] LV.10 | Everybody Got 2 Know S21 | S19 in XX, S21 from PHOENIX v1.00.1 | 1084 |

### 3.4 PHOENIX 2: [SLOW] LV.1–LV.10 (requirement: SSS)

Source: `Phoenix2TitleList.cs` lines 257–267 (primary scrape).

| Title | Chart (P2) | Level history (pumpout) | pumpout chartId |
|---|---|---|---|
| [SLOW] LV.1 | Yeo rae a S13 | S13 throughout. XX and PHOENIX GIMMICK Lv.1 | 1502 |
| [SLOW] LV.2 | Twist of Fate (feat. Ruriling) S19 | S19 since XX v1.00.1. XX and PHOENIX GIMMICK Lv.8 | 4667 |
| [SLOW] LV.3 | Moonlight S20 | S19 through PHOENIX, S20 from P2 v1.00.0. P2 [DRILL] LV.4 "Moonlight S18" is a different chart | 335 |
| [SLOW] LV.4 | Night Duty S20 | S19 at XX v2.06.0, S20 from PHOENIX v1.00.1 | 6791 |
| [SLOW] LV.5 | Karyawisata S21 | S20 through PHOENIX, S21 from P2 v1.00.0 | 1839 |
| [SLOW] LV.6 | Take Out S21 | S20 through PHOENIX, S21 from P2 v1.00.0 | 1023 |
| [SLOW] LV.7 | Twist of Fate (feat. Ruriling) D21 | D21 since XX v1.00.1 | 4670 |
| [SLOW] LV.8 | Moonlight D22 | D21 through PHOENIX, D22 from P2 v1.00.0 | 330 |
| [SLOW] LV.9 | Take Out D23 | D22 through PHOENIX, D23 from P2 v1.00.0. **Join trap:** the chart rated D23 before P2 (pumpout 1018, step artist WINDFORCE) is now D24, so match on the P2 level | 1017 |
| [SLOW] LV.10 | Banya-P Guitar Remix S23 | S22 through PHOENIX, S23 from P2 v1.00.0 | 642 |

### 3.5 Versions before XX: no title system

| Version | Evidence | Verdict |
|---|---|---|
| PRIME 2 (2016–2018) | Its ["New function" page](https://web.archive.org/web/20170602121847/http://www.piugame.com:80/piu.prime2/intro/prime2new.php) (primary) lists Random train, Rival system and Auto velocity system. The [site map](https://web.archive.org/web/20161201212856/http://www.piugame.com:80/piu.prime2/prime2.sitemap.php) "MY INFO" section has Game ID information and Record of recent plays, with no title page. XX's title list includes "Prime 2 Specialist" and "Prime 2 VIP", which XX awarded for past PRIME 2 leaderboard ranks ([Fandom](https://pumpitup.fandom.com/wiki/Titles?oldid=1872), `XXTitleList.cs` lines 148–153). namu.wiki's [PRIME 2 page (Wayback 2020-06-02)](https://web.archive.org/web/20200602013448/https://namu.wiki/w/%ED%8E%8C%ED%94%84%20%EC%9E%87%20%EC%97%85%20PRIME%202) never uses the word "칭호" (title). PRIME 2 did have a Quest Zone with its own quest charts ([v1.09.0 notice wr_id=299, 2017-09-25](https://web.archive.org/web/20171012034817/http://www.piugame.com:80/bbs/board.php?bo_table=global_notice&wr_id=299)) | no titles |
| PRIME (2015) | Its [game introduction page](https://web.archive.org/web/20150103020400/http://www.piugame.com:80/piu.prime/piu.intro/en/1_intro.php) (primary) lists HD, network, dual interface, Rank mode and Item shop. Its "MY INFO" menu has no title page. Its full-mode pages mention a "Quest Zone for USB users" | no titles |
| FIESTA 2, FIESTA EX, FIESTA (2010–2013) | The archived official intro pages (`fiesta2_introduce/`, `fiestaEX_introduce_/`, `2010/en/`) are 400–500-byte Flash or image shells, so they could not be read. The XX intro and namu's XX page ("2. 변경사항 … 칭호 수집 시스템") present titles as new in XX. The `.ssc` corpus has "Fiesta EX Quest Zone" mission charts, not titles | no evidence of titles |
| INFINITY (2012, US/UK/CA only) | No official page found. Web searches turned up no mention of titles or achievements in INFINITY | no evidence of titles |

### 3.6 Other PHOENIX and PHOENIX 2 titles checked for "gimmick"

I searched every PHOENIX title (213 in `AccountTitles.html`) and every PHOENIX 2 title (272 in `Phoenix2TitleList.cs`). The search terms were gimmick, slow, speed, scroll, trick, special, stop, warp, velocity, BPM and metronome.

| Title | Version | Requirement | Counted? |
|---|---|---|---|
| [GIMMICK] EXPERT | P1, P2 | earn the 10 GIMMICK titles | no chart of its own |
| SPECIALIST | P1, P2 | "Earn all skill titles" | no chart of its own |
| HUMAN METRONOME / Human metronome | P1 (fixture line 808), P2 (`Phoenix2TitleList.cs` l.89) | "[Yeo rae a S1] 180,000 Point or less" | **no**: the title is not in a gimmick category. Yeo rae a S1 is in P2 (pumpout 1499) |
| GRAND DADDY | P2 (l.102) | "[Big Daddy S21] Clear with AV999" | **no**: this is a speed-modifier challenge, not a chart gimmick |
| [Legacy] … | P2 | P1 titles ported into P2 under a "[Legacy]" prefix ([`Phoenix2TitleCatalogReconTests.cs`](https://github.com/DrMurloc/PumpItUpScoreTracker/blob/78499c485f2144e3d163607b701b7f2a8575e327/ScoreTracker/ScoreTracker.ExplorationTests/LiveSite/Phoenix2TitleCatalogReconTests.cs) lines 13–16) | The official [transfer list](https://www.piugame.com/phoenix2_notice?wr_id=338) covers difficulty, plate, membership and event titles only. No skill or GIMMICK title transfers |

---

## 4. Final list: PHOENIX 2 charts to tag "gimmick" (22)

The list is the union of the four ladders above, deduplicated by pumpout `chartId`, keeping only charts present at P2 v1.01.0. Every row matches a PIU Scores P2 row on title, type and level.

| # | Song | Mode | P2 level | From titles | pumpout chartId | PIU Scores ChartId |
|---|---|---|---|---|---|---|
| 1 | Yeo rae a | S | 13 | XX Gimmick LV.1 · P1 [GIMMICK] Lv.1 · P2 [SLOW] LV.1 | 1502 | ba83be2a-49e5-40e6-910c-7e072cd8a1d7 |
| 2 | Bad Apple!! feat. Nomico | S | 15 | XX Gimmick LV.2 | 3317 | 23620244-444f-414a-bb8d-c07e6b174b58 |
| 3 | 8 6 | S | 16 | P1 [GIMMICK] Lv.2 | 5541 | 572d70e4-7c1f-48a7-a90c-47787a1c984a |
| 4 | Ugly Dee | S | 17 | P1 [GIMMICK] Lv.3 · P2 [GIMMICK] LV.2 | 6772 | 8dec0213-0352-44a8-9601-cdf9e9a052a9 |
| 5 | STAGER | S | 17 | P2 [GIMMICK] LV.1 | 7427 | 803ae674-a88d-4e9c-bb1d-29d9c33470a7 |
| 6 | Come to Me | S | 18 | XX Gimmick LV.4 (S17) · P1 [GIMMICK] Lv.4 (S17) · P2 [GIMMICK] LV.4 | 183 | ad3e691c-aada-477c-b07f-ef82e60d8f4f |
| 7 | Rock the house - SHORT CUT - | S | 18 | XX Gimmick LV.5 · P1 [GIMMICK] Lv.5 · P2 [GIMMICK] LV.3 | 1856 | 0e83e0d3-4ad5-4ef7-adfd-d9e5ef7ba5ce |
| 8 | Miss S' story | S | 19 | XX Gimmick LV.6 · P1 [GIMMICK] Lv.6 · P2 [GIMMICK] LV.5 | 2503 | c44e6b20-d729-4cb5-8536-b97a79949f73 |
| 9 | Nakakapagpabagabag | S | 19 | XX Gimmick LV.7 · P1 [GIMMICK] Lv.7 · P2 [GIMMICK] LV.6 | 4623 | 2b82691d-13e1-454e-bcd2-df4690cf92fb |
| 10 | Twist of Fate (feat. Ruriling) | S | 19 | XX Gimmick LV.8 · P1 [GIMMICK] Lv.8 · P2 [SLOW] LV.2 | 4667 | 81489fc8-2ce4-4dfb-b3f3-ed6e390863e2 |
| 11 | 8 6 | S | 20 | XX Gimmick LV.10 · P1 [GIMMICK] Lv.9 · P2 [GIMMICK] LV.7 | 5542 | f531c852-0f85-4bd9-a4c6-f136b4b0c974 |
| 12 | Tales of Pumpnia | S | 20 | P2 [GIMMICK] LV.8 | 5967 | 58179303-1869-42c3-9ee3-944595b2699d |
| 13 | Moonlight | S | 20 | P2 [SLOW] LV.3 | 335 | d4d72efb-db4a-41f8-a764-bfcbc0438cb9 |
| 14 | Night Duty | S | 20 | P2 [SLOW] LV.4 | 6791 | 95ff0a98-9141-40df-81a0-2708174a97c9 |
| 15 | Everybody Got 2 Know | S | 21 | XX Gimmick LV.9 (S19) · P1 [GIMMICK] Lv.10 · P2 [GIMMICK] LV.10 | 1084 | f1b7cb7c-26fc-45dc-b0e1-4a69058514b2 |
| 16 | CHAOS AGAIN | S | 21 | P2 [GIMMICK] LV.9 (Premium Mode exclusive in pumpout) | 7568 | 5ddd00d1-2066-4516-9d48-f4a2859d43aa |
| 17 | Karyawisata | S | 21 | P2 [SLOW] LV.5 | 1839 | d1f04b59-1f89-4869-a530-b16cc082c358 |
| 18 | Take Out | S | 21 | P2 [SLOW] LV.6 | 1023 | d7a1a295-5f39-40c6-a12c-a93283be9f52 |
| 19 | Twist of Fate (feat. Ruriling) | D | 21 | P2 [SLOW] LV.7 | 4670 | ed5bc9a6-9140-4967-88b5-1d73352a6e7f |
| 20 | Moonlight | D | 22 | P2 [SLOW] LV.8 | 330 | 9ec4675c-6eba-46fb-9276-7bcbe3acb426 |
| 21 | Take Out | D | 23 | P2 [SLOW] LV.9 | 1017 | d5bcf69d-2bf8-4654-83e2-1bae76642357 |
| 22 | Banya-P Guitar Remix | S | 23 | P2 [SLOW] LV.10 | 642 | 49c14bfa-e3c4-4876-8e0d-933dfa2933d5 |

Excluded: **LOVE SCENARIO S17** (XX Gimmick LV.3; pumpout 5510). It is not in PHOENIX 2.

By origin: 11 charts come only from the P2 ladders (STAGER, Tales of Pumpnia, CHAOS AGAIN and the 8 SLOW-only charts). 2 come only from the older ladders (Bad Apple!! S15, 8 6 S16). 9 appear in two or more ladders.

---

## 5. Gaps

- **The XX ladder has no primary source.** The XX title page was login-only, and every Wayback capture of it is the login alert. Two community copies agree: namu.wiki (2020-05-30 snapshot) and Fandom / `XXTitleList.cs`. The Fandom page and the code are probably by the same person (Fandom user TheDrMurloc), so namu is the only independent copy. I could not tell whether the XX ladder changed during XX (2019–2022). Its two copies are dated 2020-05 and 2021-10, and neither shows a change. The XX notice "Loss Title Reward (~1/28)" ([wr_id=337](https://web.archive.org/web/20220522172223/https://piugame.com/bbs/board.php?bo_table=global_notice&wr_id=337)) has a PDF attachment that was not archived.
- **The PHOENIX ladder at launch (2022) is unverified.** The primary capture is from 2026-07-03, and the community code has not changed since 2024-03-25. Ugly Dee S17 only arrived at XX v2.07.0, so it is consistent with a late-XX or PHOENIX-era list.
- **The PHOENIX 2 ladders rest on one authenticated scrape (2026-07-09).** Andamiro may change them in later patches. Re-check them when a patch note mentions titles.
- **Before XX, only the PRIME and PRIME 2 sites could be read.** The FIESTA-era official pages are unreadable Flash or image shells. I checked no official source for INFINITY, Pro / Pro 2 or PIU M (mobile). "No titles" for those versions rests on the absence of any mention, plus XX presenting titles as new.
- **Not accessed:**
  - namu.wiki and en.namu.wiki live pages: Cloudflare check. I did not bypass it; I used only the Wayback copy.
  - Moegirl's title page: HTTP 403 earlier (research.md §3.9).
  - The live XX, PHOENIX and PHOENIX 2 title pages: login only.
  - The YouTube playlist "PUMP IT UP XX~PHOENIX SKILL TITLE List" (search result only, not viewed).
- **Gimmick-related, but outside the rule** (candidates for the derived score, not for the curated list):
  - Wicked Legend D21, a HIDDEN chart whose `.ssc` reads `#CHARTNAME:All Gimmick Ver.;` with `#DESCRIPTION:D21 HIDDEN INFOBAR;` (community `.ssc`, `14 - XX/1634 - Wicked Legend/…ssc` l.12231). It is still in P2 at D21 (pumpout 6028).
  - The gimmick removals and restorations in patch notes (research.md §4).
  - HUMAN METRONOME's Yeo rae a S1.
