import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface FacetOption<V extends string> {
  value: V
  label: string
  count?: number
}

interface FacetGroupProps<V extends string> {
  id: string
  label: string
  options: FacetOption<V>[]
  selected: readonly V[]
  onToggle(value: V): void
  /** one sideways-scrolling row instead of wrapping */
  scroll?: boolean
  /** extra control on the label row (e.g. the any/all switch) */
  children?: React.ReactNode
}

/** A labelled group of toggle chips (`aria-pressed`, checkmark when on); the label never changes with state. */
export function FacetGroup<V extends string>({ id, label, options, selected, onToggle, scroll, children }: FacetGroupProps<V>) {
  return (
    <section id={`facet-${id}`} role="group" aria-labelledby={`facet-${id}-label`} className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id={`facet-${id}-label`} className="text-sm font-semibold">
          {label}
        </h3>
        {children}
      </div>
      <div className={cn('flex gap-2', scroll ? '-mx-5 overflow-x-auto px-5 [scrollbar-width:none]' : 'flex-wrap')}>
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
                o.count === 0 && !on && 'opacity-60',
              )}
            >
              {on && <Check className="h-4 w-4" aria-hidden />}
              {o.label}
              {o.count !== undefined && (
                <span className={cn('text-xs tabular-nums', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{o.count.toLocaleString()}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
