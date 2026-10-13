import type { Chart, Song } from '@/apps/pump/data/types'
import { fold } from '@/apps/pump/lib/normalize'

export function makeSong(over: Partial<Omit<Song, 'search'>> = {}): Song {
  const s = { title: 'Song', artist: 'Artist', type: 'ARCADE', series: 'XX', ...over } as Omit<Song, 'search'>
  return { ...s, search: fold([s.title, s.titleKo ?? '', s.artist].join(' ')) }
}

let nextId = 1

export function makeChart(over: Partial<Chart> = {}): Chart {
  return {
    id: nextId++,
    song: makeSong(),
    mode: 'S',
    level: 10,
    skills: [],
    badges: [],
    gimmickFrom: [],
    premium: false,
    steamLink: false,
    titleIds: [],
    ...over,
  }
}
