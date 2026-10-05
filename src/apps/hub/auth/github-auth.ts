import { z } from 'zod'
import { AUTH_BASE_URL, GITHUB_CLIENT_ID } from '@/apps/hub/config'
import { codeChallenge, randomString } from '@/apps/hub/auth/pkce'

/** GitHub App sign-in (web flow + PKCE). The code→token swap goes through our /api function. */

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1),
  refresh_token_expires_in: z.number().positive(),
})

export interface Session {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

export type AuthErrorCode = 'state_mismatch' | 'cancelled' | 'exchange_failed' | 'refresh_failed' | 'expired' | 'not_configured'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message: string = code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export interface AuthDeps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  fetch: typeof fetch
  now: () => number
}

const STATE_KEY = 'hub-oauth-state'
const VERIFIER_KEY = 'hub-oauth-verifier'

const browserDeps = (): AuthDeps => ({ storage: sessionStorage, fetch: (...args) => fetch(...args), now: Date.now })

export function buildAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', p.clientId)
  url.searchParams.set('redirect_uri', p.redirectUri)
  url.searchParams.set('state', p.state)
  url.searchParams.set('code_challenge', p.challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export function hasAuthCallback(search: string): boolean {
  const q = new URLSearchParams(search)
  return q.has('state') && (q.has('code') || q.has('error'))
}

export async function startSignIn(
  origin: string = window.location.origin,
  deps: AuthDeps = browserDeps(),
  go: (url: string) => void = (url) => window.location.assign(url),
  clientId: string = GITHUB_CLIENT_ID,
): Promise<void> {
  if (!clientId) throw new AuthError('not_configured')
  const state = randomString(16)
  const verifier = randomString(32)
  deps.storage.setItem(STATE_KEY, state)
  deps.storage.setItem(VERIFIER_KEY, verifier)
  go(buildAuthorizeUrl({ clientId, redirectUri: `${origin}/`, state, challenge: await codeChallenge(verifier) }))
}

async function postToken(body: Record<string, string>, deps: AuthDeps, failCode: AuthErrorCode): Promise<Session> {
  const res = await deps.fetch(`${AUTH_BASE_URL}/github/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  // 5xx = GitHub or our function is down or misconfigured, not a rejected grant: don't let session.ts sign the user out.
  if (res.status >= 500) throw new Error('GitHub is unavailable')
  const parsed = tokenResponseSchema.safeParse(await res.json().catch(() => null))
  if (!res.ok || !parsed.success) throw new AuthError(failCode)
  const now = deps.now()
  return {
    accessToken: parsed.data.access_token,
    accessExpiresAt: now + parsed.data.expires_in * 1000,
    refreshToken: parsed.data.refresh_token,
    refreshExpiresAt: now + parsed.data.refresh_token_expires_in * 1000,
  }
}

export async function completeSignIn(search: string, deps: AuthDeps = browserDeps()): Promise<Session> {
  const q = new URLSearchParams(search)
  const state = deps.storage.getItem(STATE_KEY)
  const verifier = deps.storage.getItem(VERIFIER_KEY)
  deps.storage.removeItem(STATE_KEY)
  deps.storage.removeItem(VERIFIER_KEY)
  if (!state || !verifier || q.get('state') !== state) throw new AuthError('state_mismatch')
  if (q.has('error') || !q.get('code')) throw new AuthError('cancelled', 'Sign-in was cancelled')
  return postToken({ code: q.get('code')!, code_verifier: verifier }, deps, 'exchange_failed')
}

export function refreshSession(refreshToken: string, deps: AuthDeps = browserDeps()): Promise<Session> {
  return postToken({ refresh_token: refreshToken }, deps, 'refresh_failed')
}
