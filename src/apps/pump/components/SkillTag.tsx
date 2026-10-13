import type { SkillId } from '@/apps/pump/data/types'
import { cn } from '@/shared/lib/utils'

export function SkillTag({ skill, active }: { skill: SkillId; active?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none',
        active ? 'bg-primary/20 text-foreground' : 'bg-secondary text-secondary-foreground',
      )}
    >
      {skill}
    </span>
  )
}
