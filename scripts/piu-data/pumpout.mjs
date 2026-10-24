import { fold } from './fold.mjs'

/**
 * Reads the pumpout SQLite for one game version. A song or chart is present
 * when its latest operation among the version's ancestors is not DELETE; its
 * level is its latest rating among the ancestors (research.md §6.2).
 */

const DELETE = 2
const KEEP_MODES = new Set(['S', 'D', 'HDB'])
const LABEL = { ucs: 'UCS', premium: 'PREMIUM MODE EXCLUSIVE', steamLink: 'STEAM LINK EXCLUSIVE' }

/** First appearance mix (pumpout `mix.internalTitle`) → P2 Series Zone group. */
export const SERIES_BY_MIX = {
  'The 1st Dance Floor': '1st~ZERO', '2nd Ultimate Remix': '1st~ZERO', '3rd O.B.G': '1st~ZERO',
  'The O.B.G / Season Evolution': '1st~ZERO', 'The Collection': '1st~ZERO', 'The Perfect Collection': '1st~ZERO',
  Extra: '1st~ZERO', 'The Premiere': '1st~ZERO', 'The Prex': '1st~ZERO', 'The Rebirth': '1st~ZERO',
  'The Premiere 2': '1st~ZERO', 'The Prex 2': '1st~ZERO', 'The Premiere 3': '1st~ZERO', 'The Prex 3': '1st~ZERO',
  Exceed: '1st~ZERO', 'Exceed 2': '1st~ZERO', Zero: '1st~ZERO',
  'NX / New Xenesis': 'NX~NXA', 'NX2 / Next Xenesis': 'NX~NXA', 'NX Absolute': 'NX~NXA',
  Fiesta: 'FIESTA~FIESTA 2', 'Fiesta EX': 'FIESTA~FIESTA 2', 'Fiesta 2': 'FIESTA~FIESTA 2',
  Infinity: 'PRIME', Prime: 'PRIME', 'Prime JE': 'PRIME',
  'Prime 2': 'PRIME 2', XX: 'XX', Phoenix: 'PHOENIX', 'Phoenix 2': 'PHOENIX 2',
}

/** pumpout category → P2 channel. P2 has no J-Music channel; PIU Scores folds it into World Music. */
export const CHANNEL_BY_CATEGORY = {
  'K-POP': 'K-POP', 'WORLD MUSIC': 'WORLD MUSIC', ORIGINAL: 'ORIGINAL',
  'J-MUSIC': 'WORLD MUSIC', XROSS: 'XROSS', RISE: 'RISE',
}

export const CUT_BY_NAME = { 'Short Cut': 'SHORTCUT', Arcade: 'ARCADE', Remix: 'REMIX', 'Full Song': 'FULLSONG' }

const ANC = 'anc AS (SELECT ancestorId, ancestorSortOrder FROM _derived_versionAncestor WHERE versionId = :v)'

const STATE_SQL = `
WITH ${ANC},
sv AS (SELECT s.songId, s.operationId,
         ROW_NUMBER() OVER (PARTITION BY s.songId ORDER BY a.ancestorSortOrder DESC, s.operationId DESC) rn
       FROM songVersion s JOIN anc a ON a.ancestorId = s.versionId),
live_songs AS (SELECT songId FROM sv WHERE rn = 1 AND operationId <> ${DELETE}),
cv AS (SELECT cv.chartId, cv.operationId,
         ROW_NUMBER() OVER (PARTITION BY cv.chartId ORDER BY a.ancestorSortOrder DESC, cv.operationId DESC) rn
       FROM chartVersion cv JOIN anc a ON a.ancestorId = cv.versionId),
live_charts AS (SELECT ch.chartId, ch.songId FROM cv JOIN chart ch ON ch.chartId = cv.chartId
                WHERE cv.rn = 1 AND cv.operationId <> ${DELETE} AND ch.songId IN (SELECT songId FROM live_songs)),
rv AS (SELECT crv.chartId, crv.chartRatingId,
         ROW_NUMBER() OVER (PARTITION BY crv.chartId ORDER BY a.ancestorSortOrder DESC) rn
       FROM chartRatingVersion crv JOIN anc a ON a.ancestorId = crv.versionId)
SELECT lc.chartId AS chartId, lc.songId AS songId, mo.internalAbbreviation AS mode, d.value AS level
FROM live_charts lc
JOIN rv ON rv.chartId = lc.chartId AND rv.rn = 1
JOIN chartRating cr ON cr.chartRatingId = rv.chartRatingId
JOIN mode mo ON mo.modeId = cr.modeId
JOIN difficulty d ON d.difficultyId = cr.difficultyId`

const LABELS_SQL = `
WITH ${ANC},
lv AS (SELECT clv.chartLabelId, clv.operationId,
         ROW_NUMBER() OVER (PARTITION BY clv.chartLabelId ORDER BY a.ancestorSortOrder DESC, clv.operationId DESC) rn
       FROM chartLabelVersion clv JOIN anc a ON a.ancestorId = clv.versionId)
SELECT cl.chartId AS chartId, l.internalTitle AS label
FROM lv JOIN chartLabel cl ON cl.chartLabelId = lv.chartLabelId JOIN label l ON l.labelId = cl.labelId
WHERE lv.rn = 1 AND lv.operationId <> ${DELETE}`

const CATEGORY_SQL = `
WITH ${ANC},
scv AS (SELECT scv.songId, scv.songCategoryId,
          ROW_NUMBER() OVER (PARTITION BY scv.songId ORDER BY a.ancestorSortOrder DESC) rn
        FROM songCategoryVersion scv JOIN anc a ON a.ancestorId = scv.versionId)
SELECT scv.songId AS songId, c.internalTitle AS category
FROM scv JOIN songCategory sc ON sc.songCategoryId = scv.songCategoryId JOIN category c ON c.categoryId = sc.categoryId
WHERE scv.rn = 1`

// First appearance of any kind (INSERT, EXISTS, REVIVE, CROSS …): 49 songs, such as
// INFINITY's Kitty Cat, only ever arrived by CROSS.
const DEBUT_SQL = `
SELECT sv.songId AS songId, m.internalTitle AS mix
FROM songVersion sv JOIN version v ON v.versionId = sv.versionId JOIN mix m ON m.mixId = v.mixId
WHERE sv.operationId <> ${DELETE}
ORDER BY sv.songId, m.sortOrder, v.sortOrder`

const SONGS_SQL = 'SELECT s.songId AS songId, s.internalTitle AS title, c.internalTitle AS cut FROM song s JOIN cut c ON c.cutId = s.cutId'
const TITLES_SQL =
  'SELECT st.songId AS songId, l.code AS lang, st.title AS title FROM songTitle st JOIN language l ON l.languageId = st.languageId ORDER BY st.songTitleId'
const ARTISTS_SQL =
  'SELECT sa.songId AS songId, a.internalTitle AS name FROM songArtist sa JOIN artist a ON a.artistId = sa.artistId ORDER BY sa.songId, sa.sortOrder'
const STEPS_SQL =
  'SELECT cs.chartId AS chartId, s.internalTitle AS name FROM chartStepmaker cs JOIN stepmaker s ON s.stepmakerId = cs.stepmakerId ORDER BY cs.chartId, cs.sortOrder'
const BPM_SQL = 'SELECT songId, bpmMin, bpmMax FROM songBpm ORDER BY songBpmId'

function all(db, sql, params = {}) {
  const st = db.prepare(sql)
  st.bind(params)
  const rows = []
  while (st.step()) rows.push(st.getAsObject())
  st.free()
  return rows
}

function groupBy(rows, key, value) {
  const out = new Map()
  for (const r of rows) {
    if (!out.has(r[key])) out.set(r[key], [])
    out.get(r[key]).push(value ? r[value] : r)
  }
  return out
}

export function readPumpout(db, { version, prevVersion }) {
  const state = all(db, STATE_SQL, { ':v': version })
  const prev = new Map(all(db, STATE_SQL, { ':v': prevVersion }).map((r) => [r.chartId, r.level]))
  const labels = groupBy(all(db, LABELS_SQL, { ':v': version }), 'chartId', 'label')
  const steps = groupBy(all(db, STEPS_SQL), 'chartId', 'name')

  const kept = state.filter((r) => KEEP_MODES.has(r.mode) && !(labels.get(r.chartId) ?? []).includes(LABEL.ucs))
  const charts = kept.map((r) => {
    const ls = labels.get(r.chartId) ?? []
    const p = prev.get(r.chartId)
    return {
      id: r.chartId,
      songId: r.songId,
      mode: r.mode,
      level: r.level ?? null,
      prevLevel: p != null && p !== r.level ? p : null,
      premium: ls.includes(LABEL.premium),
      steamLink: ls.includes(LABEL.steamLink),
      stepArtist: steps.get(r.chartId)?.join(' & ') ?? null,
    }
  })
  return { songs: readSongs(db, version, new Set(charts.map((c) => c.songId))), charts }
}

function readSongs(db, version, ids) {
  const titles = groupBy(all(db, TITLES_SQL), 'songId')
  const artists = groupBy(all(db, ARTISTS_SQL), 'songId', 'name')
  const category = new Map(all(db, CATEGORY_SQL, { ':v': version }).map((r) => [r.songId, r.category]))
  const debut = new Map()
  for (const r of all(db, DEBUT_SQL)) if (!debut.has(r.songId)) debut.set(r.songId, r.mix)
  const bpm = new Map()
  for (const r of all(db, BPM_SQL)) bpm.set(r.songId, [r.bpmMin, r.bpmMax]) // last row wins

  const songs = new Map()
  for (const s of all(db, SONGS_SQL)) {
    if (!ids.has(s.songId)) continue
    const rows = titles.get(s.songId) ?? []
    const ko = rows.find((t) => t.lang === 'kr')?.title ?? null
    const cat = category.get(s.songId)
    if (cat !== undefined && !(cat in CHANNEL_BY_CATEGORY)) throw new Error(`Unknown pumpout category "${cat}" (song ${s.songId})`)
    const mix = debut.get(s.songId)
    const series = SERIES_BY_MIX[mix]
    if (!series) throw new Error(`No series for debut mix "${mix}" (song ${s.songId} ${s.title}) — add it to SERIES_BY_MIX`)
    const cut = CUT_BY_NAME[s.cut]
    if (!cut) throw new Error(`Unknown cut "${s.cut}" (song ${s.songId})`)
    songs.set(s.songId, {
      id: s.songId,
      title: s.title,
      names: [s.title, ...rows.map((t) => t.title)],
      titleKo: ko && fold(ko) !== fold(s.title) ? ko : null,
      artist: artists.get(s.songId)?.join(' & ') ?? '',
      cut,
      channel: cat === undefined ? null : CHANNEL_BY_CATEGORY[cat],
      series,
      bpm: bpm.get(s.songId) ?? null,
    })
  }
  return songs
}
