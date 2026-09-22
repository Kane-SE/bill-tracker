import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatMoney } from '@/apps/split/lib/format'
import { shareRemainder } from '@/apps/split/lib/calc'
import type { Item } from '@/apps/split/types'

interface ItemRowProps {
  item: Item
  readOnly?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ItemRow({ item, readOnly, onEdit, onDelete }: ItemRowProps) {
  const others = item.shares.filter((s) => s.name !== item.payer && s.amount > 0)
  const remainder = shareRemainder(item)

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.payer}</span> paid{' '}
            {formatMoney(item.amount)}
          </p>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit item">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
              aria-label="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
          {others.map((s) => (
            <li key={s.name} className="flex justify-between text-muted-foreground">
              <span>{s.name} owes</span>
              <span className="tabular-nums">{formatMoney(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {remainder !== 0 && (
        <p className="mt-2 text-xs text-destructive">
          {remainder > 0
            ? `${formatMoney(remainder)} of this item isn't assigned to anyone.`
            : `Shares exceed the total by ${formatMoney(-remainder)}.`}
        </p>
      )}
    </div>
  )
}
