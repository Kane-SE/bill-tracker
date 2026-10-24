import type { Filters, Removal } from '@/apps/pump/lib/filters'
import { Button } from '@/shared/ui/button'

/** No charts match: offer the removals that would bring charts back, with counts. */
export function EmptyResults({ suggestions, onApply, onClear }: { suggestions: Removal[]; onApply(f: Filters): void; onClear(): void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
      <p className="font-medium">No charts match.</p>
      {suggestions.map((s) => (
        <Button key={s.label} variant="outline" className="justify-between" onClick={() => onApply(s.next)}>
          <span className="truncate">Remove {s.label}</span>
          <span className="tabular-nums text-muted-foreground">→ {s.count.toLocaleString()} charts</span>
        </Button>
      ))}
      <Button variant="ghost" onClick={onClear}>
        Clear all
      </Button>
    </div>
  )
}
