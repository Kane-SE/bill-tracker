import { Input } from '@/shared/ui/input'
import { scaleMoney } from '@/apps/split/lib/format'
import { cn } from '@/shared/lib/utils'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  id?: string
  className?: string
  autoFocus?: boolean
  /** 1000 = the bill shows thousands: typing 250 means 250.000 ₫. Default 1. */
  unit?: 1 | 1000
}

/**
 * Numeric VND input that shows thousands separators as you type while emitting
 * a plain integer. Mobile keyboards get a numeric pad via inputMode.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  id,
  className,
  autoFocus,
  unit = 1,
}: MoneyInputProps) {
  const display = scaleMoney.display(value, unit)
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(scaleMoney.parse(e.target.value, unit))}
        className={cn(unit === 1000 ? 'pr-16' : 'pr-9', 'text-right tabular-nums', className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {unit === 1000 ? '.000 ₫' : '₫'}
      </span>
    </div>
  )
}
