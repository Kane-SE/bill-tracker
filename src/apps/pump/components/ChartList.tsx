import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual'
import type { SkillId } from '@/apps/pump/data/types'
import { rowIndexOf, toGridRows, type ListRow } from '@/apps/pump/lib/order'
import type { ChartView } from '@/apps/pump/store/usePumpStore'
import { ChartRow, ROW_HEIGHT } from '@/apps/pump/components/ChartRow'
import { ChartTile, GRID_ROW_HEIGHT } from '@/apps/pump/components/ChartTile'

export const HEADER_HEIGHT = 32

interface ChartListProps {
  rows: ListRow[]
  view: ChartView
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
export const ChartList = memo(function ChartList({ rows: listRows, view, selectedSkills, earned, onOpen }: ChartListProps) {
  const rows = useMemo(() => (view === 'grid' ? toGridRows(listRows) : listRows), [listRows, view])
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
    estimateSize: (i) => (rows[i].kind === 'header' ? HEADER_HEIGHT : rows[i].kind === 'pair' ? GRID_ROW_HEIGHT : ROW_HEIGHT),
    overscan: 8,
    scrollMargin,
    rangeExtractor,
  })

  // Anchor: the first chart whose row starts at or below the bottom of the sticky
  // stack (page header + level header). Recomputed every render (the virtualizer
  // re-renders on scroll), but frozen on the render where the view changes, since
  // that one already lays out the new rows at the old scroll offset.
  const anchorId = useRef<number | null>(null)
  const shownView = useRef(view)
  if (shownView.current === view) {
    const head = parseFloat(document.documentElement.style.getPropertyValue('--pump-head')) || 0
    const line = Math.max(window.scrollY + head, scrollMargin) + HEADER_HEIGHT
    const first = virtualizer.getVirtualItems().find((it) => rows[it.index]?.kind !== 'header' && it.start >= line - 1)
    const row = first && rows[first.index]
    if (row && row.kind !== 'header') anchorId.current = row.kind === 'pair' ? row.charts[0].id : row.chart.id
  }
  useLayoutEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    const i = anchorId.current === null ? -1 : rowIndexOf(rows, anchorId.current)
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'start' })
  }, [view, rows, virtualizer])

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
            ) : row.kind === 'pair' ? (
              <div className="grid h-[156px] grid-cols-2 gap-2 pb-2">
                {row.charts.map((c) => (
                  <ChartTile
                    key={c.id}
                    chart={c}
                    selectedSkills={selectedSkills}
                    earned={c.titleIds.some((id) => earned.has(id))}
                    onOpen={onOpen}
                  />
                ))}
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
