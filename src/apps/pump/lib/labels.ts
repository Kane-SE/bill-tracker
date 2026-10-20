import type { Chart, Mode, SongType } from '@/apps/pump/data/types'

export const MODE_SHORT: Record<Mode, string> = { S: 'S', D: 'D', HDB: 'HD' }
export const MODE_LABEL: Record<Mode, string> = { S: 'Single', D: 'Double', HDB: 'Half-Double' }
export const SONG_TYPE_LABEL: Record<SongType, string> = {
  ARCADE: 'Arcade',
  SHORTCUT: 'Short Cut',
  REMIX: 'Remix',
  FULLSONG: 'Full Song',
}

export function levelLabel([from, to]: readonly [number, number]): string {
  return from === to ? `Lv ${from}` : `Lv ${from}–${to}`
}

export function modesLabel(modes: readonly Mode[]): string {
  return modes.map((m) => MODE_SHORT[m]).join(' or ')
}

/** Row line 2: artist · song type (only when not Arcade) · series. */
export function chartLine2(c: Chart): string {
  return [c.song.artist, c.song.type !== 'ARCADE' ? SONG_TYPE_LABEL[c.song.type] : null, c.song.series]
    .filter(Boolean)
    .join(' · ')
}

/** Chart sheet facts: song type · channel · series · BPM. (The step artist gets its own line.) */
export function chartFacts(c: Chart): string {
  const bpm = c.song.bpm
  const bpmText = bpm
    ? Math.round(bpm[0]) === Math.round(bpm[1])
      ? `${Math.round(bpm[0])} BPM`
      : `${Math.round(bpm[0])}–${Math.round(bpm[1])} BPM`
    : null
  return [SONG_TYPE_LABEL[c.song.type], c.song.channel, c.song.series, bpmText].filter(Boolean).join(' · ')
}

export function titleName(t: { track: string; lv: number }): string {
  return `${t.track} Lv.${t.lv}`
}

/** "1 chart", "4,448 charts". */
export function countLabel(n: number, noun: string): string {
  return `${n.toLocaleString('en')} ${noun}${n === 1 ? '' : 's'}`
}
