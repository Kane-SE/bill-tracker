import { useState } from 'react'
import { Github, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { AuthError, startSignIn } from '@/apps/hub/auth/github-auth'
import { useHubStore } from '@/apps/hub/store/useHubStore'

export function SignIn() {
  const [busy, setBusy] = useState(false)
  // Signed out but the cache is still here: the session ended (a Settings sign-out clears the cache, so fetchedAt is null).
  const hasCache = useHubStore((s) => s.fetchedAt !== null)

  async function signIn() {
    setBusy(true)
    try {
      await startSignIn()
    } catch (error) {
      setBusy(false)
      toast.error(
        error instanceof AuthError && error.code === 'not_configured'
          ? 'Sign-in is not set up for this build (VITE_GITHUB_CLIENT_ID is missing).'
          : 'Could not start sign-in.',
      )
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-7 w-7" />
        </span>
        <h2 className="mt-3 text-lg font-semibold">Hub</h2>
        <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
          Your work in progress, ideas and projects, from your personal-hub repo
        </p>
        {hasCache && (
          <p className="mt-4 max-w-[260px] text-sm text-muted-foreground">
            Your session ended — sign in again. Your copy stays on this device.
          </p>
        )}
        <Button className="mt-5 w-full max-w-xs" onClick={signIn} disabled={busy}>
          <Github />
          Sign in with GitHub
        </Button>
        <p className="mt-3 max-w-[260px] text-xs text-muted-foreground">
          Nook can only read and edit the repo you install it on. Revoke any time in GitHub settings.
        </p>
      </div>
    </div>
  )
}
