import type { SkillId } from '@/apps/pump/data/types'
import { cn } from '@/shared/lib/utils'

export function SkillTag({ skill, active }: { skill: SkillId; active?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-xs font-medium leading-none',
        // The secondary fill alone is ~1.2:1 against the page and card, so each tag gets a 3:1 edge.
        active ? 'bg-primary/20 text-foreground ring-1 ring-inset ring-primary' : 'bg-secondary text-secondary-foreground ring-1 ring-inset ring-foreground/40',
      )}
    >
      {skill}
    </span>
  )
}
