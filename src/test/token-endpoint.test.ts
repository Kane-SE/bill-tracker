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
