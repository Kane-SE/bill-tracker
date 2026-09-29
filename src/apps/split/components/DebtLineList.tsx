import { ArrowRight, Check } from 'lucide-react'
import type { DebtLine } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'

interface DebtLineListProps {
  lines: DebtLine[]
  readOnly?: boolean
  onToggle?: (line: DebtLine) => void
}

/** A Nomnom's "X owes Y" lines, each tickable as paid back. */
export function DebtLineList({ lines, readOnly, onToggle }: DebtLineListProps) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">All settled — nobody owes anything.</p>
  }
  return (
    <ul className="space-y-2">
      {lines.map((line) => {
        const isPaid = line.remaining === 0
        const isPartial = !isPaid && line.paid > 0
        return (
          <li key={`${line.from}->${line.to}`}>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onToggle?.(line)}
              aria-pressed={isPaid}
              aria-label={`${line.from} to ${line.to}: ${isPaid ? 'paid' : 'not paid'}`}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                isPaid ? 'bg-success/15' : 'bg-secondary/60',
                !readOnly && 'active:scale-[0.99]',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                  isPaid
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-muted-foreground/50',
                )}
              >
                {isPaid && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                <span className="truncate">{line.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{line.to}</span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    'block font-semibold tabular-nums',
                    isPaid ? 'text-muted-foreground line-through' : 'text-destructive',
                  )}
                >
                  {formatMoney(isPaid ? line.owed : line.remaining)}
                </span>
                {isPartial && (
                  <span className="block text-xs text-muted-foreground">
                    left · {formatMoney(line.paid)} paid
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
