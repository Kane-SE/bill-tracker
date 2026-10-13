import { TRACKS, type Title, type Track } from '@/apps/pump/data/types'

export interface TrackView {
  track: Track
  titles: Title[]
  earned: number
  /** first title not yet earned, or null when the track is complete */
  next: Title | null
}

/** The Titles tab: every track in official order, Lv.1 → 10. */
export function trackViews(titles: readonly Title[], earned: ReadonlySet<string>): TrackView[] {
  return TRACKS.map((track) => {
    const list = titles.filter((t) => t.track === track).sort((a, b) => a.lv - b.lv)
    return {
      track,
      titles: list,
      earned: list.filter((t) => earned.has(t.id)).length,
      next: list.find((t) => !earned.has(t.id)) ?? null,
    }
  })
}

/** Earned titles that still exist in the data (stored ids from older data are ignored, not deleted). */
export function earnedCount(titles: readonly Title[], earned: ReadonlySet<string>): number {
  return titles.filter((t) => earned.has(t.id)).length
}
