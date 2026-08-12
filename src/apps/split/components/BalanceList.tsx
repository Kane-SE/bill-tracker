import { ArrowRight } from 'lucide-react'
import type { Debt } from '@/apps/split/types'
import { formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'

interface BalanceListProps {
  debts: Debt[]
  className?: string
}

/** Renders netted "X owes Y amount" rows. */
export function BalanceList({ debts, className }: BalanceListProps) {
  if (debts.length === 0) {
    return <p className="text-sm text-muted-foreground">All settled â€” nobody owes anything.</p>
  }
  return (
    <ul className={cn('space-y-2', className)}>
      {debts.map((d) => (
        <li
          key={`${d.from}->${d.to}`}
          className="flex items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="truncate">{d.from}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{d.to}</span>
          </div>
          <span className="shrink-0 font-semibold tabular-nums text-destructive">
            {formatMoney(d.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}
