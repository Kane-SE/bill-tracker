import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { z } from 'zod'
import { uid } from '@/shared/lib/utils'

/**
 * Pump's saved state: the last filters (restored when Pump opens with none),
 * named presets and earned titles. Live filters themselves live in the URL.
 * Earned titles are included in Settings → backup (settings/backup.ts).
 */

export const PUMP_STORAGE_KEY = 'pump-store'
export const MAX_PRESETS = 12

export type ChartView = 'grid' | 'list'

export interface Preset {
  id: string
  name: string
  /** serializeFilters() output, without the search text */
  query: string
}

const persistedSchema = z.object({
  lastFilters: z.string().catch(''),
  presets: z.array(z.object({ id: z.string(), name: z.string(), query: z.string() })).max(MAX_PRESETS).catch([]),
  earnedTitles: z.array(z.string()).catch([]),
  view: z.enum(['grid', 'list']).catch('grid'),
})

interface PumpState extends z.infer<typeof persistedSchema> {
  setLastFilters(query: string): void
  /** false when there are already MAX_PRESETS presets */
  savePreset(name: string, query: string): boolean
  deletePreset(id: string): void
  toggleTitle(id: string): void
  setEarnedTitles(ids: string[]): void
  setView(v: ChartView): void
}

export const usePumpStore = create<PumpState>()(
  persist(
    (set, get) => ({
      lastFilters: '',
      presets: [],
      earnedTitles: [],
      view: 'grid',

      setLastFilters(query) {
        if (get().lastFilters !== query) set({ lastFilters: query })
      },

      savePreset(name, query) {
        const { presets } = get()
        if (presets.length >= MAX_PRESETS) return false
        set({ presets: [...presets, { id: uid(), name: name.trim(), query }] })
        return true
      },

      deletePreset(id) {
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }))
      },

      toggleTitle(id) {
        set((s) => ({
          earnedTitles: s.earnedTitles.includes(id) ? s.earnedTitles.filter((t) => t !== id) : [...s.earnedTitles, id],
        }))
      },

      setEarnedTitles(ids) {
        set({ earnedTitles: [...new Set(ids)] })
      },

      setView(v) {
        set({ view: v })
      },
    }),
    {
      name: PUMP_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ lastFilters: s.lastFilters, presets: s.presets, earnedTitles: s.earnedTitles, view: s.view }),
      // Validate what comes back from localStorage; a bad field falls back to its default.
      merge: (persisted, current) => {
        const r = persistedSchema.safeParse(persisted ?? {})
        return r.success ? { ...current, ...r.data } : current
      },
    },
  ),
)
