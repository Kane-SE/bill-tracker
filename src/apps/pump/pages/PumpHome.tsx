import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { getCatalog } from '@/apps/pump/data/catalog'
import { applyFilters, defaultFilters, facetCounts, removalSuggestions } from '@/apps/pump/lib/filters'
import { songCharts, sortCharts, toRows } from '@/apps/pump/lib/order'
import { activeFacetCount, summarize } from '@/apps/pump/lib/summary'
import { earnedCount, trackViews } from '@/apps/pump/lib/titles'
import { parseFilters, serializeFilters } from '@/apps/pump/lib/url-state'
import { countLabel } from '@/apps/pump/lib/labels'
import { MAX_PRESETS, usePumpStore } from '@/apps/pump/store/usePumpStore'
import { usePumpFilters } from '@/apps/pump/hooks/usePumpFilters'
import { useSheetParam } from '@/apps/pump/hooks/useSheetParam'
import { AboutDialog } from '@/apps/pump/components/AboutDialog'
import { ChartList } from '@/apps/pump/components/ChartList'
import { ChartSheet } from '@/apps/pump/components/ChartSheet'
import { EmptyResults } from '@/apps/pump/components/EmptyResults'
import { FilterDock } from '@/apps/pump/components/FilterDock'
import { FilterSheet } from '@/apps/pump/components/FilterSheet'
import { PumpHeader } from '@/apps/pump/components/PumpHeader'
import { TitlesTab } from '@/apps/pump/components/TitlesTab'

/** Pump: every PHOENIX 2 chart, filtered one-handed; plus the skill-title tracks. */
export default function PumpHome() {
  const catalog = getCatalog()
  const sorted = useMemo(() => sortCharts(catalog.charts), [catalog])
  const { filters, setFilters, tab, setTab } = usePumpFilters()
  const filterSheet = useSheetParam('f')
  const chartSheet = useSheetParam('c')
  const about = useSheetParam('a')

  const earnedList = usePumpStore((s) => s.earnedTitles)
  const earned = useMemo(() => new Set(earnedList), [earnedList])
  const presets = usePumpStore((s) => s.presets)
  const view = usePumpStore((s) => s.view)
  const { toggleTitle, savePreset, deletePreset } = usePumpStore.getState()

  // The list follows a deferred copy, so typing and chip taps stay responsive.
  const deferred = useDeferredValue(filters)
  const results = useMemo(() => applyFilters(sorted, deferred), [sorted, deferred])

  // New filters show a new list: start it from the top. Opening or closing a
  // sheet leaves the filters (and so the scroll position) alone.
  const listKey = serializeFilters(deferred)
  const shownKey = useRef(listKey)
  useEffect(() => {
    if (shownKey.current === listKey) return
    shownKey.current = listKey
    window.scrollTo({ top: 0 })
  }, [listKey])

  const rows = useMemo(() => toRows(results), [results])
  const songCount = useMemo(() => new Set(results.map((c) => c.song)).size, [results])
  const suggestions = useMemo(() => (results.length === 0 ? removalSuggestions(sorted, deferred) : []), [results, sorted, deferred])

  // The sheet shows live numbers for the current (not deferred) filters.
  const counts = useMemo(() => facetCounts(sorted, filters), [sorted, filters])
  const sheetCount = useMemo(() => applyFilters(sorted, filters).length, [sorted, filters])
  const liveQuery = serializeFilters({ ...filters, q: '' })

  const views = useMemo(() => trackViews(catalog.titles, earned), [catalog, earned])
  // Each tab starts at its top. Scroll before switching: the chart list's virtualizer
  // takes the window's scroll position as its starting offset when it mounts.
  const switchTab = (t: typeof tab) => {
    if (t === tab) return
    window.scrollTo({ top: 0 })
    setTab(t)
  }
  const openChart = chartSheet.open
  const onOpen = useCallback((id: number) => openChart(String(id)), [openChart])
  const chart = chartSheet.value ? (catalog.byId.get(Number(chartSheet.value)) ?? null) : null
  const siblings = useMemo(() => (chart ? songCharts(sorted, chart, filters.steamLink || chart.steamLink) : []), [sorted, chart, filters.steamLink])

  const subtitle =
    tab === 'charts' ? (
      <span role="status">
        {countLabel(results.length, 'chart')} · {countLabel(songCount, 'song')}
      </span>
    ) : (
      `${earnedCount(catalog.titles, earned)} / ${catalog.titles.length} earned`
    )

  return (
    <div className="mx-auto max-w-lg px-4 pb-44">
      <PumpHeader tab={tab} onTab={switchTab} subtitle={subtitle} onInfo={() => about.open()} />

      {tab === 'charts' ? (
        <>
          {results.length > 0 ? (
            <ChartList rows={rows} view={view} selectedSkills={deferred.skills} earned={earned} onOpen={onOpen} />
          ) : (
            <EmptyResults suggestions={suggestions} onApply={setFilters} onClear={() => setFilters({ ...defaultFilters })} />
          )}
          <FilterDock
            filters={filters}
            activeCount={activeFacetCount(filters)}
            onChange={setFilters}
            onOpenFilters={(focus) => filterSheet.open(focus ?? '1')}
          />
        </>
      ) : (
        <TitlesTab views={views} earned={earned} onToggle={toggleTitle} onOpen={onOpen} />
      )}

      <FilterSheet
        open={filterSheet.value !== null}
        focus={filterSheet.value}
        onClose={filterSheet.close}
        filters={filters}
        onChange={setFilters}
        counts={counts}
        resultCount={sheetCount}
        levels={catalog.levels}
        presets={presets}
        activeQuery={liveQuery}
        defaultPresetName={summarize({ ...filters, q: '' })}
        presetsFull={presets.length >= MAX_PRESETS}
        onApplyPreset={(p) => setFilters({ ...parseFilters(new URLSearchParams(p.query)), q: filters.q })}
        onSavePreset={(name) => savePreset(name, liveQuery)}
        onDeletePreset={deletePreset}
      />
      <ChartSheet
        chart={chart}
        siblings={siblings}
        titles={catalog.titles}
        earned={earned}
        onToggleTitle={toggleTitle}
        onPick={(id) => chartSheet.swap(String(id))}
        onClose={chartSheet.close}
      />
      <AboutDialog open={about.value !== null} meta={catalog.meta} onClose={about.close} />
    </div>
  )
}
