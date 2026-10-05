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
 * Refresh tokens are single-use and the store does not sync between tabs, so first adopt whatever another tab has
 * persisted, and when the refresh settles only touch the store if it still holds the session that was refreshed.
 */
export async function forceRefresh(deps: SessionDeps = defaultDeps): Promise<string> {
  const heldBefore = useAuthStore.getState().session?.accessToken
  await useAuthStore.persist.rehydrate()
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
    .then((next) => {
      const current = useAuthStore.getState().session
      if (!current) throw new AuthError('expired')
      if (current.refreshToken !== refreshed) return current
      setSession(next)
      return next
    })
    .catch((error: unknown) => {
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
