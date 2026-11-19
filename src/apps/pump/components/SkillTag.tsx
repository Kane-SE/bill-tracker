import type { SkillId } from '@/apps/pump/data/types'
import { cn } from '@/shared/lib/utils'

/** A skill tag; `pct` appends the chart's coverage, e.g. "run 67%". */
export function SkillTag({ skill, active, pct }: { skill: SkillId; active?: boolean; pct?: number }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-xs font-medium leading-none',
        // The secondary fill alone is ~1.2:1 against the page and card, so each tag gets a 3:1 edge.
        active ? 'bg-primary/20 text-foreground ring-1 ring-inset ring-primary' : 'bg-secondary text-secondary-foreground ring-1 ring-inset ring-foreground/40',
      )}
    >
      {skill}
      {pct !== undefined && <span className="tabular-nums">{pct}%</span>}
    </span>
  )
}
