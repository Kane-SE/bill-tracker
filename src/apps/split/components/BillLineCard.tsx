import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { Combobox } from '@/shared/components/Combobox'
import { cn } from '@/shared/lib/utils'
import { formatMoney } from '@/apps/split/lib/format'
import {
  lineShares,
  setLineAmount,
  toggleEveryone,
  toggleLinePerson,
  type DraftLine,
} from '@/apps/split/lib/billDraft'

interface BillLineCardProps {
  line: DraftLine
  /** Everyone on the bill, in bill order. */
  billPeople: string[]
  knownNames: string[]
  /** Half-filled line that blocks Done. */
  invalid?: boolean
  /** Why Adjust is unavailable right now (e.g. no payer yet); disables the button and shows this hint. */
  adjustDisabledHint?: string
  /** 1000 when the bill shows thousands. */
  unit?: 1 | 1000
  onChange: (line: DraftLine) => void
  /** Adds the name to the bill (reusing a case-insensitive match) and returns the name that was picked. */
  onAddPerson: (raw: string) => string
  onAdjust: () => void
  onRemove: () => void
}

const chipBase = 'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors'
const chipOn = 'border-primary bg-primary text-primary-foreground'
const chipOff = 'border-border bg-background text-foreground hover:bg-secondary'

/** One draft line of the tagging screen: label, amount, who shared it, and its split. */
export function BillLineCard({
  line,
  billPeople,
  knownNames,
  invalid,
  adjustDisabledHint,
  unit = 1,
  onChange,
  onAddPerson,
  onAdjust,
  onRemove,
}: BillLineCardProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  // A change that cleared an adjusted split says so until the next change.
  const [wasReset, setWasReset] = useState(false)

  function change(next: DraftLine) {
    setWasReset(!!line.shares && !next.shares)
    onChange(next)
  }

  const everyone = billPeople.length > 0 && billPeople.every((p) => line.people.includes(p))
  const suggestions = knownNames.filter((n) => !billPeople.some((p) => p.toLowerCase() === n.toLowerCase()))

  function pickNew(raw: string) {
    const name = onAddPerson(raw)
    if (name) {
      if (!line.people.includes(name)) {
        const order = billPeople.includes(name) ? billPeople : [...billPeople, name]
        change(toggleLinePerson(line, name, order))
      }
    }
    setAdding(false)
    setNewName('')
  }

  const shares = lineShares(line)
  const canAdjust = line.people.length >= 2 && line.amount > 0
  const equal = shares.length > 0 && shares.every((s) => s.amount === shares[0].amount)

  let footer: React.ReactNode = null
  if (line.amount > 0 && line.people.length > 0) {
    if (line.shares) {
      footer = (
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{shares.map((s) => `${s.name} ${formatMoney(s.amount).replace(/\s?₫$/, '')}`).join(' · ')}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">uneven</span>
        </span>
      )
    } else if (line.people.length === 1) {
      footer = `${line.people[0]} only`
    } else if (equal) {
      footer = `${formatMoney(shares[0].amount)} each`
    } else {
      // Equal split with a remainder: the base share, approximately.
      footer = `≈ ${formatMoney(Math.min(...shares.map((s) => s.amount)))} each`
    }
  }

  return (
    <div className={cn('rounded-lg border bg-card p-3', invalid ? 'border-destructive ring-1 ring-destructive' : 'border-border')}>
      <div className="flex items-start gap-2">
        <Input
          value={line.label}
          onChange={(e) => change({ ...line, label: e.target.value })}
          placeholder="Item"
          aria-label="Line label"
          className="min-w-0 flex-1"
        />
        <div className="w-36 shrink-0">
          <MoneyInput
            value={line.amount}
            unit={unit}
            aria-label={line.label.trim() ? `Amount for ${line.label.trim()}` : 'Amount'}
            onChange={(v) => change(setLineAmount(line, v))}
            className="font-semibold"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove line"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={everyone}
          onClick={() => change(toggleEveryone(line, billPeople))}
          className={cn(chipBase, everyone ? chipOn : chipOff)}
        >
          Everyone
        </button>
        {billPeople.map((name) => {
          const on = line.people.includes(name)
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => change(toggleLinePerson(line, name, billPeople))}
              className={cn(chipBase, on ? chipOn : chipOff)}
            >
              {name}
            </button>
          )
        })}
        {adding ? (
          <div className="flex w-40 items-center">
            <Combobox
              value={newName}
              onValueChange={setNewName}
              onSelect={pickNew}
              suggestions={suggestions}
              placeholder="Name"
              aria-label="New name"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(chipBase, 'border-dashed border-border bg-background text-muted-foreground hover:bg-secondary')}
          >
            + add name
          </button>
        )}
      </div>

      {(footer || wasReset || canAdjust) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="min-w-0">{wasReset && !line.shares ? 'back to equal split' : footer}</span>
          {canAdjust && (
            <button
              type="button"
              onClick={onAdjust}
              disabled={!!adjustDisabledHint}
              className="shrink-0 font-medium text-primary disabled:text-muted-foreground"
            >
              {adjustDisabledHint ?? 'Uneven? Adjust ›'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
