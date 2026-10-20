import { Gem, Trophy } from 'lucide-react'
import type { Chart, SkillId } from '@/apps/pump/data/types'
import { chartLine2 } from '@/apps/pump/lib/labels'
import { rowSkills } from '@/apps/pump/lib/order'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { SkillTag } from '@/apps/pump/components/SkillTag'
import { cn } from '@/shared/lib/utils'

export const ROW_HEIGHT = 64

interface ChartRowProps {
  chart: Chart
  selectedSkills: readonly SkillId[]
  /** the chart unlocks a title the user has ticked */
  earned: boolean
  onOpen(id: number): void
}

/** One chart: the whole 64 px row opens the chart sheet. */
export function ChartRow({ chart, selectedSkills, earned, onOpen }: ChartRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chart.id)}
      className="flex h-16 w-full items-center gap-3 border-b border-border text-left active:bg-secondary/60"
    >
      <LevelBadge mode={chart.mode} level={chart.level} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{chart.song.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{chartLine2(chart)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {rowSkills(chart, selectedSkills).map((s) => (
          <SkillTag key={s} skill={s} active={selectedSkills.includes(s)} />
        ))}
        {chart.titleIds.length > 0 && (
          <Trophy className={cn('h-4 w-4', earned ? 'text-primary' : 'text-muted-foreground')} aria-label={earned ? 'Title chart, earned' : 'Title chart'} />
        )}
        {chart.premium && <Gem className="h-4 w-4 text-muted-foreground" aria-label="Premium mode only" />}
      </span>
    </button>
  )
}
