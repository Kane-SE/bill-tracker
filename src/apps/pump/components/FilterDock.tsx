import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Mode } from '@/apps/pump/data/types'
import { defaultFilters, toggleValue, type Filters } from '@/apps/pump/lib/filters'
import { levelLabel, MODE_SHORT } from '@/apps/pump/lib/labels'
import { useKeyboardInset } from '@/apps/pump/hooks/useKeyboardInset'
import { Chip } from '@/apps/pump/components/Chip'
import { BottomBar } from '@/shared/components/BottomBar'
import { Button } from '@/shared/ui/button'

interface FilterDockProps {
  filters: Filters
  activeCount: number
  onChange(f: Filters): void
  onOpenFilters(focus?: 'level'): void
}

/** Thumb-zone bar: promoted chips (mode, level, selected skills, Clear), search, Filters (n). */
export function FilterDock({ filters, activeCount, onChange, onOpenFilters }: FilterDockProps) {
  const inset = useKeyboardInset()
  // Local text so typing never waits on the URL; external changes (Clear, presets) sync back in.
  const [text, setText] = useState(filters.q)
  useEffect(() => setText(filters.q), [filters.q])
  const modes: Mode[] = filters.steamLink ? ['S', 'D', 'HDB'] : ['S', 'D']
  const anyActive = activeCount > 0 || filters.q.trim() !== ''

  return (
    <BottomBar style={inset > 0 ? { transform: `translateY(-${inset}px)` } : undefined}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        {modes.map((m) => (
          <Chip key={m} pressed={filters.modes.includes(m)} onClick={() => onChange({ ...filters, modes: toggleValue(filters.modes, m) })}>
            {MODE_SHORT[m]}
          </Chip>
        ))}
        <Chip active={filters.level !== null} onClick={() => onOpenFilters('level')}>
          {filters.level ? levelLabel(filters.level) : 'Any level'}
        </Chip>
        {filters.skills.map((s) => (
          <Chip key={s} active label={`Remove ${s}`} onClick={() => onChange({ ...filters, skills: filters.skills.filter((x) => x !== s) })}>
            {s}
            <X className="h-3.5 w-3.5" aria-hidden />
          </Chip>
        ))}
        {anyActive && <Chip onClick={() => onChange({ ...defaultFilters })}>Clear</Chip>}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search title or artist</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search title, artist"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onChange({ ...filters, q: e.target.value })
            }}
            className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button variant="outline" className="shrink-0" onClick={() => onOpenFilters()}>
          <SlidersHorizontal aria-hidden />
          Filters
          {activeCount > 0 && <span className="tabular-nums">{activeCount}</span>}
        </Button>
      </div>
    </BottomBar>
  )
}
