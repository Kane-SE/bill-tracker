import { Input } from '@/components/ui/input'
import { formatNumber, parseMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  id?: string
  className?: string
  autoFocus?: boolean
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
}: MoneyInputProps) {
  const display = value > 0 ? formatNumber(value) : ''
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        className={cn('pr-9 text-right tabular-nums', className)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ₫
      </span>
    </div>
  )
}
