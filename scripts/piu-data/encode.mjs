import { COMPUTED_SKILLS, SKILLS, skillScore } from './skills.mjs'

const MODE_SHORT = { S: 'S', D: 'D', HDB: 'HD' }

/** Build the compact charts.json object. Short keys keep the file under the 600 KB budget. */
export function encodeCatalog({ songs, charts, byChart, skillsById, gimmickFrom, titles, meta }) {
  const warnings = []
  const sorted = [...charts].sort((a, b) => a.id - b.id)
  const songIds = [...new Set(sorted.map((c) => c.songId))]
  const songIndex = new Map(songIds.map((id, i) => [id, i]))
  const badgeNames = [...new Set(sorted.flatMap((c) => byChart.get(c.id)?.badges ?? []))].sort()
  const stepArtists = [...new Set(sorted.map((c) => c.stepArtist).filter(Boolean))].sort()

  const outCharts = sorted.map((c) => {
    const row = byChart.get(c.id)
    let lv = c.level
    if (lv == null && row) {
      lv = row.level
      warnings.push(`${songs.get(c.songId).title} ${MODE_SHORT[c.mode]}: no pumpout level, using PIU Scores ${MODE_SHORT[c.mode]}${lv}`)
    }
    const skills = skillsById.get(c.id) ?? new Set()
    const out = { id: c.id, s: songIndex.get(c.songId), m: c.mode, lv }
    if (c.prevLevel != null) out.p = c.prevLevel
    out.sk = SKILLS.reduce((mask, s, i) => (skills.has(s) ? mask | (1 << i) : mask), 0)
    if (row) {
      out.cov = COMPUTED_SKILLS.map((s) => Math.round(skillScore(row.coverage, s) * 100))
      if (row.badges.length) out.b = row.badges.map((b) => badgeNames.indexOf(b))
    }
    const g = gimmickFrom.get(c.id)
    if (g) out.g = g
    const f = (c.premium ? 1 : 0) | (c.steamLink ? 2 : 0)
    if (f) out.f = f
    if (c.stepArtist) out.by = stepArtists.indexOf(c.stepArtist)
    return out
  })

  const outSongs = songIds.map((id) => {
    const s = songs.get(id)
    const out = { t: s.title }
    if (s.titleKo) out.k = s.titleKo
    out.a = s.artist
    out.y = s.cut
    if (s.channel) out.ch = s.channel
    out.se = s.series
    if (s.bpm) out.bpm = s.bpm
    if (s.card) out.i = [s.card.host, s.card.file]
    else warnings.push(`no song art: ${s.title}`)
    return out
  })

  return {
    file: { meta: { ...meta, badgeNames, stepArtists }, songs: outSongs, charts: outCharts, titles },
    warnings,
  }
}

/** JSON with one array element per line, so a data refresh diffs readably in git. */
export function stringifyCatalog(file) {
  const arr = (items) => `[\n${items.map((x) => JSON.stringify(x)).join(',\n')}\n]`
  return `{\n"meta": ${JSON.stringify(file.meta)},\n"songs": ${arr(file.songs)},\n"charts": ${arr(file.charts)},\n"titles": ${arr(file.titles)}\n}\n`
}
