import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codeChallenge } from './pkce'
import { AuthError, buildAuthorizeUrl, completeSignIn, hasAuthCallback, refreshSession, startSignIn, type AuthDeps, type Session } from './github-auth'
import { useAuthStore } from './useAuthStore'
import { forceRefresh, getAccessToken } from './session'

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}
const tokenBody = { access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600 }
const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))

describe('pkce', () => {
  it('matches the RFC 7636 test vector', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('sign-in', () => {
  it('builds the authorize URL with PKCE', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'Iv1.x', redirectUri: 'https://nook.example/', state: 's', challenge: 'c' }))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: 'Iv1.x', redirect_uri: 'https://nook.example/', state: 's', code_challenge: 'c', code_challenge_method: 'S256' })
  })

  it('recognises a callback, including a cancelled one', () => {
    expect(hasAuthCallback('?code=a&state=b')).toBe(true)
    expect(hasAuthCallback('?error=access_denied&state=b')).toBe(true)
    expect(hasAuthCallback('?hub-demo')).toBe(false)
  })

  it('completes sign-in when the state matches and clears the stored verifier', async () => {
    const storage = memoryStorage()
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage, fetch: fetchImpl, now: () => 1_000 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    const session = await completeSignIn(`?code=abc&state=${state}`, deps)
    expect(session).toEqual({ accessToken: 'ghu_a', accessExpiresAt: 1_000 + 28_800_000, refreshToken: 'ghr_r', refreshExpiresAt: 1_000 + 15_897_600_000 })
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent.code).toBe('abc')
    expect(sent.code_verifier).toHaveLength(43)
    expect(storage.getItem('hub-oauth-verifier')).toBeNull()
  })

  it('refuses to start without a client id', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok(tokenBody), now: () => 0 }
    await expect(startSignIn('https://nook.example', deps, () => {}, '')).rejects.toMatchObject({ code: 'not_configured' })
  })

  it('rejects a state mismatch', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok(tokenBody), now: () => 0 }
    await startSignIn('https://nook.example', deps, () => {}, 'Iv1.test')
    await expect(completeSignIn('?code=abc&state=forged', deps)).rejects.toMatchObject({ code: 'state_mismatch' })
  })

  it('reports a cancelled sign-in without calling the server', async () => {
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    await expect(completeSignIn(`?error=access_denied&state=${state}`, deps)).rejects.toMatchObject({ code: 'cancelled' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a malformed token response', async () => {
    const deps: AuthDeps = { storage: memoryStorage(), fetch: ok({ access_token: 'x' }), now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    await expect(completeSignIn(`?code=a&state=${state}`, deps)).rejects.toBeInstanceOf(AuthError)
  })

  it('treats a GitHub outage (HTTP 502) during refresh as a plain error, not a rejected grant', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'github_error' }), { status: 502 }))
    const deps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 }
    const error = await refreshSession('r', deps).then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(AuthError)
    expect(error).not.toBeInstanceOf(TypeError)
  })
})

describe('session', () => {
  const base: Session = { accessToken: 'old', accessExpiresAt: 10_000_000, refreshToken: 'r', refreshExpiresAt: 99_000_000 }
  beforeEach(() => useAuthStore.setState({ session: null, user: null, access: 'unknown' }))

  it('returns the current token while it has more than 5 minutes left', async () => {
    useAuthStore.setState({ session: base })
    const refresh = vi.fn()
    expect(await getAccessToken({ now: () => 0, refresh })).toBe('old')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes once even when several calls need it at the same time', async () => {
    useAuthStore.setState({ session: base })
    const next: Session = { ...base, accessToken: 'new', accessExpiresAt: 50_000_000 }
    const refresh = vi.fn(async () => next)
    const deps = { now: () => 9_900_000, refresh }
    expect(await Promise.all([getAccessToken(deps), getAccessToken(deps), forceRefresh(deps)])).toEqual(['new', 'new', 'new'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().session?.accessToken).toBe('new')
  })

  it('signs out cleanly when the refresh token has expired', async () => {
    useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
    const refresh = vi.fn()
    await expect(getAccessToken({ now: () => 100_000_000, refresh })).rejects.toMatchObject({ code: 'expired' })
    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('signs out when GitHub rejects the refresh, but keeps the session when offline', async () => {
    useAuthStore.setState({ session: base })
    await expect(forceRefresh({ now: () => 0, refresh: async () => { throw new TypeError('offline') } })).rejects.toBeInstanceOf(TypeError)
    expect(useAuthStore.getState().session).not.toBeNull()
    await expect(forceRefresh({ now: () => 0, refresh: async () => { throw new AuthError('refresh_failed') } })).rejects.toMatchObject({ code: 'refresh_failed' })
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('keeps the session when GitHub is unavailable (HTTP 502) during a refresh', async () => {
    useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: 'github_error' }), { status: 502 }))
    const authDeps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 }
    const error = await forceRefresh({ now: () => 0, refresh: (token) => refreshSession(token, authDeps) }).then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(AuthError)
    expect(useAuthStore.getState().session).toEqual(base)
    expect(useAuthStore.getState().access).toBe('ok')
  })
})
