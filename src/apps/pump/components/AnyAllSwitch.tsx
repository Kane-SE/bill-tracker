import { cn } from '@/shared/lib/utils'

/** Skills combine with "any of" (OR) or "all of" (AND). */
export function AnyAllSwitch({ all, onChange }: { all: boolean; onChange(all: boolean): void }) {
  return (
    <div role="group" aria-label="Combine skills" className="inline-flex rounded-lg border border-border p-0.5">
      {[false, true].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={all === v}
          onClick={() => onChange(v)}
          className={cn('h-10 rounded-md px-3 text-sm', all === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
        >
          {v ? 'all of' : 'any of'}
        </button>
      ))}
    </div>
  )
}
