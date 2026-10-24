import { Check } from 'lucide-react'
import type { Title } from '@/apps/pump/data/types'
import { titleName } from '@/apps/pump/lib/labels'
import { cn } from '@/shared/lib/utils'

/** 44×44 tick for "I have earned this title". */
export function EarnedToggle({ title, earned, onToggle }: { title: Title; earned: boolean; onToggle(id: string): void }) {
  return (
    <button
      type="button"
      aria-pressed={earned}
      aria-label={`Earned ${titleName(title)}`}
      onClick={() => onToggle(title.id)}
      className="grid h-11 w-11 shrink-0 place-items-center"
    >
      <span
        className={cn(
          'grid h-6 w-6 place-items-center rounded-md border-2',
          earned ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60',
        )}
      >
        {earned && <Check className="h-4 w-4" aria-hidden />}
      </span>
    </button>
  )
}
