import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which name is "me", chosen in Copy for Excel. Saved on this device only
 * (not in backups); a name that no longer appears in any Nomnom counts as unset.
 */
interface MeState {
  me: string | null
  setMe(name: string): void
}

export const useMe = create<MeState>()(
  persist((set) => ({ me: null, setMe: (me) => set({ me }) }), { name: 'split-me' }),
)
