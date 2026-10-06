import type { Stage } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

export const STAGE_LABEL: Record<Stage, string> = {
  idea: 'Idea',
  exploring: 'Exploring',
  building: 'Building',
  shipped: 'Shipped',
  dropped: 'Dropped',
}

const DOT: Record<Stage, string> = {
  building: 'bg-success',
  exploring: 'bg-primary',
  idea: 'bg-muted-foreground',
  shipped: 'bg-muted-foreground',
  dropped: 'bg-muted-foreground',
}

/** Neutral pill + colored dot: readable in every palette (colored text badges fail contrast in light themes). */
export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[stage])} aria-hidden />
      {STAGE_LABEL[stage]}
    </span>
  )
}
