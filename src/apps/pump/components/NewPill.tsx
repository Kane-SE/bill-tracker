import { cn } from '@/shared/lib/utils'

/** The gold NEW tag on a song new in this patch. The word carries the meaning; the gold only draws the eye. */
export function NewPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md bg-new px-1.5 py-0.5 text-[11px] font-bold leading-none tracking-wide text-new-foreground',
        className,
      )}
    >
      NEW
    </span>
  )
}
