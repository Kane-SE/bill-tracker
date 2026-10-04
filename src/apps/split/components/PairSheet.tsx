import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { computePairBreakdown } from '@/apps/split/lib/calc'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'
import type { Debt, Night } from '@/apps/split/types'

interface PairSheetProps {
  debt: Debt | null // null = closed
  nights: Night[] // active Nomnoms
  onOpenChange: (open: boolean) => void
  onResolve: (debt: Debt) => void
}

/** Bottom sheet: which Nomnoms make up one home balance row. */
export function PairSheet({ debt, nights, onOpenChange, onResolve }: PairSheetProps) {
  const navigate = useNavigate()
  const breakdown = useMemo(
    () => (debt ? computePairBreakdown(nights, debt.from, debt.to) : null),
    [debt, nights],
  )
  const count = breakdown ? new Set(breakdown.entries.map((e) => e.nightId)).size : 0

  return (
    <Dialog open={debt != null} onOpenChange={onOpenChange}>
      <DialogContent>
        {debt && breakdown && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {debt.from} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {debt.to}
              </DialogTitle>
              <DialogDescription>
                {debt.from} owes {debt.to}{' '}
                <span className="font-semibold text-destructive">{formatMoney(debt.amount)}</span> across{' '}
                {count} {count === 1 ? 'Nomnom' : 'Nomnoms'}
              </DialogDescription>
            </DialogHeader>

            <ul className="space-y-2">
              {breakdown.entries.map((e) => (
                <li key={`${e.nightId}:${e.lineFrom}>${e.lineTo}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      navigate(`/split/night/${e.nightId}`)
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md bg-secondary/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {e.title} <span className="text-xs font-normal text-muted-foreground">· {formatDate(e.date)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {e.lineFrom} <ArrowRight className="h-3 w-3" /> {e.lineTo}
                        {e.lineFrom !== debt.from && ' · other way'}
                      </span>
                    </span>
                    <span className={cn('shrink-0 font-semibold tabular-nums', e.contribution > 0 ? 'text-destructive' : 'text-success')}>
                      {e.contribution > 0 ? '+' : '−'}
                      {formatMoney(Math.abs(e.contribution))}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>

            {breakdown.settledCount > 0 && (
              <p className="text-xs text-muted-foreground">+{breakdown.settledCount} already paid</p>
            )}

            <div className="flex justify-between border-t border-dashed border-border pt-3 font-semibold">
              <span>Net</span>
              <span className="tabular-nums text-destructive">{formatMoney(debt.amount)}</span>
            </div>

            <Button variant="success" size="lg" className="w-full" onClick={() => onResolve(debt)}>
              <CheckCircle2 className="h-5 w-5" />
              Resolve {debt.from} → {debt.to}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
