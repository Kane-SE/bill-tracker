import { Link } from 'react-router-dom'
import type { HubUser } from '@/apps/hub/auth/useAuthStore'

export function HubAvatar({ user }: { user: HubUser | null }) {
  const label = user ? `@${user.login} · Settings` : 'Settings'
  return (
    <Link to="/settings" aria-label={label} title={label} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-foreground">
          {(user?.login ?? '?').slice(0, 2)}
        </span>
      )}
    </Link>
  )
}
