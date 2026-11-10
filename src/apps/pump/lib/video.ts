import type { Chart, ChartVideo } from '@/apps/pump/data/types'
import { MODE_SHORT } from '@/apps/pump/lib/labels'

/** The YouTube watch page; on a phone it opens in the YouTube app. */
export function videoUrl(video: ChartVideo): string {
  return `https://www.youtube.com/watch?v=${video.id}`
}

/** "Watch D21 on YouTube · NEVSISTER · PHOENIX", plus " · left side" on a two-chart video. */
export function videoCaption(chart: Pick<Chart, 'mode' | 'level'>, video: ChartVideo): string {
  return [`Watch ${MODE_SHORT[chart.mode]}${chart.level} on YouTube`, 'NEVSISTER', video.mix, video.side && `${video.side} side`]
    .filter(Boolean)
    .join(' · ')
}
