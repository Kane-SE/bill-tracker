import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codeChallenge } from './pkce'
import { AuthError, buildAuthorizeUrl, completeSignIn, hasAuthCallback, refreshSession, startSignIn, type AuthDeps, type Session } from './github-auth'
import { AUTH_STORAGE_KEY, useAuthStore } from './useAuthStore'
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

  it('rejects a callback with no usable stored state before calling the server', async () => {
    const callbacks = ['?code=x&state=', '?code=x']
    for (const search of callbacks) {
      const fetchImpl = ok(tokenBody)
      await expect(completeSignIn(search, { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 })).rejects.toMatchObject({ code: 'state_mismatch' })
      expect(fetchImpl).not.toHaveBeenCalled()
    }
    // each half of the stored pair is needed on its own
    for (const [key, search] of [['hub-oauth-state', '?code=x&state=s'], ['hub-oauth-verifier', '?code=x']] as const) {
      const storage = memoryStorage()
      storage.setItem(key, 's')
      const fetchImpl = ok(tokenBody)
      await expect(completeSignIn(search, { storage, fetch: fetchImpl, now: () => 0 })).rejects.toMatchObject({ code: 'state_mismatch' })
      expect(fetchImpl).not.toHaveBeenCalled()
    }
  })

  it('does not let a callback be replayed', async () => {
    const storage = memoryStorage()
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage, fetch: fetchImpl, now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const search = `?code=abc&state=${new URL(target).searchParams.get('state')!}`
    await completeSignIn(search, deps)
    expect(storage.getItem('hub-oauth-state')).toBeNull()
    expect(storage.getItem('hub-oauth-verifier')).toBeNull()
    await expect(completeSignIn(search, deps)).rejects.toMatchObject({ code: 'state_mismatch' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('binds the authorize request to the verifier sent later and to the app origin', async () => {
    const fetchImpl = ok(tokenBody)
    const deps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const params = new URL(target).searchParams
    await completeSignIn(`?code=abc&state=${params.get('state')!}`, deps)
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(params.get('code_challenge')).toBe(await codeChallenge(sent.code_verifier))
    expect(params.get('redirect_uri')).toBe('https://nook.example/')
  })

  it('does not treat a half callback as a callback', () => {
    expect(hasAuthCallback('?code=a')).toBe(false)
    expect(hasAuthCallback('?state=b')).toBe(false)
  })

  it('gives the code exchange a timeout and fails it as a network TypeError instead of hanging', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    const deps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl as unknown as typeof fetch, now: () => 0 }
    let target = ''
    await startSignIn('https://nook.example', deps, (url) => { target = url }, 'Iv1.test')
    const state = new URL(target).searchParams.get('state')!
    const error = await completeSignIn(`?code=abc&state=${state}`, deps).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TypeError)
    expect(error).not.toBeInstanceOf(AuthError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
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

  it.each(['TimeoutError', 'AbortError'])('treats a refresh that ended in %s as offline: TypeError, nobody signed out', async (name) => {
    useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException('The operation timed out.', name)
    })
    const authDeps: AuthDeps = { storage: memoryStorage(), fetch: fetchImpl as unknown as typeof fetch, now: () => 0 }
    const direct = await refreshSession('r', authDeps).catch((e: unknown) => e)
    expect(direct).toBeInstanceOf(TypeError)
    expect(direct).not.toBeInstanceOf(AuthError)
    const viaSession = await forceRefresh({ now: () => 0, refresh: (token) => refreshSession(token, authDeps) }).catch((e: unknown) => e)
    expect(viaSession).toBeInstanceOf(TypeError)
    expect(useAuthStore.getState().session).toEqual(base)
    expect(useAuthStore.getState().access).toBe('ok')
  })

  it('lets a plain network TypeError from the token request through as the same object', async () => {
    const offline = new TypeError('Failed to fetch')
    const fetchImpl = vi.fn(async () => {
      throw offline
    })
    await expect(refreshSession('r', { storage: memoryStorage(), fetch: fetchImpl, now: () => 0 })).rejects.toBe(offline)
  })

  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
  const settled = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e)

  it('does not undo a sign-out made while a refresh is in flight', async () => {
    useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
    const pending = deferred<Session>()
    const refresh = vi.fn(() => pending.promise)
    const outcome = settled(forceRefresh({ now: () => 0, refresh }))
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    useAuthStore.getState().signOut()
    pending.resolve({ ...base, accessToken: 'new', refreshToken: 'r2' })
    expect(await outcome).toMatchObject({ code: 'expired' })
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toContain('"session":null')
  })

  it('does not let a rejected stale refresh clear a newer session', async () => {
    useAuthStore.setState({ session: base })
    const pending = deferred<Session>()
    const refresh = vi.fn(() => pending.promise)
    const outcome = settled(forceRefresh({ now: () => 0, refresh }))
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const newer: Session = { accessToken: 'newer', accessExpiresAt: 50_000_000, refreshToken: 'r-newer', refreshExpiresAt: 99_000_000 }
    useAuthStore.setState({ session: newer })
    pending.reject(new AuthError('refresh_failed'))
    expect(await outcome).toMatchObject({ code: 'refresh_failed' })
    expect(useAuthStore.getState().session).toEqual(newer)
  })

  it('does not overwrite a newer session when a stale refresh succeeds', async () => {
    useAuthStore.setState({ session: base })
    const pending = deferred<Session>()
    const refresh = vi.fn(() => pending.promise)
    const result = forceRefresh({ now: () => 0, refresh })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const newer: Session = { accessToken: 'newer', accessExpiresAt: 50_000_000, refreshToken: 'r-newer', refreshExpiresAt: 99_000_000 }
    useAuthStore.setState({ session: newer })
    pending.resolve({ ...base, accessToken: 'stale-result', refreshToken: 'r-stale' })
    expect(await result).toBe('newer')
    expect(useAuthStore.getState().session).toEqual(newer)
  })

  it('passes an in-flight refresh failure on to every caller that joined it, then refreshes anew', async () => {
    useAuthStore.setState({ session: base })
    const pending = deferred<Session>()
    const refresh = vi.fn(() => pending.promise)
    const deps = { now: () => 9_900_000, refresh }
    const owner = settled(forceRefresh(deps))
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const joiners = [settled(getAccessToken(deps)), settled(forceRefresh(deps))]
    const offline = new TypeError('offline')
    pending.reject(offline)
    expect(await owner).toBe(offline)
    for (const error of await Promise.all(joiners)) expect(error).toBe(offline)
    expect(refresh).toHaveBeenCalledTimes(1)
    // The failed refresh no longer counts as in flight: the next call starts its own.
    const next: Session = { accessToken: 'fresh', accessExpiresAt: 60_000_000, refreshToken: 'r-fresh', refreshExpiresAt: 99_000_000 }
    refresh.mockImplementationOnce(async () => next)
    expect(await forceRefresh(deps)).toBe('fresh')
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  describe('another tab already refreshed', () => {
    const persistNewer = (session: Session) =>
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { session, user: null, access: 'unknown' }, version: 0 }))

    it.each([
      ['getAccessToken', getAccessToken],
      ['forceRefresh', forceRefresh],
    ])('%s adopts the persisted session instead of spending the old refresh token', async (_name, call) => {
      useAuthStore.setState({ session: base })
      const newer: Session = { accessToken: 'newer', accessExpiresAt: 50_000_000, refreshToken: 'r-newer', refreshExpiresAt: 99_000_000 }
      persistNewer(newer)
      const refresh = vi.fn(async () => ({ ...base, accessToken: 'unexpected', refreshToken: 'r-unexpected', accessExpiresAt: 60_000_000 }))
      expect(await call({ now: () => 9_900_000, refresh })).toBe('newer')
      expect(refresh).not.toHaveBeenCalled()
      expect(useAuthStore.getState().session).toEqual(newer)
    })

    it('refreshes with the persisted refresh token when that session is itself about to expire', async () => {
      useAuthStore.setState({ session: base })
      persistNewer({ accessToken: 'newer', accessExpiresAt: 9_950_000, refreshToken: 'r-newer', refreshExpiresAt: 99_000_000 })
      const next: Session = { accessToken: 'fresh', accessExpiresAt: 60_000_000, refreshToken: 'r-fresh', refreshExpiresAt: 99_000_000 }
      const refresh = vi.fn(async () => next)
      expect(await forceRefresh({ now: () => 9_900_000, refresh })).toBe('fresh')
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(refresh).toHaveBeenCalledWith('r-newer')
      expect(useAuthStore.getState().session).toEqual(next)
    })

    it('signs this tab out when another tab signed out', async () => {
      useAuthStore.setState({ session: base })
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { session: null, user: null, access: 'unknown' }, version: 0 }))
      const refresh = vi.fn()
      await expect(forceRefresh({ now: () => 9_900_000, refresh })).rejects.toMatchObject({ code: 'expired' })
      expect(refresh).not.toHaveBeenCalled()
      expect(useAuthStore.getState().session).toBeNull()
    })

    // The concurrent case: both tabs spent the same single-use refresh token while it was still the stored one.
    const persisted = () => JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!).state.session as Session | null
    const newer: Session = { accessToken: 'newer', accessExpiresAt: 50_000_000, refreshToken: 'r1', refreshExpiresAt: 99_000_000 }

    it('adopts the session the winning tab stored instead of signing out when this refresh is rejected', async () => {
      useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
      const pending = deferred<Session>()
      const refresh = vi.fn(() => pending.promise)
      const outcome = settled(forceRefresh({ now: () => 0, refresh }))
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
      persistNewer(newer)
      pending.reject(new AuthError('refresh_failed'))
      expect(await outcome).toMatchObject({ code: 'refresh_failed' })
      expect(useAuthStore.getState().session).toEqual(newer)
      expect(persisted()).toEqual(newer)
    })

    // A persisted `null` can be a race loser's rejected refresh, not a sign-out, and by now GitHub has rotated the old
    // refresh token: the fresh session is the only live grant, so it must win over a persisted `null`.
    it('keeps its fresh session when storage was nulled while the refresh was in flight', async () => {
      useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
      const pending = deferred<Session>()
      const refresh = vi.fn(() => pending.promise)
      const result = forceRefresh({ now: () => 0, refresh })
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { session: null, user: null, access: 'unknown' }, version: 0 }))
      const fresh: Session = { accessToken: 'fresh', accessExpiresAt: 60_000_000, refreshToken: 'r-fresh', refreshExpiresAt: 99_000_000 }
      pending.resolve(fresh)
      expect(await result).toBe('fresh')
      expect(useAuthStore.getState().session).toEqual(fresh)
      expect(persisted()).toEqual(fresh)
    })

    it('survives the two-tab race when the loser is rejected first and has already persisted null', async () => {
      useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
      // A second tab: a separate module graph (own store, own `refreshing`) over the same storage.
      vi.resetModules()
      const tabB = {
        auth: await import('./github-auth'),
        store: (await import('./useAuthStore')).useAuthStore,
        session: await import('./session'),
      }
      expect(tabB.store).not.toBe(useAuthStore)
      expect(tabB.store.getState().session).toEqual(base)

      const winner = deferred<Session>()
      const loser = deferred<Session>()
      const refreshA = vi.fn(() => winner.promise)
      const refreshB = vi.fn(() => loser.promise)
      const resultA = forceRefresh({ now: () => 0, refresh: refreshA })
      const resultB = settled(tabB.session.forceRefresh({ now: () => 0, refresh: refreshB }))
      await vi.waitFor(() => {
        expect(refreshA).toHaveBeenCalledWith('r')
        expect(refreshB).toHaveBeenCalledWith('r')
      })

      // GitHub rejects the loser first: it signs itself out and persists null...
      loser.reject(new tabB.auth.AuthError('refresh_failed'))
      expect(await resultB).toMatchObject({ code: 'refresh_failed' })
      expect(persisted()).toBeNull()

      // ...then the winner's grant arrives, and it is the only live one.
      const s1: Session = { accessToken: 's1', accessExpiresAt: 50_000_000, refreshToken: 'r1', refreshExpiresAt: 99_000_000 }
      winner.resolve(s1)
      expect(await resultA).toBe('s1')
      expect(useAuthStore.getState().session).toEqual(s1)
      expect(persisted()).toEqual(s1)

      const s2: Session = { accessToken: 's2', accessExpiresAt: 60_000_000, refreshToken: 'r2', refreshExpiresAt: 99_000_000 }
      const refreshAgain = vi.fn(async () => s2)
      expect(await forceRefresh({ now: () => 0, refresh: refreshAgain })).toBe('s2')
      expect(refreshAgain).toHaveBeenCalledWith('r1')
      expect(persisted()).toEqual(s2)
    })

    it('does not overwrite a newer session another tab stored while this refresh was in flight', async () => {
      useAuthStore.setState({ session: base })
      const pending = deferred<Session>()
      const refresh = vi.fn(() => pending.promise)
      const result = forceRefresh({ now: () => 0, refresh })
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
      persistNewer(newer)
      pending.resolve({ accessToken: 'late', accessExpiresAt: 60_000_000, refreshToken: 'r-late', refreshExpiresAt: 99_000_000 })
      expect(await result).toBe('newer')
      expect(persisted()).toEqual(newer)
      expect(useAuthStore.getState().session).toEqual(newer)
    })

    // Loser-first race through the real session code in two module graphs (own store, own `refreshing`, same storage):
    // this tab (A) and tab B both spend r; GitHub rejects B first and B persists its sign-out; A's 200 is still pending.
    const persistedState = () => JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!).state
    const outcome = <T>(p: Promise<T>) => p.then((value) => ({ value }), (error: unknown) => ({ error }))
    const s1: Session = { accessToken: 's1', accessExpiresAt: 50_000_000, refreshToken: 'r1', refreshExpiresAt: 99_000_000 }
    async function loserRejectedFirst() {
      vi.resetModules()
      const tabB = {
        auth: await import('./github-auth'),
        store: (await import('./useAuthStore')).useAuthStore,
        session: await import('./session'),
      }
      expect(tabB.store).not.toBe(useAuthStore)
      expect(tabB.store.getState().session).toEqual(base)
      const winner = deferred<Session>()
      const loser = deferred<Session>()
      const refreshA = vi.fn(() => winner.promise)
      const refreshB = vi.fn(() => loser.promise)
      const resultA = outcome(forceRefresh({ now: () => 9_900_000, refresh: refreshA }))
      const resultB = settled(tabB.session.forceRefresh({ now: () => 9_900_000, refresh: refreshB }))
      await vi.waitFor(() => {
        expect(refreshA).toHaveBeenCalledWith('r')
        expect(refreshB).toHaveBeenCalledWith('r')
      })
      loser.reject(new tabB.auth.AuthError('refresh_failed'))
      expect(await resultB).toMatchObject({ code: 'refresh_failed' })
      expect(persistedState()).toEqual({ session: null, user: null, access: 'unknown' })
      return { winner, refreshA, resultA }
    }

    it.each([
      ['getAccessToken', getAccessToken],
      ['forceRefresh', forceRefresh],
    ])('a second %s caller joins the winning refresh instead of adopting the loser null', async (_name, call) => {
      useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
      const { winner, refreshA, resultA } = await loserRejectedFirst()
      // Another caller in this tab needs a token while this tab's refresh is still in flight.
      const joined = outcome(call({ now: () => 9_900_000, refresh: refreshA }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      winner.resolve(s1)
      expect(await joined).toEqual({ value: 's1' })
      expect(await resultA).toEqual({ value: 's1' })
      expect(refreshA).toHaveBeenCalledTimes(1)
      expect(useAuthStore.getState().session).toEqual(s1)
      expect(persisted()).toEqual(s1)
    })

    it('keeps this tab user and access when it wins against a loser that was rejected first', async () => {
      const user = { login: 'k', avatarUrl: 'https://avatars.example/k' }
      useAuthStore.setState({ session: base, user, access: 'ok' })
      const { winner, resultA } = await loserRejectedFirst()
      winner.resolve(s1)
      expect(await resultA).toEqual({ value: 's1' })
      expect(useAuthStore.getState()).toMatchObject({ session: s1, user, access: 'ok' })
      expect(persistedState()).toEqual({ session: s1, user, access: 'ok' })
    })

    it('keeps the user and access it adopted along with a newer session another tab stored', async () => {
      useAuthStore.setState({ session: base, user: { login: 'k', avatarUrl: '' }, access: 'ok' })
      const pending = deferred<Session>()
      const refresh = vi.fn(() => pending.promise)
      const result = forceRefresh({ now: () => 0, refresh })
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
      // e.g. a fresh sign-in in the other tab whose account is not known yet
      persistNewer(newer)
      pending.resolve({ accessToken: 'late', accessExpiresAt: 60_000_000, refreshToken: 'r-late', refreshExpiresAt: 99_000_000 })
      expect(await result).toBe('newer')
      expect(useAuthStore.getState()).toMatchObject({ session: newer, user: null, access: 'unknown' })
      expect(persistedState()).toEqual({ session: newer, user: null, access: 'unknown' })
    })
  })

  it('still refreshes from memory when persistence is unavailable', async () => {
    useAuthStore.setState({ session: base })
    const next: Session = { accessToken: 'fresh', accessExpiresAt: 60_000_000, refreshToken: 'r-fresh', refreshExpiresAt: 99_000_000 }
    const refresh = vi.fn(async () => next)
    const original = useAuthStore.persist
    Object.defineProperty(useAuthStore, 'persist', { value: undefined, configurable: true, writable: true })
    try {
      expect(await forceRefresh({ now: () => 9_900_000, refresh })).toBe('fresh')
    } finally {
      Object.defineProperty(useAuthStore, 'persist', { value: original, configurable: true, writable: true })
    }
    expect(refresh).toHaveBeenCalledWith('r')
    expect(useAuthStore.getState().session).toEqual(next)
  })

  it('keeps the new session in memory when persisting it fails', async () => {
    useAuthStore.setState({ session: base })
    const next: Session = { accessToken: 'fresh', accessExpiresAt: 60_000_000, refreshToken: 'r-fresh', refreshExpiresAt: 99_000_000 }
    const refresh = vi.fn(async () => next)
    const realSetItem = localStorage.setItem.bind(localStorage)
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (value.includes('r-fresh')) throw new Error('QuotaExceededError')
      realSetItem(key, value)
    })
    try {
      expect(await forceRefresh({ now: () => 9_900_000, refresh })).toBe('fresh')
      expect(setItem).toHaveBeenCalled()
    } finally {
      setItem.mockRestore()
    }
    expect(useAuthStore.getState().session).toEqual(next)
  })

  it('still signs out on a rejected grant when persistence is unavailable', async () => {
    useAuthStore.setState({ session: base })
    const refresh = vi.fn(async () => { throw new AuthError('refresh_failed') })
    const original = useAuthStore.persist
    Object.defineProperty(useAuthStore, 'persist', { value: undefined, configurable: true, writable: true })
    try {
      await expect(forceRefresh({ now: () => 9_900_000, refresh })).rejects.toMatchObject({ code: 'refresh_failed' })
    } finally {
      Object.defineProperty(useAuthStore, 'persist', { value: original, configurable: true, writable: true })
    }
    expect(useAuthStore.getState().session).toBeNull()
  })
})
