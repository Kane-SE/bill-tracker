import { describe, expect, it, vi } from 'vitest'
import { handleTokenRequest } from '../../api/github/token'

const env = { GITHUB_CLIENT_ID: 'Iv1.client', GITHUB_CLIENT_SECRET: 'shh-secret' }
const tokens = { access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600, token_type: 'bearer', scope: '' }
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://nook.example/api/github/token', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
const github = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))

describe('POST /api/github/token', () => {
  it('exchanges a code with the secret and returns only token fields', async () => {
    const fetchImpl = github(tokens)
    const res = await handleTokenRequest(post({ code: 'c0de', code_verifier: 'v'.repeat(43) }), env, fetchImpl)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ access_token: 'ghu_a', expires_in: 28800, refresh_token: 'ghr_r', refresh_token_expires_in: 15897600 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://github.com/login/oauth/access_token')
    expect(JSON.parse(init.body as string)).toEqual({ client_id: 'Iv1.client', client_secret: 'shh-secret', code: 'c0de', code_verifier: 'v'.repeat(43) })
  })

  it('passes a refresh grant through', async () => {
    const fetchImpl = github(tokens)
    await handleTokenRequest(post({ refresh_token: 'ghr_r' }), env, fetchImpl)
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'ghr_r' })
  })

  it('rejects extra or missing fields', async () => {
    expect((await handleTokenRequest(post({ code: 'c', code_verifier: 'v'.repeat(43), client_secret: 'x' }), env, github(tokens))).status).toBe(400)
    expect((await handleTokenRequest(post({}), env, github(tokens))).status).toBe(400)
  })

  it('rejects other methods and other origins', async () => {
    const get = new Request('https://nook.example/api/github/token')
    expect((await handleTokenRequest(get, env, github(tokens))).status).toBe(405)
    const res = await handleTokenRequest(post({ refresh_token: 'r' }, { origin: 'https://evil.example' }), env, github(tokens))
    expect(res.status).toBe(403)
  })

  it('maps a GitHub error to 400 without echoing the secret', async () => {
    const res = await handleTokenRequest(post({ refresh_token: 'bad' }), env, github({ error: 'bad_refresh_token' }))
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('bad_refresh_token')
    expect(text).not.toContain('shh-secret')
  })

  it('reports a missing server config and an unreachable GitHub', async () => {
    expect((await handleTokenRequest(post({ refresh_token: 'r' }), {}, github(tokens))).status).toBe(500)
    const down = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect((await handleTokenRequest(post({ refresh_token: 'r' }), env, down)).status).toBe(502)
  })
})

describe('POST /api/github/token: origin handling', () => {
  it.each(['null', 'not a url'])('rejects an unparseable Origin (%s) with 403 and never calls GitHub', async (origin) => {
    const fetchImpl = github(tokens)
    const res = await handleTokenRequest(post({ refresh_token: 'r' }, { origin }), env, fetchImpl)
    expect(res.status).toBe(403)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ error: 'forbidden_origin' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('accepts a request whose Origin matches the request host', async () => {
    const fetchImpl = github(tokens)
    const res = await handleTokenRequest(post({ refresh_token: 'r' }, { origin: 'https://nook.example' }), env, fetchImpl)
    expect(res.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/github/token: upstream failures', () => {
  const upstream = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }))

  it('answers 502 when GitHub itself fails (non-2xx)', async () => {
    const html = await handleTokenRequest(post({ refresh_token: 'r' }), env, upstream('<html>Service Unavailable</html>', 503))
    expect(html.status).toBe(502)
    expect(await html.json()).toEqual({ error: 'github_error' })
    const limited = await handleTokenRequest(post({ refresh_token: 'r' }), env, upstream('{"message":"slow down"}', 429))
    expect(limited.status).toBe(502)
    expect(await limited.json()).toEqual({ error: 'github_error' })
  })

  it('reports bad client credentials as a server config problem without echoing GitHub or the secrets', async () => {
    const res = await handleTokenRequest(post({ refresh_token: 'r' }), env, upstream(JSON.stringify({ error: 'incorrect_client_credentials' })))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: 'server_not_configured' })
    expect(text).not.toContain('incorrect_client_credentials')
    expect(text).not.toContain('Iv1.client')
    expect(text).not.toContain('shh-secret')
  })

  it('answers 502 when a 2xx body is not usable tokens or an error', async () => {
    const noRefresh = await handleTokenRequest(post({ refresh_token: 'r' }), env, upstream(JSON.stringify({ access_token: 'x' })))
    expect(noRefresh.status).toBe(502)
    expect(await noRefresh.json()).toEqual({ error: 'bad_upstream_response' })
    const notJson = await handleTokenRequest(post({ refresh_token: 'r' }), env, upstream('<html>oops</html>'))
    expect(notJson.status).toBe(502)
    expect(await notJson.json()).toEqual({ error: 'bad_upstream_response' })
  })

  it('returns only the error code, never GitHub error_description (which could echo the request body)', async () => {
    const echoing = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      new Response(JSON.stringify({ error: 'bad_refresh_token', error_description: String(init?.body) }), { status: 200 }))
    const res = await handleTokenRequest(post({ refresh_token: 'bad' }), env, echoing)
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: 'bad_refresh_token' })
    expect(text).not.toContain('shh-secret')
  })

  it('gives the GitHub call a timeout signal', async () => {
    const fetchImpl = github(tokens)
    await handleTokenRequest(post({ refresh_token: 'r' }), env, fetchImpl)
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('never follows a redirect, so the client secret cannot be re-posted to another host', async () => {
    const fetchImpl = github(tokens)
    await handleTokenRequest(post({ code: 'c0de', code_verifier: 'v'.repeat(43) }), env, fetchImpl)
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.redirect).toBe('error')
  })
})
