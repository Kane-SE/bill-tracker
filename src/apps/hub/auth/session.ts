import { AuthError, refreshSession, type Session } from '@/apps/hub/auth/github-auth'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'

const REFRESH_MARGIN_MS = 5 * 60 * 1000

export interface SessionDeps {
  now: () => number
  refresh: (refreshToken: string) => Promise<Session>
}

const defaultDeps: SessionDeps = { now: () => Date.now(), refresh: (token) => refreshSession(token) }

let refreshing: Promise<Session> | null = null

/** Refresh now. Concurrent callers share one request. GitHub rejecting the refresh signs out; being offline does not. */
export async function forceRefresh(deps: SessionDeps = defaultDeps): Promise<string> {
  const { session, signOut, setSession } = useAuthStore.getState()
  if (!session) throw new AuthError('expired')
  if (session.refreshExpiresAt <= deps.now()) {
    signOut()
    throw new AuthError('expired')
  }
  refreshing ??= deps
    .refresh(session.refreshToken)
    .then((next) => {
      setSession(next)
      return next
    })
    .catch((error: unknown) => {
      if (error instanceof AuthError) signOut()
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
