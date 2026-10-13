import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual'
import type { SkillId } from '@/apps/pump/data/types'
import type { ListRow } from '@/apps/pump/lib/order'
import { ChartRow, ROW_HEIGHT } from '@/apps/pump/components/ChartRow'

export const HEADER_HEIGHT = 32

interface ChartListProps {
  rows: ListRow[]
  selectedSkills: readonly SkillId[]
  earned: ReadonlySet<string>
  onOpen(id: number): void
}

/**
 * Window-scrolled virtual list (~60 rows in the DOM). The level header of the
 * section in view sticks under the page header (--pump-head, set by PumpHeader),
 * using TanStack Virtual's sticky pattern: the active header is always rendered
 * and positioned sticky; everything else is absolute.
 */
export const ChartList = memo(function ChartList({ rows, selectedSkills, earned, onOpen }: ChartListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
  }, [rows.length])

  const stickyIndexes = useMemo(() => rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])), [rows])
  const activeSticky = useRef(0)
  const rangeExtractor = useCallback(
    (range: Range) => {
      activeSticky.current = [...stickyIndexes].reverse().find((i) => range.startIndex >= i) ?? 0
      const next = new Set([activeSticky.current, ...defaultRangeExtractor(range)])
      return [...next].sort((a, b) => a - b)
    },
    [stickyIndexes],
  )

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => (rows[i].kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 8,
    scrollMargin,
    rangeExtractor,
  })

  return (
    <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => {
        const row = rows[item.index]
        const sticky = activeSticky.current === item.index
        const style: React.CSSProperties = sticky
          ? { position: 'sticky', top: 'var(--pump-head, 0px)', zIndex: 1 }
          : { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }
        return (
          <div key={row.key} style={{ ...style, height: item.size }}>
            {row.kind === 'header' ? (
              <div className="flex h-8 items-center bg-background/95 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
                Lv {row.level} · {row.count}
              </div>
            ) : (
              <ChartRow
                chart={row.chart}
                selectedSkills={selectedSkills}
                earned={row.chart.titleIds.some((id) => earned.has(id))}
                onOpen={onOpen}
              />
            )}
          </div>
        )
      })}
    </div>
  )
})
