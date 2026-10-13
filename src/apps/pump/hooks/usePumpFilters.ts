import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters } from '@/apps/pump/lib/filters'
import { hasFilterParams, mergeLiveFilters, parseFilters, serializeFilters, withFilters } from '@/apps/pump/lib/url-state'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'
import { historyUserState } from '@/apps/pump/hooks/useSheetParam'

export type PumpTab = 'charts' | 'titles'

/**
 * The URL query is the live filter state. Every change replaces the current
 * history entry (Back never steps through filters) and keeps its state, so a
 * sheet's "pushed by me" marker survives. Changes are mirrored into
 * lastFilters, which is restored when Pump opens with no filters.
 */
export function usePumpFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const tab: PumpTab = params.get('tab') === 'titles' ? 'titles' : 'charts'
  const setLastFilters = usePumpStore((s) => s.setLastFilters)

  const setFilters = useCallback(
    (next: Filters) => {
      setParams((prev) => withFilters(prev, next), { replace: true, state: historyUserState() })
      setLastFilters(serializeFilters({ ...next, q: '' }))
    },
    [setParams, setLastFilters],
  )

  const setTab = useCallback(
    (t: PumpTab) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (t === 'titles') next.set('tab', 'titles')
          else next.delete('tab')
          return next
        },
        { replace: true, state: historyUserState() },
      )
    },
    [setParams],
  )

  // Arriving with no filters in the URL: bring back the last ones (once).
  useEffect(() => {
    if (hasFilterParams(params) || params.has('f') || params.has('c')) return
    const last = usePumpStore.getState().lastFilters
    if (last) setParams((prev) => mergeLiveFilters(prev, last), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { filters, setFilters, tab, setTab }
}
