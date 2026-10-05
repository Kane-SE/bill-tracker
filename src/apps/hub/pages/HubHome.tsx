import { useEffect } from 'react'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { verifyAccess } from '@/apps/hub/auth/verify-access'
import { SignIn } from '@/apps/hub/pages/SignIn'
import { NoAccess } from '@/apps/hub/pages/NoAccess'

export function HubHome() {
  const session = useAuthStore((s) => s.session)
  const access = useAuthStore((s) => s.access)

  // Signed in but access never confirmed (the check failed during sign-in): re-check in the background.
  // The signed-in body keeps rendering meanwhile, so the cached dashboard stays usable offline.
  useEffect(() => {
    if (!session || access !== 'unknown') return
    let active = true
    verifyAccess(undefined, () => active).catch(() => {})
    return () => {
      active = false
    }
  }, [session, access])

  if (!session) return <SignIn />
  if (access === 'none') return <NoAccess />
  return <p className="p-4 text-sm text-muted-foreground">Signed in.</p>
}
