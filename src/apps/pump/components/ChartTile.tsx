import type { Chart, SkillId } from '@/apps/pump/data/types'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { RowIcons } from '@/apps/pump/components/ChartRow'
import { SongArt } from '@/apps/pump/components/SongArt'
import { cn } from '@/shared/lib/utils'

/** A grid row: a 148 px tile plus the 8 px gap below it. */
export const GRID_ROW_HEIGHT = 156

interface ChartTileProps {
  chart: Chart
  selectedSkills: readonly SkillId[]
  /** the chart unlocks a title the user has ticked */
  earned: boolean
  onOpen(id: number): void
}

/** One chart as a grid tile: 96 px of art with the level badge on it, then title and icons. */
export function ChartTile({ chart, selectedSkills, earned, onOpen }: ChartTileProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chart.id)}
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-left active:bg-secondary/60"
    >
      <span className="relative">
        <SongArt song={chart.song} className="h-[96px] w-full rounded-none ring-0" />
        <LevelBadge mode={chart.mode} level={chart.level} className={cn('absolute bottom-1 left-1', chart.mode !== 'D' && 'bg-background/85')} />
      </span>
      <span className="min-w-0 px-2 py-1">
        <span className="block truncate text-sm font-semibold">{chart.song.title}</span>
        <span className="flex h-5 items-center">
          <RowIcons chart={chart} selectedSkills={selectedSkills} earned={earned} />
        </span>
      </span>
    </button>
  )
}
