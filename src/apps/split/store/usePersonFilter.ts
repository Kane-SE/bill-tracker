import { create } from 'zustand'

/**
 * The person chosen in the Home/Archive person picker. Deliberately NOT
 * persisted: it survives navigation within the app and resets on restart.
 */
interface PersonFilterState {
  person: string | null
  setPerson(name: string | null): void
}

export const usePersonFilter = create<PersonFilterState>()((set) => ({
  person: null,
  setPerson: (person) => set({ person }),
}))
