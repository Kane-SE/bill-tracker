import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import type { Project } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

const DOT = { active: 'bg-success', paused: 'bg-warning', archived: 'bg-muted-foreground' } as const

export function ProjectList({ projects, error }: { projects: Project[]; error: string | null }) {
  const [showAll, setShowAll] = useState(false)
  const active = projects.filter((p) => p.status === 'active')
  const rest = projects.filter((p) => p.status !== 'active')
  const shown = showAll ? [...active, ...rest] : active
  return (
    <section>
      <SectionHead title="Projects" meta={`${active.length} active`} />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load projects.md. {error}</p>}
      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Add projects.md to personal-hub to list your projects here.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {shown.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT[p.status])} role="img" aria-label={p.status} />
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                    {p.name}
                  </a>
                ) : (
                  <span className="truncate font-medium">{p.name}</span>
                )}
              </span>
              {p.stack && <span className="max-w-[50%] truncate text-sm text-muted-foreground">{p.stack}</span>}
            </li>
          ))}
          {rest.length > 0 && (
            <li>
              <button type="button" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                {showAll ? 'Hide paused and archived' : `Show ${rest.length} paused or archived`}
                <ChevronDown className={cn('h-4 w-4 transition-transform', showAll && 'rotate-180')} />
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
