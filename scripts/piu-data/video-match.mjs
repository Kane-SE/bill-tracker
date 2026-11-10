// Matches parsed NEVSISTER video titles to the charts in charts.json and
// encodes the picks as src/apps/pump/data/videos.json. See the spec:
// docs/features/2026-11-pump-chart-videos/spec.md › Matching rules.
import { MIXES, parseVideoTitle, songKeys } from './video-titles.mjs'
import { NEVSISTER } from './sources.mjs'

const MIN_LISTED = 10_000
const MIN_SD_COVERAGE = 0.95

const push = (map, key, value) => {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(value)
}

/** Song lookup: the exact key first, then any key, each only when it names one song. */
function songFinder(songs) {
  const exact = new Map()
  const loose = new Map()
  songs.forEach((s, si) => {
    const keys = songKeys(s.t)
    push(exact, `${keys[0]}|${s.y}`, si)
    for (const k of keys) push(loose, `${k}|${s.y}`, si)
  })
  const unique = (map, key) => {
    const hit = map.get(key)
    return hit && new Set(hit).size === 1 ? hit[0] : undefined
  }
  return (p) => {
    // titles never say REMIX, so an ARCADE-typed video may be a REMIX song
    const types = p.type === 'ARCADE' ? ['ARCADE', 'REMIX'] : [p.type]
    const keys = songKeys(p.song)
    for (const y of types) {
      const si = unique(exact, `${keys[0]}|${y}`)
      if (si !== undefined) return si
    }
    for (const k of keys) {
      for (const y of types) {
        const si = unique(loose, `${k}|${y}`)
        if (si !== undefined) return si
      }
    }
    return undefined
  }
}

/** Left or right half of a two-singles video: the lower level plays on the left. */
function sideOf(p, code) {
  if (p.codes.length !== 2 || p.codes.some((c) => c.mode !== 'S')) return undefined
  const other = p.codes.find((c) => c !== code)
  if (code.level < other.level) return 'L'
  if (code.level > other.level) return 'R'
  return undefined
}

/**
 * The best video for each chart of `file` (charts.json contents), from
 * `videos` in upload order, newest first.
 * @returns {{ picks: Map<number, { v: string, mix: string, side?: 'L'|'R', title: string }>, unknownSongs: Map<string, number>, parsed: number }}
 */
export function matchVideos(file, videos) {
  const findSong = songFinder(file.songs)
  const index = new Map() // `${song}|${era}|${mode}|${level}` -> [{ p, code, order }]
  const moved = new Set() // `${song}|${mode}|${level}`: an XX level a PHOENIX title says changed
  const unknownSongs = new Map()
  let parsed = 0

  videos.forEach((video, order) => {
    const p = parseVideoTitle(video.title)
    if (!p) return
    parsed++
    const si = findSong(p)
    if (si === undefined) {
      const key = `${p.song} [${p.type}]`
      unknownSongs.set(key, (unknownSongs.get(key) ?? 0) + 1)
      return
    }
    for (const code of p.codes) push(index, `${si}|${p.era}|${code.mode}|${code.level}`, { p, code, order, video })
    for (const m of p.moved) moved.add(`${si}|${m.mode}|${m.level}`)
  })

  const at = (si, era, mode, level) => index.get(`${si}|${era}|${mode}|${level}`) ?? []
  const picks = new Map()
  for (const c of file.charts) {
    const phoenixLevel = c.p ?? c.lv
    let cands = [...at(c.s, 'P2', c.m, c.lv), ...at(c.s, 'P1', c.m, phoenixLevel)]
    if (!cands.length && !moved.has(`${c.s}|${c.m}|${phoenixLevel}`)) cands = at(c.s, 'XX', c.m, phoenixLevel)
    if (!cands.length) continue
    const best = cands.sort((a, b) => a.p.rank - b.p.rank || a.p.codes.length - b.p.codes.length || a.order - b.order)[0]
    const side = sideOf(best.p, best.code)
    picks.set(c.id, { v: best.video.id, mix: best.p.mix, ...(side && { side }), title: best.video.title })
  }
  return { picks, unknownSongs, parsed }
}

/** Overrides: chart id → null (drop the pick) or { v, mix, side? } (replace it). */
export function applyOverrides(picks, overrides) {
  const out = new Map(picks)
  let applied = 0
  for (const [id, value] of Object.entries(overrides)) {
    if (value === null) out.delete(Number(id))
    else out.set(Number(id), { ...value, title: '(override)' })
    applied++
  }
  return { picks: out, applied }
}

/** Charts with a video, by mode. */
export function videoCoverage(file, picks) {
  const out = { S: { yes: 0, total: 0 }, D: { yes: 0, total: 0 }, HDB: { yes: 0, total: 0 } }
  for (const c of file.charts) {
    out[c.m].total++
    if (picks.has(c.id)) out[c.m].yes++
  }
  return out
}

/** Reasons not to write videos.json: the lister or the parser probably broke. */
export function checkVideos({ listed, coverage }) {
  const errors = []
  if (listed < MIN_LISTED) errors.push(`only ${listed} videos listed (need at least ${MIN_LISTED.toLocaleString('en')}); the lister may have broken`)
  const sd = (coverage.S.yes + coverage.D.yes) / (coverage.S.total + coverage.D.total)
  if (sd < MIN_SD_COVERAGE) errors.push(`singles + doubles coverage is ${(sd * 100).toFixed(1)} % (need ${MIN_SD_COVERAGE * 100} %); the parser or matcher may have broken`)
  return errors
}

/** The videos.json object: chart id → [video id, mix index] or [video id, mix index, side]. */
export function encodeVideos(picks, { builtAt, listed }) {
  const v = {}
  for (const id of [...picks.keys()].sort((a, b) => a - b)) {
    const p = picks.get(id)
    v[id] = p.side ? [p.v, MIXES.indexOf(p.mix), p.side] : [p.v, MIXES.indexOf(p.mix)]
  }
  return { meta: { builtAt, channel: NEVSISTER.name, url: NEVSISTER.url, listed }, mixes: MIXES, v }
}

/** JSON with one pick per line, so a rebuild's diff shows what changed. */
export function stringifyVideos(file) {
  const lines = Object.entries(file.v).map(([id, val]) => `${JSON.stringify(id)}:${JSON.stringify(val)}`)
  return `{"meta":${JSON.stringify(file.meta)},\n"mixes":${JSON.stringify(file.mixes)},\n"v":{\n${lines.join(',\n')}\n}}\n`
}
