import { AuthError, refreshSession, type Session } from '@/apps/hub/auth/github-auth'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'

const REFRESH_MARGIN_MS = 5 * 60 * 1000

export interface SessionDeps {
  now: () => number
  refresh: (refreshToken: string) => Promise<Session>
}

const defaultDeps: SessionDeps = { now: () => Date.now(), refresh: (token) => refreshSession(token) }

let refreshing: Promise<Session> | null = null

/**
 * Refresh now. Concurrent callers share one request. GitHub rejecting the refresh signs out; being offline does not.
 * Refresh tokens are single-use and the store does not sync between tabs, so adopt whatever another tab has persisted
 * before refreshing and again when the refresh settles, and never overwrite a newer session with the result of a
 * stale refresh. `persist` is undefined when localStorage is unavailable; then everything runs from memory.
 */
export async function forceRefresh(deps: SessionDeps = defaultDeps): Promise<string> {
  const heldBefore = useAuthStore.getState().session?.accessToken
  await useAuthStore.persist?.rehydrate()
  const { session, signOut, setSession } = useAuthStore.getState()
  if (!session) throw new AuthError('expired')
  if (session.accessToken !== heldBefore && session.accessExpiresAt - deps.now() > REFRESH_MARGIN_MS) return session.accessToken
  if (session.refreshExpiresAt <= deps.now()) {
    signOut()
    throw new AuthError('expired')
  }
  const refreshed = session.refreshToken
  refreshing ??= deps
    .refresh(refreshed)
    .then(async (next) => {
      // This tab signed out while the refresh was in flight: respect it. Read memory BEFORE rehydrating, because a
      // persisted `null` is ambiguous (another tab's sign-out, or a race loser's rejected refresh) and GitHub has
      // already rotated the old refresh token, so `next` is the only live grant and must not be thrown away for it.
      if (!useAuthStore.getState().session) throw new AuthError('expired')
      await useAuthStore.persist?.rehydrate()
      const current = useAuthStore.getState().session
      if (current && current.refreshToken !== refreshed) return current
      try {
        setSession(next)
      } catch {
        // zustand updates memory before persisting. If persisting throws (e.g. storage quota), the tab keeps the new session.
      }
      return next
    })
    .catch(async (error: unknown) => {
      await useAuthStore.persist?.rehydrate()
      if (error instanceof AuthError && useAuthStore.getState().session?.refreshToken === refreshed) signOut()
      throw error
    })
    .finally(() => {
      refreshing = null
    })
  return (await refreshing).accessToken
}

export async function getAccessToken(deps: SessionDeps = defaultDeps): Promise<string> {
  const { session } = useAuthStore.getState()
  if (!session) throw new AuthError('expired')
  if (session.accessExpiresAt - deps.now() > REFRESH_MARGIN_MS) return session.accessToken
  return forceRefresh(deps)
}
