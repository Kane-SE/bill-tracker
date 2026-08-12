import * as React from 'react'
import { Lock, LockOpen, SplitSquareHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { redistribute, type SplitRow } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'
import type { Item } from '@/apps/split/types'

export type ItemDraft = Omit<Item, 'id'>

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: string[]
  initial?: Item
  onSubmit: (draft: ItemDraft) => void
}

/**
 * Add or edit an item with per-person locking. Splitting starts equal; editing
 * a person's amount "locks" them, and everyone still on auto re-splits the
 * remaining total live (see `redistribute` in lib/calc). "Split equally"
 * unlocks everyone again.
 */
export function ItemDialog({ open, onOpenChange, participants, initial, onSubmit }: ItemDialogProps) {
  const [label, setLabel] = React.useState('')
  const [payer, setPayer] = React.useState('')
  const [amount, setAmount] = React.useState(0)
  const [rows, setRows] = React.useState<SplitRow[]>([])

  // Reset the form whenever the dialog opens.
  React.useEffect(() => {
    if (!open) return
    if (initial) {
      setLabel(initial.label)
      setPayer(initial.payer)
      setAmount(initial.amount)
      // Saved amounts load as locked so they display exactly as stored.
      const byName = new Map(initial.shares.map((s) => [s.name, s.amount]))
      setRows(
        participants.map((name) => ({
          name,
          included: byName.has(name),
          locked: byName.has(name),
          amount: byName.get(name) ?? 0,
        })),
      )
    } else {
      setLabel('')
      setPayer(participants[0] ?? '')
      setAmount(0)
      setRows(
        redistribute(
          participants.map((name) => ({ name, included: true, locked: false, amount: 0 })),
          0,
        ),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const included = rows.filter((r) => r.included)
  const sharesTotal = included.reduce((acc, r) => acc + r.amount, 0)
  const remainder = amount - sharesTotal
  const canSave = payer !== '' && amount > 0 && included.length > 0

  function apply(next: SplitRow[], nextAmount = amount) {
    setRows(redistribute(next, nextAmount))
  }

  function onAmountChange(next: number) {
    setAmount(next)
    apply(rows, next)
  }

  function toggleInclude(name: string) {
    apply(
      rows.map((r) =>
        r.name === name
          ? { ...r, included: !r.included, locked: false, amount: 0 }
          : r,
      ),
    )
  }

  function editAmount(name: string, value: number) {
    // Editing locks this person; auto people re-split around them.
    apply(rows.map((r) => (r.name === name ? { ...r, included: true, locked: true, amount: value } : r)))
  }

  function toggleLock(name: string) {
    apply(rows.map((r) => (r.name === name ? { ...r, locked: !r.locked } : r)))
  }

  function splitEqually() {
    apply(rows.map((r) => ({ ...r, locked: false })))
  }

  function submit() {
    if (!canSave) return
    onSubmit({
      label: label.trim() || 'Item',
      payer,
      amount,
      shares: included.map((r) => ({ name: r.name, amount: r.amount })),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit item' : 'Add item'}</DialogTitle>
          <DialogDescription>Who paid, how much, and how it splits.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-label">Description</Label>
            <Input
              id="item-label"
              value={label}
              placeholder="e.g. Dinner, Destination X"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-payer">Paid by</Label>
              <Select value={payer} onValueChange={setPayer}>
                <SelectTrigger id="item-payer">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-amount">Total paid</Label>
              <MoneyInput id="item-amount" value={amount} onChange={onAmountChange} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split between</Label>
              <Button type="button" variant="ghost" size="sm" onClick={splitEqually}>
                <SplitSquareHorizontal className="h-4 w-4" />
                Split equally
              </Button>
            </div>

            <div className="space-y-1.5">
              {rows.map((r) => (
                <div
                  key={r.name}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors',
                    r.included ? 'border-border bg-secondary/40' : 'border-transparent opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={r.included}
                    onChange={() => toggleInclude(r.name)}
                    className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
                    aria-label={`Include ${r.name}`}
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {r.name}
                    {r.name === payer && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(payer)</span>
                    )}
                  </span>
                  {r.included && (
                    <button
                      type="button"
                      onClick={() => toggleLock(r.name)}
                      className={cn(
                        'shrink-0 rounded-md p-1.5 transition-colors',
                        r.locked
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-muted-foreground hover:bg-secondary',
                      )}
                      aria-label={r.locked ? `Unlock ${r.name} (back to auto-split)` : `Lock ${r.name}`}
                      title={r.locked ? 'Edited — tap to auto-split' : 'Auto-split'}
                    >
                      {r.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                    </button>
                  )}
                  <div className="w-28 shrink-0">
                    <MoneyInput
                      value={r.amount}
                      onChange={(v) => editAmount(r.name, v)}
                      className="h-9"
                    />
                  </div>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground">Add people to the night first.</p>
              )}
            </div>

            {included.length > 0 && remainder !== 0 && (
              <p className={cn('text-xs', remainder > 0 ? 'text-muted-foreground' : 'text-destructive')}>
                {remainder > 0
                  ? `Unassigned: ${formatMoney(remainder)} — every person is locked; unlock someone or tap “Split equally”.`
                  : `Over by ${formatMoney(-remainder)} — locked shares exceed the total.`}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            {initial ? 'Save changes' : 'Add item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
