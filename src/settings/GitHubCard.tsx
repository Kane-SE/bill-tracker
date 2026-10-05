import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { useHubStore } from '@/apps/hub/store/useHubStore'

export function GitHubCard() {
  const session = useAuthStore((s) => s.session)
  const user = useAuthStore((s) => s.user)

  function signOut() {
    useAuthStore.getState().signOut()
    useHubStore.getState().reset()
    toast.success('Signed out of GitHub')
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-base">GitHub</CardTitle>
        <CardDescription>Used by Hub to read and edit your personal-hub repo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {session ? (
          <>
            <div className="flex items-center gap-3">
              {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full ring-1 ring-border" />}
              <span className="font-medium">@{user?.login ?? 'unknown'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
              <Button asChild variant="outline">
                <a href="https://github.com/settings/apps/authorizations" target="_blank" rel="noreferrer">
                  Manage access
                </a>
              </Button>
            </div>
          </>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/hub">Sign in from Hub</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
