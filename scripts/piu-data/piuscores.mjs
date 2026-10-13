export const COVERAGE_PREFIX = 'pc:badge_fraction:'
const REQUIRED = ['Song', 'Type', 'Level', 'SongType', 'Badges']

/** Small RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF, optional BOM. */
export function parseCsv(text) {
  const s = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** PIU Scores chart export → one record per Single/Double chart. */
export function readPiuScores(text) {
  const [header, ...body] = parseCsv(text)
  const missing = REQUIRED.filter((h) => !header.includes(h))
  if (missing.length) throw new Error(`PIU Scores CSV is missing columns: ${missing.join(', ')}`)
  if (!header.some((h) => h.startsWith(COVERAGE_PREFIX))) {
    throw new Error('PIU Scores CSV has no skill coverage columns (add SkillEmphasis to Columns=)')
  }
  const at = Object.fromEntries(header.map((h, i) => [h, i]))
  const out = []
  for (const r of body) {
    const mode = r[at.Type]
    if (mode !== 'S' && mode !== 'D') continue
    const coverage = {}
    header.forEach((h, i) => {
      if (h.startsWith(COVERAGE_PREFIX) && r[i] !== undefined && r[i] !== '') {
        coverage[h.slice(COVERAGE_PREFIX.length)] = Number(r[i])
      }
    })
    out.push({
      song: r[at.Song],
      mode,
      level: Number(r[at.Level]),
      songType: r[at.SongType],
      badges: (r[at.Badges] ?? '').split(';').map((b) => b.trim()).filter(Boolean),
      coverage,
    })
  }
  return out
}
