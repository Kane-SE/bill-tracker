import { ArrowRight, ChevronRight } from 'lucide-react'
import type { Debt } from '@/apps/split/types'
import { formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'

interface BalanceListProps {
  debts: Debt[]
  className?: string
  /** When set, rows become buttons that open the pair's details. */
  onSelect?: (debt: Debt) => void
  subtitle?: (debt: Debt) => string
}

/** Renders netted "X owes Y amount" rows. */
export function BalanceList({ debts, className, onSelect, subtitle }: BalanceListProps) {
  if (debts.length === 0) {
    return <p className="text-sm text-muted-foreground">All settled — nobody owes anything.</p>
  }
  return (
    <ul className={cn('space-y-2', className)}>
      {debts.map((d) => {
        const body = (
          <>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span className="truncate">{d.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.to}</span>
              </div>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle(d)}</p>}
            </div>
            <span className="flex shrink-0 items-center gap-1">
              <span className="font-semibold tabular-nums text-destructive">{formatMoney(d.amount)}</span>
              {onSelect && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          </>
        )
        const rowClass = 'flex w-full items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2.5 text-left'
        return (
          <li key={`${d.from}->${d.to}`}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(d)} className={cn(rowClass, 'min-h-11 transition-colors hover:bg-secondary active:scale-[0.99]')}>
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
