import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { getHubClient } from '@/apps/hub/github/instance'
import type { GitHubClient } from '@/apps/hub/github/client'

/**
 * Loads the signed-in user and whether they can see the hub repo, and stores both.
 * Writes only when both calls succeed; on any failure it rejects and leaves the auth store untouched.
 * `isCurrent` lets a caller that stopped caring (unmounted, signed out) drop the answer instead of storing it.
 */
export async function verifyAccess(
  client: Pick<GitHubClient, 'getUser' | 'checkAccess'> = getHubClient(),
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const [user, ok] = await Promise.all([client.getUser(), client.checkAccess()])
  if (!isCurrent()) return
  useAuthStore.getState().setUser(user)
  useAuthStore.getState().setAccess(ok ? 'ok' : 'none')
}
