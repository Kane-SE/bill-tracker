import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paramsAfterClose, parseFilters, serializeFilters, SHEET_KEYS, withoutSheets } from '@/apps/pump/lib/url-state'
import { usePumpStore } from '@/apps/pump/store/usePumpStore'

export type SheetKey = (typeof SHEET_KEYS)[number]

interface PumpHistoryState {
  pumpSheet?: SheetKey
}

/** React Router keeps navigate()'s `state` under `usr` in window.history.state. */
export function historyUserState(): PumpHistoryState | undefined {
  return (window.history.state as { usr?: PumpHistoryState } | null)?.usr ?? undefined
}

/**
 * A sheet whose open state is a URL param (f = Filters, c = chart id, a = About).
 * Opening pushes one history entry, so the phone's Back closes the sheet.
 *
 * Filters sheet: taps inside it replace the pushed entry (keeping its state
 * marker), so the entry below still holds the filters from before it opened.
 * When it closes, by any route, the live filters (mirrored in lastFilters)
 * are re-applied to the entry Back landed on.
 */
export function useSheetParam(key: SheetKey) {
  const [params, setParams] = useSearchParams()
  const value = params.get(key)

  const open = useCallback(
    (v = '1') => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const k of SHEET_KEYS) next.delete(k)
          next.set(key, v)
          return next
        },
        { state: { pumpSheet: key } satisfies PumpHistoryState },
      )
    },
    [key, setParams],
  )

  const close = useCallback(() => {
    if (historyUserState()?.pumpSheet === key) {
      window.history.back()
    } else {
      // Opened from a link: there is no pushed entry to go back to. Only the
      // Filters sheet can change filters (and it synced lastFilters on open).
      setParams((prev) => (key === 'f' ? paramsAfterClose(prev, usePumpStore.getState().lastFilters) : withoutSheets(prev)), {
        replace: true,
      })
    }
  }, [key, setParams])

  const was = useRef<string | null>(null)
  useEffect(() => {
    const before = was.current
    was.current = value
    if (key !== 'f') return
    if (before === null && value !== null) {
      // Opening: make the stored live filters match what is on screen now.
      usePumpStore.getState().setLastFilters(serializeFilters({ ...parseFilters(params), q: '' }))
    } else if (before !== null && value === null) {
      const next = paramsAfterClose(params, usePumpStore.getState().lastFilters)
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }
  }, [key, value, params, setParams])

  return { value, open, close }
}
