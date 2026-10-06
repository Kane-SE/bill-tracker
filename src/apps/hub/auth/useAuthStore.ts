import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@/apps/hub/auth/github-auth'

export interface HubUser {
  login: string
  avatarUrl: string
}

/** 'none' = signed in, but this account cannot see the hub repo. */
export type HubAccess = 'unknown' | 'ok' | 'none'

interface AuthState {
  session: Session | null
  user: HubUser | null
  access: HubAccess
  setSession(session: Session): void
  setUser(user: HubUser): void
  setAccess(access: HubAccess): void
  signOut(): void
}

export const AUTH_STORAGE_KEY = 'nook-hub-auth'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      access: 'unknown',
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setAccess: (access) => set({ access }),
      signOut: () => set({ session: null, user: null, access: 'unknown' }),
    }),
    { name: AUTH_STORAGE_KEY },
  ),
)
