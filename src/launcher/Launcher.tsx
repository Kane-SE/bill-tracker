import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { HeaderIconLink } from '@/shared/components/HeaderIconLink'
import { apps } from '@/launcher/registry'

export function Launcher() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader
        title="Apps"
        subtitle="Little tools for everyday life"
        actions={
          <HeaderIconLink to="/settings" label="Settings">
            <Settings className="h-5 w-5" />
          </HeaderIconLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            to={app.to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:bg-secondary/50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <app.icon className="h-7 w-7" />
            </span>
            <span className="text-sm font-semibold">{app.name}</span>
            <span className="text-xs text-muted-foreground">{app.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
