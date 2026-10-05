import { useState } from 'react'
import { CloudOff, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { STAGE_LABEL, StageBadge } from '@/apps/hub/components/StageBadge'
import { IdeaRow } from '@/apps/hub/components/IdeaRow'
import { ACTIVE_STAGES, STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import type { PendingIdea } from '@/apps/hub/store/useHubStore'

type Filter = 'active' | Stage

const matches = (idea: Idea, filter: Filter) => (filter === 'active' ? ACTIVE_STAGES.includes(idea.stage) : idea.stage === filter)

interface Props {
  ideas: Idea[]
  pending: PendingIdea[]
  today: Date
  error: string | null
  onNew: () => void
}

export function IdeasSection({ ideas, pending, today, error, onNew }: Props) {
  const [filter, setFilter] = useState<Filter>('active')
  const includesPending = (f: Filter) => f === 'active' || f === 'idea'
  const count = (f: Filter) => ideas.filter((i) => matches(i, f)).length + (includesPending(f) ? pending.length : 0)
  const shown = ideas.filter((i) => matches(i, filter))
  const shownPending = includesPending(filter) ? pending : []
  const filters: Filter[] = ['active', ...STAGES]

  return (
    <section>
      <SectionHead
        title="Ideas"
        meta={`${count('active')} active`}
        action={
          <Button size="sm" className="hidden lg:inline-flex" onClick={onNew}>
            <Plus />
            New idea
          </Button>
        }
      />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load ideas.md. {error}</p>}
      <div className="-mx-4 mb-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 lg:flex-wrap" role="radiogroup" aria-label="Filter ideas by stage">
          {filters.map((f) => {
            const active = f === filter
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground',
                )}
              >
                {f === 'active' ? 'Active' : STAGE_LABEL[f]} <span>{count(f)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {shown.length === 0 && shownPending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'active' ? 'No ideas yet. Catch the next one with New idea.' : `No ${STAGE_LABEL[filter].toLowerCase()} ideas.`}
        </p>
      ) : (
        <ul className="space-y-0.5 rounded-2xl border border-border bg-card p-1">
          {shownPending.map((p) => (
            <li key={p.localId}>
              <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 outline-dashed outline-1 outline-border">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{p.title}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <CloudOff className="h-3.5 w-3.5" />
                    Not synced yet
                  </p>
                </div>
                <StageBadge stage="idea" className="mt-0.5" />
              </div>
            </li>
          ))}
          {shown.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} today={today} />
          ))}
        </ul>
      )}
    </section>
  )
}
