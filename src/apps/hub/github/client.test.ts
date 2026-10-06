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

describe('GitHub client: files too large for the contents API', () => {
  it('rejects a file the API returned without content (encoding none) instead of reading it as empty', async () => {
    const { client } = setup(() => res(200, { type: 'file', encoding: 'none', content: '', size: 2_000_000, sha: 's' }))
    const err = await client.getFile('ideas.md').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err).toMatchObject({ status: 413 })
    expect((err as Error).message).toMatch(/too large/)
  })

  it('still decodes a normal base64 file that declares its encoding', async () => {
    const { client } = setup(() => res(200, { type: 'file', encoding: 'base64', content: encodeBase64Utf8('Ý tưởng\n'), size: 12, sha: 's' }, { etag: 'W/"2"' }))
    expect(await client.getFile('ideas.md')).toEqual({ status: 'ok', etag: 'W/"2"', value: { text: 'Ý tưởng\n', sha: 's' } })
  })

  it('rejects empty content for a non-empty file even when the encoding field is missing', async () => {
    const { client } = setup(() => res(200, { type: 'file', content: '', size: 5, sha: 's' }))
    await expect(client.getFile('ideas.md')).rejects.toMatchObject({ name: 'GitHubError', status: 413 })
  })

  it('still reads a genuinely empty file', async () => {
    const { client } = setup(() => res(200, { type: 'file', encoding: 'base64', content: '', size: 0, sha: 'e' }))
    expect(await client.getFile('ideas.md')).toEqual({ status: 'ok', etag: null, value: { text: '', sha: 'e' } })
  })
})

describe('GitHub client: contract paths the store relies on', () => {
  it('gives up after a second 401: one refresh, two fetches, GitHubError 401', async () => {
    const { client, refreshToken, fetchImpl } = setup(() => res(401))
    const err = await client.getFile('ideas.md').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err).toMatchObject({ status: 401 })
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('lets a network TypeError from fetch through as the same object, without refreshing', async () => {
    const offline = new TypeError('Failed to fetch')
    const { client, refreshToken } = setup(() => {
      throw offline
    })
    await expect(client.getFile('ideas.md')).rejects.toBe(offline)
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('propagates a rejecting refreshToken unchanged', async () => {
    const failure = new Error('refresh failed')
    const fetchImpl = vi.fn(async () => res(401))
    const client = createGitHubClient({ repo: 'Kane-SE/personal-hub', fetch: fetchImpl as unknown as typeof fetch, getToken: async () => 'tok', refreshToken: async () => Promise.reject(failure) })
    await expect(client.getUser()).rejects.toBe(failure)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps a 422 on PUT to ConflictError', async () => {
    const { client } = setup(() => res(422, { message: 'sha does not match' }))
    await expect(client.putFile('ideas.md', 'x', 'stale', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('reports a server error while checking access as GitHubError', async () => {
    const { client } = setup(() => res(500))
    await expect(client.checkAccess()).rejects.toBeInstanceOf(GitHubError)
  })

  it('reports not-modified for a conditional directory listing', async () => {
    const { client, fetchImpl } = setup(() => res(304))
    expect(await client.listDir('now', 'W/"3"')).toEqual({ status: 'not-modified' })
    expect((fetchImpl.mock.calls[0][1].headers as Record<string, string>)['if-none-match']).toBe('W/"3"')
  })

  it('rejects getFile on a directory listing', async () => {
    const { client } = setup(() => res(200, [{ name: 'a.md', path: 'now/a.md', type: 'file' }]))
    await expect(client.getFile('now')).rejects.toBeInstanceOf(GitHubError)
  })

  it('sends no if-none-match header when no etag is given', async () => {
    const { client, fetchImpl } = setup(() => res(404))
    await client.getFile('ideas.md')
    await client.getFile('ideas.md', null)
    await client.listDir('now')
    for (const call of fetchImpl.mock.calls) expect(call[1].headers as Record<string, string>).not.toHaveProperty('if-none-match')
  })
})

describe('GitHub client: a connection that hangs', () => {
  it('gives every request its own timeout signal, including the retry after a refresh', async () => {
    const { client, fetchImpl } = setup((_url, init) =>
      (init.headers as Record<string, string>).authorization === 'Bearer fresh' ? res(200, { login: 'kane', avatar_url: '' }) : res(401),
    )
    await client.getUser()
    const [first, retry] = fetchImpl.mock.calls.map((call) => call[1].signal)
    expect(first).toBeInstanceOf(AbortSignal)
    expect(retry).toBeInstanceOf(AbortSignal)
    expect(retry).not.toBe(first)
  })

  it.each(['TimeoutError', 'AbortError'])('reports a request that ended in %s as a network TypeError, without refreshing', async (name) => {
    const { client, refreshToken } = setup(() => {
      throw new DOMException('The operation timed out.', name)
    })
    const err = await client.getFile('ideas.md').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TypeError)
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('reports a body that times out while it is still arriving as a network TypeError', async () => {
    const { client } = setup(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new DOMException('The operation timed out.', 'TimeoutError'))
            },
          }),
          { status: 200 },
        ),
    )
    await expect(client.getFile('ideas.md')).rejects.toBeInstanceOf(TypeError)
  })

  it('still lets a malformed JSON body fail as itself', async () => {
    const { client } = setup(() => new Response('<html>', { status: 200 }))
    await expect(client.getFile('ideas.md')).rejects.toBeInstanceOf(SyntaxError)
  })
})
