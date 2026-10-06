import { decodeBase64Utf8, encodeBase64Utf8 } from '@/apps/hub/lib/text'
import { asNetworkError, REQUEST_TIMEOUT_MS, timeoutSignal } from '@/apps/hub/lib/net'

/** Minimal GitHub REST client for the hub repo. The only module that talks to api.github.com. */

const API = 'https://api.github.com'

/** The timeout signal also covers the body: one that stops arriving counts as offline too. Bad JSON still fails as itself. */
const readJson = (res: Response) =>
  res.json().catch((error: unknown) => {
    throw asNetworkError(error)
  })

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
  /** Called when a request is still 401 after a token refresh: GitHub no longer accepts this sign-in. */
  onSessionInvalid?: () => void
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
    const send = async (token: string) => {
      try {
        return await deps.fetch(`${API}${path}`, {
          method: init.method ?? 'GET',
          body: init.body,
          cache: 'no-store',
          headers: {
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            authorization: `Bearer ${token}`,
            ...init.headers,
          },
          // A phone can report "online" over a dead connection, where fetch would hang for minutes.
          signal: timeoutSignal(REQUEST_TIMEOUT_MS),
        })
      } catch (error) {
        throw asNetworkError(error)
      }
    }
    const first = await send(await deps.getToken())
    if (first.status !== 401) return first
    const retried = await send(await deps.refreshToken())
    // A second 401 with a fresh token: the sign-in itself is gone. Callers still get their GitHubError(401).
    if (retried.status === 401) deps.onSessionInvalid?.()
    return retried
  }

  const contents = (path: string) => `/repos/${deps.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const conditional = (etag?: string | null) => (etag ? { headers: { 'if-none-match': etag } } : {})

  return {
    async getUser() {
      const res = await request('/user')
      if (!res.ok) throw new GitHubError(res.status, 'Could not load your GitHub profile')
      const body = await readJson(res)
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
      const body = await readJson(res)
      if (!Array.isArray(body)) return { status: 'missing' }
      const value = body.map((e: { name: string; path: string; type: string }) => ({ name: String(e.name), path: String(e.path), type: String(e.type) }))
      return { status: 'ok', value, etag: res.headers.get('etag') }
    },

    async getFile(path, etag) {
      const res = await request(contents(path), conditional(etag))
      if (res.status === 304) return { status: 'not-modified' }
      if (res.status === 404) return { status: 'missing' }
      if (!res.ok) throw new GitHubError(res.status, `Could not load ${path}`)
      const body = await readJson(res)
      if (Array.isArray(body) || typeof body.content !== 'string') throw new GitHubError(422, `${path} is not a file`)
      // Over 1 MB the API sends `content: ""` with `encoding: "none"`; reading that as an empty file would let a later write overwrite the real one.
      if ((body.encoding !== undefined && body.encoding !== 'base64') || (typeof body.size === 'number' && body.size > 0 && body.content === '')) {
        throw new GitHubError(413, `${path} is too large to read through the GitHub API`)
      }
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
      const body = await readJson(res)
      return { sha: String(body.content.sha) }
    },
  }
}
