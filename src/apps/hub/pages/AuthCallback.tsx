import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { AuthError, completeSignIn } from '@/apps/hub/auth/github-auth'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { getHubClient } from '@/apps/hub/github/instance'

let finishing: Promise<void> | null = null

/** Runs once per page load, even under StrictMode's double effects. */
function finishSignIn(): Promise<void> {
  finishing ??= (async () => {
    const search = window.location.search
    window.history.replaceState(null, '', `${window.location.pathname}#/hub/callback`)
    const session = await completeSignIn(search)
    useAuthStore.getState().setSession(session)
    const client = getHubClient()
    const [user, hasAccess] = await Promise.all([client.getUser(), client.checkAccess()])
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setAccess(hasAccess ? 'ok' : 'none')
  })()
  return finishing
}

function messageFor(error: unknown): string {
  if (error instanceof AuthError && error.code === 'cancelled') return 'Sign-in was cancelled.'
  if (error instanceof AuthError && error.code === 'state_mismatch') return 'This sign-in link expired. Try again.'
  return 'Sign-in failed. Try again.'
}

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    finishSignIn()
      .then(() => active && navigate('/hub', { replace: true }))
      .catch((e: unknown) => active && setError(messageFor(e)))
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <div className="mx-auto max-w-lg px-4">
      <PageHeader title="Hub" backTo="/" />
      {error ? (
        <EmptyState icon={CircleAlert} title={error}>
          <Button asChild variant="outline">
            <Link to="/hub">Back to sign-in</Link>
          </Button>
        </EmptyState>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground" role="status">
          Signing you in…
        </p>
      )}
    </div>
  )
}
