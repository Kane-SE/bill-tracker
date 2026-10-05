import nowBill from '@/apps/hub/lib/__fixtures__/now-bill-splitter.md?raw'
import nowIdle from '@/apps/hub/lib/__fixtures__/now-idle-farming.md?raw'
import projectsMd from '@/apps/hub/lib/__fixtures__/projects.md?raw'
import ideasMd from '@/apps/hub/lib/__fixtures__/ideas.md?raw'
import type { GitHubClient } from '@/apps/hub/github/client'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'

/**
 * DEV ONLY. Open http://localhost:5173/?hub-demo#/hub to use Hub with fixture data and no GitHub.
 * Every caller guards with `import.meta.env.DEV &&` so production builds drop this module.
 */
export function isHubDemo(): boolean {
  return new URLSearchParams(window.location.search).has('hub-demo')
}

export function seedDemoSession(): void {
  const far = Date.now() + 365 * 86_400_000
  useAuthStore.setState({
    session: { accessToken: 'demo', accessExpiresAt: far, refreshToken: 'demo', refreshExpiresAt: far },
    user: { login: 'demo', avatarUrl: '' },
    access: 'ok',
  })
}

/** Fails like a real fetch does when the browser is offline, so the demo exercises the offline queue. */
function failIfOffline(): void {
  if (navigator.onLine === false) throw new TypeError('Failed to fetch')
}

export function createDemoClient(): GitHubClient {
  const files = new Map<string, string>([
    ['now/bill-splitter.md', nowBill],
    ['now/idle-farming.md', nowIdle],
    ['projects.md', projectsMd],
    ['ideas.md', ideasMd],
  ])
  let version = 0
  return {
    async getUser() {
      failIfOffline()
      return { login: 'demo', avatarUrl: '' }
    },
    async checkAccess() {
      failIfOffline()
      return true
    },
    async listDir(path) {
      failIfOffline()
      const value = [...files.keys()].filter((p) => p.startsWith(`${path}/`)).map((p) => ({ name: p.slice(path.length + 1), path: p, type: 'file' }))
      return value.length ? { status: 'ok', value, etag: null } : { status: 'missing' }
    },
    async getFile(path) {
      failIfOffline()
      const text = files.get(path)
      return text === undefined ? { status: 'missing' } : { status: 'ok', value: { text, sha: `demo-${version}` }, etag: null }
    },
    async putFile(path, text) {
      failIfOffline()
      files.set(path, text)
      version++
      return { sha: `demo-${version}` }
    },
  }
}
