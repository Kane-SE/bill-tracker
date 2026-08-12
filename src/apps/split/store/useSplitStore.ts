import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/shared/lib/utils'
import { STORAGE_KEY } from '@/shared/lib/storage'
import { frequentNames } from '@/apps/split/lib/names'
import type { AppData, Item, Night } from '@/apps/split/types'

/**
 * Single source of truth for app data, persisted to localStorage via zustand's
 * `persist` middleware. Components read slices from here; all mutations go
 * through the actions below.
 */

interface AppState {
  knownNames: string[]
  nights: Night[]
  promotedNames: string[]

  // ---- nights --------------------------------------------------------------
  addNight(input?: { title?: string; participants?: string[] }): string
  updateNight(id: string, patch: Partial<Omit<Night, 'id'>>): void
  deleteNight(id: string): void
  markDone(id: string): void
  restoreNight(id: string): void
  setParticipants(nightId: string, names: string[]): void

  // ---- items ---------------------------------------------------------------
  addItem(nightId: string, item: Omit<Item, 'id'>): void
  updateItem(nightId: string, itemId: string, patch: Partial<Omit<Item, 'id'>>): void
  deleteItem(nightId: string, itemId: string): void

  // ---- known names ---------------------------------------------------------
  addKnownName(name: string): void
  removeKnownName(name: string): void
  promoteFrequentNames(): void

  // ---- backup --------------------------------------------------------------
  exportData(): AppData
  importData(data: AppData): void
}

function mapNight(nights: Night[], id: string, fn: (n: Night) => Night): Night[] {
  return nights.map((n) => (n.id === id ? fn(n) : n))
}

export const useSplitStore = create<AppState>()(
  persist(
    (set, get) => ({
      knownNames: [],
      nights: [],
      promotedNames: [],

      addNight(input) {
        const id = uid()
        const night: Night = {
          id,
          title: input?.title?.trim() || undefined,
          date: new Date().toISOString(),
          status: 'active',
          participants: input?.participants ?? [],
          items: [],
        }
        set((s) => ({ nights: [night, ...s.nights] }))
        get().promoteFrequentNames()
        return id
      },

      updateNight(id, patch) {
        set((s) => ({ nights: mapNight(s.nights, id, (n) => ({ ...n, ...patch })) }))
      },

      deleteNight(id) {
        set((s) => ({ nights: s.nights.filter((n) => n.id !== id) }))
      },

      markDone(id) {
        set((s) => ({
          nights: mapNight(s.nights, id, (n) => ({
            ...n,
            status: 'settled',
            settledAt: new Date().toISOString(),
          })),
        }))
      },

      restoreNight(id) {
        set((s) => ({
          nights: mapNight(s.nights, id, (n) => ({
            ...n,
            status: 'active',
            settledAt: undefined,
          })),
        }))
      },

      setParticipants(nightId, names) {
        set((s) => ({ nights: mapNight(s.nights, nightId, (n) => ({ ...n, participants: names })) }))
        get().promoteFrequentNames()
      },

      addItem(nightId, item) {
        set((s) => ({
          nights: mapNight(s.nights, nightId, (n) => ({
            ...n,
            items: [...n.items, { ...item, id: uid() }],
          })),
        }))
      },

      updateItem(nightId, itemId, patch) {
        set((s) => ({
          nights: mapNight(s.nights, nightId, (n) => ({
            ...n,
            items: n.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          })),
        }))
      },

      deleteItem(nightId, itemId) {
        set((s) => ({
          nights: mapNight(s.nights, nightId, (n) => ({
            ...n,
            items: n.items.filter((it) => it.id !== itemId),
          })),
        }))
      },

      addKnownName(name) {
        const clean = name.trim()
        if (!clean) return
        set((s) =>
          s.knownNames.some((n) => n.toLowerCase() === clean.toLowerCase())
            ? s
            : { knownNames: [...s.knownNames, clean].sort((a, b) => a.localeCompare(b)) },
        )
      },

      removeKnownName(name) {
        set((s) => ({ knownNames: s.knownNames.filter((n) => n !== name) }))
      },

      promoteFrequentNames() {
        set((s) => {
          const frequent = frequentNames(s.nights) // threshold 2 -> 3+ nights
          const knownLower = new Set(s.knownNames.map((n) => n.toLowerCase()))
          const promotedLower = new Set(s.promotedNames.map((n) => n.toLowerCase()))
          const toAdd = frequent.filter(
            (n) => !knownLower.has(n.toLowerCase()) && !promotedLower.has(n.toLowerCase()),
          )
          if (toAdd.length === 0) return s
          return {
            knownNames: [...s.knownNames, ...toAdd].sort((a, b) => a.localeCompare(b)),
            promotedNames: [...s.promotedNames, ...toAdd],
          }
        })
      },

      exportData() {
        const { knownNames, nights } = get()
        return { version: 1, knownNames, nights }
      },

      importData(data) {
        set({ knownNames: data.knownNames, nights: data.nights })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ knownNames: s.knownNames, nights: s.nights, promotedNames: s.promotedNames }),
    },
  ),
)

/** Selector helper: find one night reactively. */
export function useNight(id: string | undefined): Night | undefined {
  return useSplitStore((s) => s.nights.find((n) => n.id === id))
}
