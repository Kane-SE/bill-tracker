import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ChipProps {
  /** toggle state; when set the chip is a toggle button with a checkmark */
  pressed?: boolean
  /** filled look without toggle semantics (e.g. a removable skill) */
  active?: boolean
  /** accessible name when the visible text isn't enough */
  label?: string
  onClick(): void
  children: React.ReactNode
}

/** 36 px pill whose hit area extends to 44 px. */
export function Chip({ pressed, active, label, onClick, children }: ChipProps) {
  const on = pressed ?? active ?? false
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
      )}
    >
      {pressed && <Check className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  )
}
