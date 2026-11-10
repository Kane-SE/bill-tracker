import { useEffect, useState } from 'react'
import type { ChartVideo } from '@/apps/pump/data/types'
import { loadVideos } from '@/apps/pump/data/videos'

/**
 * The chart's NEVSISTER video, once videos.json has loaded. Undefined while
 * loading, when the chart has none, or when loading failed (opening another
 * chart tries again).
 */
export function useChartVideo(chartId: number | undefined): ChartVideo | undefined {
  const [videos, setVideos] = useState<Map<number, ChartVideo>>()
  useEffect(() => {
    if (chartId === undefined || videos) return
    let live = true
    loadVideos().then(
      (loaded) => live && setVideos(loaded),
      () => {}, // no link this time; the sheet works without it
    )
    return () => {
      live = false
    }
  }, [chartId, videos])
  return chartId === undefined ? undefined : videos?.get(chartId)
}
