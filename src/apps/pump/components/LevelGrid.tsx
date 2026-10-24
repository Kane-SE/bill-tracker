import { useState } from 'react'
import { nextLevelRange, type LevelRange } from '@/apps/pump/lib/level-range'
import { levelLabel } from '@/apps/pump/lib/labels'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

/** Every level in the data, 7 per row, 44 px cells. Tap a level, then another for a range. */
export function LevelGrid({ levels, value, onChange }: { levels: number[]; value: LevelRange; onChange(v: LevelRange): void }) {
  const [anchor, setAnchor] = useState<number | null>(null)
  return (
    <section id="facet-level" role="group" aria-labelledby="facet-level-label" className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 id="facet-level-label" className="text-sm font-semibold">
          Level · {value ? levelLabel(value) : 'any'}
        </h3>
        {value && (
          <Button
            variant="ghost"
            onClick={() => {
              setAnchor(null)
              onChange(null)
            }}
          >
            Any level
          </Button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {levels.map((n) => {
          const on = value !== null && n >= value[0] && n <= value[1]
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = nextLevelRange(value, anchor, n)
                setAnchor(next.anchor)
                onChange(next.value)
              }}
              className={cn(
                'h-11 rounded-lg border text-sm font-semibold tabular-nums',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </section>
  )
}
