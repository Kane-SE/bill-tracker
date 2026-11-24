import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NightCard } from '@/apps/split/components/NightCard'
import { groupByMonth } from '@/apps/split/lib/months'
import { cn } from '@/shared/lib/utils'
import type { Night } from '@/apps/split/types'

/** Nomnoms under month headers: the newest month starts open, older ones folded. */
export function NightMonthList({ nights }: { nights: Night[] }) {
  const groups = useMemo(() => groupByMonth(nights), [nights])
  // Months the user flipped from their default (newest open, the rest closed).
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setFlipped((s) => {
      const next = new Set(s)
      if (!next.delete(key)) next.add(key)
      return next
    })

  return (
    <div className="space-y-4">
      {groups.map((g, i) => {
        const open = (i === 0) !== flipped.has(g.key)
        return (
          <section key={g.key}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggle(g.key)}
              className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-semibold"
            >
              <span>{g.label}</span>
              <span className="text-muted-foreground">· {g.nights.length}</span>
              <ChevronDown
                className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
              />
            </button>
            {open && (
              <div className="mt-1 space-y-3">
                {g.nights.map((night) => (
                  <NightCard key={night.id} night={night} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
