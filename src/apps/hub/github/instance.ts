import { HUB_REPO } from '@/apps/hub/config'
import { forceRefresh, getAccessToken } from '@/apps/hub/auth/session'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { createGitHubClient, type GitHubClient } from '@/apps/hub/github/client'
import { createDemoClient, isHubDemo } from '@/apps/hub/dev/demo'

let client: GitHubClient | null = null

/** The app-wide client. Dev builds opened with `?hub-demo` get the fixture-backed demo client instead; production builds drop that branch. */
export function getHubClient(): GitHubClient {
  if (import.meta.env.DEV && isHubDemo()) {
    client ??= createDemoClient()
    return client
  }
  client ??= createGitHubClient({
    repo: HUB_REPO,
    fetch: (...args) => fetch(...args),
    getToken: () => getAccessToken(),
    refreshToken: () => forceRefresh(),
    // Still 401 after a refresh: sign out (SignIn then says the session ended). The Hub cache stays on the device.
    onSessionInvalid: () => useAuthStore.getState().signOut(),
  })
  return client
}
