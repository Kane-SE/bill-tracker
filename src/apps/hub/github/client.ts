import { decodeBase64Utf8, encodeBase64Utf8 } from '@/apps/hub/lib/text'

/** Minimal GitHub REST client for the hub repo. The only module that talks to api.github.com. */

const API = 'https://api.github.com'

export interface RemoteFile {
  text: string
  sha: string
}

export interface DirEntry {
  name: string
  path: string
  type: string
}

export type Fetched<T> = { status: 'ok'; value: T; etag: string | null } | { status: 'not-modified' } | { status: 'missing' }

export class GitHubError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

/** The file changed on GitHub since we read it (sha mismatch). */
export class ConflictError extends GitHubError {
  constructor() {
    super(409, 'File changed on GitHub')
    this.name = 'ConflictError'
  }
}

export interface ClientDeps {
  repo: string
  fetch: typeof fetch
  getToken: () => Promise<string>
  refreshToken: () => Promise<string>
}

export interface GitHubClient {
  getUser(): Promise<{ login: string; avatarUrl: string }>
  checkAccess(): Promise<boolean>
  listDir(path: string, etag?: string | null): Promise<Fetched<DirEntry[]>>
  getFile(path: string, etag?: string | null): Promise<Fetched<RemoteFile>>
  putFile(path: string, text: string, sha: string | null, message: string): Promise<{ sha: string }>
}

export function createGitHubClient(deps: ClientDeps): GitHubClient {
  async function request(path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<Response> {
    const send = (token: string) =>
      deps.fetch(`${API}${path}`, {
        method: init.method ?? 'GET',
        body: init.body,
        cache: 'no-store',
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          authorization: `Bearer ${token}`,
          ...init.headers,
        },
      })
    const first = await send(await deps.getToken())
    if (first.status !== 401) return first
    return send(await deps.refreshToken())
  }

  const contents = (path: string) => `/repos/${deps.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const conditional = (etag?: string | null) => (etag ? { headers: { 'if-none-match': etag } } : {})

  return {
    async getUser() {
      const res = await request('/user')
      if (!res.ok) throw new GitHubError(res.status, 'Could not load your GitHub profile')
      const body = await res.json()
      return { login: String(body.login), avatarUrl: String(body.avatar_url ?? '') }
    },

    async checkAccess() {
      const res = await request(`/repos/${deps.repo}`)
      if (res.ok) return true
      if (res.status === 404 || res.status === 403) return false
      throw new GitHubError(res.status, 'Could not check access to the hub repo')
    },

    async listDir(path, etag) {
      const res = await request(contents(path), conditional(etag))
      if (res.status === 304) return { status: 'not-modified' }
      if (res.status === 404) return { status: 'missing' }
      if (!res.ok) throw new GitHubError(res.status, `Could not list ${path}`)
      const body = await res.json()
      if (!Array.isArray(body)) return { status: 'missing' }
      const value = body.map((e: { name: string; path: string; type: string }) => ({ name: String(e.name), path: String(e.path), type: String(e.type) }))
      return { status: 'ok', value, etag: res.headers.get('etag') }
    },

    async getFile(path, etag) {
      const res = await request(contents(path), conditional(etag))
      if (res.status === 304) return { status: 'not-modified' }
      if (res.status === 404) return { status: 'missing' }
      if (!res.ok) throw new GitHubError(res.status, `Could not load ${path}`)
      const body = await res.json()
      if (Array.isArray(body) || typeof body.content !== 'string') throw new GitHubError(422, `${path} is not a file`)
      return { status: 'ok', value: { text: decodeBase64Utf8(body.content), sha: String(body.sha) }, etag: res.headers.get('etag') }
    },

    async putFile(path, text, sha, message) {
      const res = await request(contents(path), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, content: encodeBase64Utf8(text), ...(sha ? { sha } : {}) }),
      })
      if (res.status === 409 || res.status === 422) throw new ConflictError()
      if (!res.ok) throw new GitHubError(res.status, `Could not save ${path}`)
      const body = await res.json()
      return { sha: String(body.content.sha) }
    },
  }
}
