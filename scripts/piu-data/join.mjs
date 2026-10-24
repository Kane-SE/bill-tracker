import { fold } from './fold.mjs'

/** CSV title → pumpout title, for the two songs whose names differ beyond punctuation. */
export const ALIASES = new Map([
  [fold('X-Tream'), fold('X Treme')],
  [fold('Love is a Danger Zone 2 Try To B.P.M'), fold('Love is a danger zone (try to B.P.M.)')],
])

const SUFFIX = /\s*-\s*(SHORT CUT|FULL SONG|REMIX)\s*-\s*$/i
const SUFFIX_CUT = { 'short cut': 'SHORTCUT', 'full song': 'FULLSONG', remix: 'REMIX' }
const CSV_CUT = { Arcade: 'ARCADE', ShortCut: 'SHORTCUT', Remix: 'REMIX', FullSong: 'FULLSONG' }

/** A CSV title → its folded join key, plus the cut named by a "- SHORT CUT -" style suffix. */
export function titleKey(title) {
  const m = title.match(SUFFIX)
  const key = fold(title.replace(SUFFIX, ''))
  return { key: ALIASES.get(key) ?? key, cut: m ? SUFFIX_CUT[m[1].toLowerCase()] : null }
}

/**
 * Attach PIU Scores rows to pumpout S/D charts on title + cut + mode + level.
 * Exact title first, then a unique prefix match; a chart pumpout left unrated
 * ("??") matches on title + cut + mode alone.
 */
export function joinCoverage(charts, songs, rows) {
  const keys = new Map([...songs].map(([id, s]) => [id, s.names.map(fold)]))
  const index = new Map()
  for (const c of charts) {
    if (c.mode === 'HDB') continue
    const k = `${songs.get(c.songId).cut}|${c.mode}|${c.level ?? '?'}`
    if (!index.has(k)) index.set(k, [])
    index.get(k).push(c)
  }
  const byChart = new Map()
  const unmatched = []
  for (const row of rows) {
    const { key, cut: suffixCut } = titleKey(row.song)
    const cut = suffixCut ?? CSV_CUT[row.songType]
    const pick = (level) => {
      const cands = index.get(`${cut}|${row.mode}|${level}`) ?? []
      const exact = cands.filter((c) => keys.get(c.songId).includes(key))
      if (exact.length) return exact.length === 1 ? exact[0] : null
      const prefix = cands.filter((c) => keys.get(c.songId).some((n) => n && (key.startsWith(n) || n.startsWith(key))))
      return prefix.length === 1 ? prefix[0] : null
    }
    const hit = pick(row.level) ?? pick('?')
    if (hit && !byChart.has(hit.id)) byChart.set(hit.id, row)
    else unmatched.push(row)
  }
  return { byChart, unmatched }
}
