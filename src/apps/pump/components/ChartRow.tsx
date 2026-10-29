import { Gem, Trophy } from 'lucide-react'
import type { Chart, SkillId } from '@/apps/pump/data/types'
import { chartLine2 } from '@/apps/pump/lib/labels'
import { rowSkills } from '@/apps/pump/lib/order'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { SongArt } from '@/apps/pump/components/SongArt'
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

interface RowIconsProps {
  chart: Chart
  selectedSkills: readonly SkillId[]
  earned: boolean
  className?: string
}

/** A chart's skill tags, trophy and gem; draws nothing (no empty box) when it has none. */
export function RowIcons({ chart, selectedSkills, earned, className }: RowIconsProps) {
  const skills = rowSkills(chart, selectedSkills)
  if (skills.length === 0 && chart.titleIds.length === 0 && !chart.premium) return null
  return (
    <span className={cn('flex shrink-0 items-center gap-1', className)}>
      {skills.map((s) => (
        <SkillTag key={s} skill={s} active={selectedSkills.includes(s)} />
      ))}
      {chart.titleIds.length > 0 && (
        <Trophy className={cn('h-4 w-4', earned ? 'text-primary' : 'text-muted-foreground')} aria-label={earned ? 'Title chart, earned' : 'Title chart'} />
      )}
      {chart.premium && <Gem className="h-4 w-4 text-muted-foreground" aria-label="Premium mode only" />}
    </span>
  )
}

/** One chart: the whole 64 px row opens the chart sheet. Song art fades in on the right. */
export function ChartRow({ chart, selectedSkills, earned, onOpen }: ChartRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chart.id)}
      className="relative flex h-16 w-full items-center gap-3 overflow-hidden border-b border-border text-left active:bg-secondary/60"
    >
      <span aria-hidden className="absolute inset-y-0 right-0 w-3/5">
        <SongArt song={chart.song} fallback={null} className="h-full w-full rounded-none ring-0" />
        <span className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10" />
      </span>
      <LevelBadge mode={chart.mode} level={chart.level} className="relative" />
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{chart.song.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{chartLine2(chart)}</span>
      </span>
      <RowIcons chart={chart} selectedSkills={selectedSkills} earned={earned} className="relative rounded-md bg-background/85 px-1" />
    </button>
  )
}
