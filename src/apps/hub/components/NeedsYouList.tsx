import { useState } from 'react'
import { ChevronRight, Hand, Moon } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { ageLabel } from '@/apps/hub/lib/needs-you'
import type { NeedsYouItem } from '@/apps/hub/lib/types'

export function NeedsYouList({ items, onOpen }: { items: NeedsYouItem[]; onOpen: (item: NeedsYouItem) => void }) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const more = items.length - 3
  const shown = expanded ? items : items.slice(0, 3)
  return (
    <section className="mt-4 lg:mt-0">
      <SectionHead
        title="Needs you"
        action={
          more > 0 && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="h-8 rounded-md px-2 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              {expanded ? 'Show less' : `+${more} more`}
            </button>
          )
        }
      />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {shown.map((item, i) => (
          <li key={`${item.kind}-${i}-${item.title}`}>
            <button type="button" onClick={() => onOpen(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-foreground/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                {item.kind === 'waiting' ? <Hand className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {`${item.context} · ${item.kind === 'waiting' ? `waiting ${ageLabel(item.days)}` : `quiet for ${ageLabel(item.days)}`}`}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
