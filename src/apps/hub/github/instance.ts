import { HUB_REPO } from '@/apps/hub/config'
import { forceRefresh, getAccessToken } from '@/apps/hub/auth/session'
import { createGitHubClient, type GitHubClient } from '@/apps/hub/github/client'

let client: GitHubClient | null = null

/** The app-wide client. Task 13 adds the dev demo branch here. */
export function getHubClient(): GitHubClient {
  client ??= createGitHubClient({
    repo: HUB_REPO,
    fetch: (...args) => fetch(...args),
    getToken: () => getAccessToken(),
    refreshToken: () => forceRefresh(),
  })
  return client
}
