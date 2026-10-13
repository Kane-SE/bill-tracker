import type { Mode } from '@/apps/pump/data/types'
import { MODE_SHORT } from '@/apps/pump/lib/labels'
import { cn } from '@/shared/lib/utils'

/** "S19" / "D19" / "HD19". Mode shows by letter and shape (outline, fill, dashed), never colour alone. */
export function LevelBadge({ mode, level, className }: { mode: Mode; level: number; className?: string }) {
  return (
    <span
      className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[13px] font-bold tabular-nums',
        mode === 'S' && 'border-2 border-primary text-foreground',
        mode === 'D' && 'bg-primary text-primary-foreground',
        mode === 'HDB' && 'border-2 border-dashed border-primary text-foreground',
        className,
      )}
    >
      {MODE_SHORT[mode]}
      {level}
    </span>
  )
}
