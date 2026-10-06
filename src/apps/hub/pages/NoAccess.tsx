import { ShieldX } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { useHubStore } from '@/apps/hub/store/useHubStore'
import { HUB_REPO } from '@/apps/hub/config'

export function NoAccess() {
  const login = useAuthStore((s) => s.user?.login)

  function signOut() {
    useAuthStore.getState().signOut()
    useHubStore.getState().reset()
  }

  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      <EmptyState
        icon={ShieldX}
        title={`Nothing set up for ${login ? `@${login}` : 'this account'}`}
        description={`Hub reads ${HUB_REPO}. This GitHub account can't see it.`}
      >
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </EmptyState>
    </div>
  )
}
