import { HUB_REPO } from '@/apps/hub/config'
import { forceRefresh, getAccessToken } from '@/apps/hub/auth/session'
import { createGitHubClient, type GitHubClient } from '@/apps/hub/github/client'
import { createDemoClient, isHubDemo } from '@/apps/hub/dev/demo'

let client: GitHubClient | null = null

/** The app-wide client. Task 13 adds the dev demo branch here. */
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
  })
  return client
}
