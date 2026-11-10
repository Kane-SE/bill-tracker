// Reads NEVSISTER chart-video titles, e.g.
//   [PUMP IT UP PHOENIX] Sarabande (사라반드) D21 | RUN D LV.6 Title
// into the song, its chart codes and the mix the video was filmed in.

/** Display order; videos.json stores a mix as its index here. */
export const MIXES = ['PHOENIX 2', 'PHOENIX', 'RISE', 'XX']

/**
 * Title tags in match order. `rank` orders videos of one chart (lower wins);
 * `era` says which level the title's codes are in (P2 = current, P1 = PHOENIX,
 * XX = XX); `artist` marks "Artist - Song" titles.
 */
const TAGS = [
  { re: /^PUMP IT UP PHOENIX 2$/, rank: 0, mix: 'PHOENIX 2', era: 'P2' },
  { re: /^PUMP IT UP PHOENIX$/, pnx1: true, rank: 0.5, mix: 'PHOENIX 2', era: 'P2' },
  { re: /^펌프\s?잇\s?업 2026$/, rank: 1, mix: 'PHOENIX 2', era: 'P2', artist: true },
  { re: /^PUMP IT UP PHOENIX$/, rank: 2, mix: 'PHOENIX', era: 'P1' },
  { re: /^펌프\s?잇\s?업 202[34]$/, rank: 3, mix: 'PHOENIX', era: 'P1', artist: true },
  { re: /^PUMP IT UP RISE$/, rank: 4, mix: 'RISE', era: 'P2', hdOnly: true },
  { re: /^PUMP IT UP XX$/, rank: 5, mix: 'XX', era: 'XX' },
  { re: /^펌프\s?잇\s?업 20주년$/, rank: 6, mix: 'XX', era: 'XX', artist: true },
]

// A BGA-only video has no chart code, so it fails the code check below; a
// chart video may still mention its "BGA On" version in the notes.
const SKIP = /mirror pattern|\bcompare\b|random skin|random step|\b(sp|dp)\d|\bco-?op\b|\b[456]k\b|\?\?/i
const CODE = String.raw`(?:S|D|HDB|HD)\d{1,2}`
const CODE_GROUP = new RegExp(String.raw`(?:^|\s)(${CODE}(?:\s*&\s*${CODE})*)(?=\s|$|\(|\|)`)
const PNX1 = /\bPNX1\s/
const MOVED = /\b(?:XX|pre)\s+(S|D)(\d{1,2})\b/g

/**
 * The song, chart codes and mix of one video title, or null when the title
 * isn't a single-chart showcase we can use (play sessions, mirror, BGA,
 * co-op, random step, gimmick compares, EZ2ON keys, unknown levels).
 */
export function parseVideoTitle(title) {
  const m = title.match(/^\s*\[([^\]]+)\]\s*(.*)$/)
  if (!m) return null
  const [tagText, rest] = [m[1].trim(), m[2]]
  const tag = TAGS.find((t) => t.re.test(tagText) && (!t.pnx1 || PNX1.test(rest)))
  if (!tag) return null

  const head = rest.split(/\s\|\s/)[0]
  if (SKIP.test(head)) return null
  const group = head.match(CODE_GROUP)
  if (!group) return null

  let codes = group[1].split('&').map((c) => {
    const [, mode, level] = c.trim().match(/^(HDB|HD|S|D)(\d+)$/)
    return { mode: mode.startsWith('HD') ? 'HDB' : mode, level: Number(level) }
  })
  if (tag.hdOnly) codes = codes.filter((c) => c.mode === 'HDB')
  if (!codes.length) return null

  let song = head.slice(0, group.index).trim()
  if (tag.artist) song = song.replace(/^.*?\s-\s/, '')
  const type = /-\s*SHORT CUT\s*-/i.test(song) ? 'SHORTCUT' : /-\s*FULL SONG\s*-/i.test(song) ? 'FULLSONG' : 'ARCADE'
  song = song.replace(/-\s*(SHORT CUT|FULL SONG)\s*-/i, ' ').replace(/\s+/g, ' ').trim()

  const moved = tag.era === 'P1' ? [...rest.matchAll(MOVED)].map((x) => ({ mode: x[1], level: Number(x[2]) })) : []
  return { song, type, codes, mix: tag.mix, era: tag.era, rank: tag.rank, moved }
}

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/
const BRACKETS = /\s*[(（〈<~[][^()（）〈〉<>~[\]]*[)）〉>~\]]/g
const ROUND = /[(（]([^()（）]*)[)）]/g
const TYPE_WORDS = /\s*-?\s*\b(full song( mix)?|short cut|remix)\b\s*-?\s*$/i
const FEAT = /\s(?:ft\.|feat\.|feat\s).*$/i

const squash = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * Match keys for a song title, strictest first; [0] is the exact key. Looser
 * keys drop type words, brackets and feat./ft. credits; each Latin round
 * bracket is a key of its own (조깅(Jogging) → jogging).
 */
export function songKeys(title) {
  const keys = []
  const add = (s) => {
    const k = squash(s)
    if (k && !keys.includes(k)) keys.push(k)
  }
  const noKorean = title.replace(BRACKETS, (b) => (HANGUL.test(b) ? ' ' : b))
  add(noKorean)
  add(noKorean.replace(TYPE_WORDS, ''))
  const bare = title.replace(BRACKETS, ' ')
  add(bare)
  add(bare.replace(FEAT, ''))
  add(bare.replace(FEAT, '').replace(TYPE_WORDS, ''))
  for (const [, inner] of title.matchAll(ROUND)) if (!HANGUL.test(inner)) add(inner)
  return keys
}
