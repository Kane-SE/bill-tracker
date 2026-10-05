import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { SignIn } from '@/apps/hub/pages/SignIn'
import { NoAccess } from '@/apps/hub/pages/NoAccess'

export function HubHome() {
  const session = useAuthStore((s) => s.session)
  const access = useAuthStore((s) => s.access)
  if (!session) return <SignIn />
  if (access === 'none') return <NoAccess />
  return <p className="p-4 text-sm text-muted-foreground">Signed in.</p>
}
