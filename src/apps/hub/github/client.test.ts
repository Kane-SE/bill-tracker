import { describe, expect, it, vi } from 'vitest'
import { ConflictError, createGitHubClient, GitHubError } from './client'
import { encodeBase64Utf8 } from '@/apps/hub/lib/text'

type Handler = (url: string, init: RequestInit) => Response
function setup(handler: Handler) {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => handler(url, init))
  const refreshToken = vi.fn(async () => 'fresh')
  const client = createGitHubClient({ repo: 'Kane-SE/personal-hub', fetch: fetchImpl as unknown as typeof fetch, getToken: async () => 'tok', refreshToken })
  return { client, fetchImpl, refreshToken }
}
const res = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers })

describe('GitHub client', () => {
  it('decodes a file and returns its sha and etag', async () => {
    const { client, fetchImpl } = setup(() => res(200, { type: 'file', content: encodeBase64Utf8('Đặt món 🍜\n'), sha: 'abc' }, { etag: 'W/"1"' }))
    expect(await client.getFile('ideas.md')).toEqual({ status: 'ok', etag: 'W/"1"', value: { text: 'Đặt món 🍜\n', sha: 'abc' } })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/Kane-SE/personal-hub/contents/ideas.md')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('sends If-None-Match and reports not-modified and missing files', async () => {
    const { client, fetchImpl } = setup((url) => (url.endsWith('ideas.md') ? res(304) : res(404, { message: 'Not Found' })))
    expect(await client.getFile('ideas.md', 'W/"1"')).toEqual({ status: 'not-modified' })
    expect((fetchImpl.mock.calls[0][1].headers as Record<string, string>)['if-none-match']).toBe('W/"1"')
    expect(await client.getFile('projects.md')).toEqual({ status: 'missing' })
  })

  it('lists a directory and treats a file at that path as missing', async () => {
    const { client } = setup((url) =>
      url.endsWith('/now') ? res(200, [{ name: 'a.md', path: 'now/a.md', type: 'file' }, { name: 'x', path: 'now/x', type: 'dir' }]) : res(200, { type: 'file', content: '', sha: 's' }),
    )
    expect(await client.listDir('now')).toEqual({ status: 'ok', etag: null, value: [{ name: 'a.md', path: 'now/a.md', type: 'file' }, { name: 'x', path: 'now/x', type: 'dir' }] })
    expect(await client.listDir('ideas.md')).toEqual({ status: 'missing' })
  })

  it('retries once with a refreshed token after a 401', async () => {
    const { client, refreshToken, fetchImpl } = setup((_url, init) =>
      (init.headers as Record<string, string>).authorization === 'Bearer fresh' ? res(200, { login: 'kane', avatar_url: 'https://a/1' }) : res(401),
    )
    expect(await client.getUser()).toEqual({ login: 'kane', avatarUrl: 'https://a/1' })
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('writes UTF-8 base64 with the sha and maps 409/422 to ConflictError', async () => {
    const { client, fetchImpl } = setup((_url, init) => {
      const body = JSON.parse(init.body as string)
      return body.sha === 'stale' ? res(409, { message: 'conflict' }) : res(200, { content: { sha: 'new' } })
    })
    expect(await client.putFile('ideas.md', 'Ý tưởng\n', 'abc', 'hub: add idea "x"')).toEqual({ sha: 'new' })
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body as string)
    expect(sent).toEqual({ message: 'hub: add idea "x"', content: encodeBase64Utf8('Ý tưởng\n'), sha: 'abc' })
    await expect(client.putFile('ideas.md', 'x', 'stale', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('omits sha when creating a file and reports other failures as GitHubError', async () => {
    const { client, fetchImpl } = setup((_url, init) => (init.method === 'PUT' ? res(201, { content: { sha: 'n' } }) : res(500)))
    await client.putFile('ideas.md', 'x', null, 'm')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).not.toHaveProperty('sha')
    await expect(client.getFile('ideas.md')).rejects.toBeInstanceOf(GitHubError)
  })

  it('checks access: 404/403 mean no access', async () => {
    expect(await setup(() => res(200, {})).client.checkAccess()).toBe(true)
    expect(await setup(() => res(404)).client.checkAccess()).toBe(false)
    expect(await setup(() => res(403)).client.checkAccess()).toBe(false)
  })
})
