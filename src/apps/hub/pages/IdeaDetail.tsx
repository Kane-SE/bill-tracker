import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Plus, SearchX } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { githubIdeaUrl, IDEAS_PATH } from '@/apps/hub/config'
import { formatDay } from '@/apps/hub/lib/dates'
import { parseIdeas } from '@/apps/hub/lib/ideas'
import { useHubStore } from '@/apps/hub/store/useHubStore'
import { useOnline } from '@/apps/hub/hooks/useOnline'
import { StageBadge } from '@/apps/hub/components/StageBadge'
import { AddNoteDialog } from '@/apps/hub/components/AddNoteDialog'
import { MoveStageDialog } from '@/apps/hub/components/MoveStageDialog'
import { SignIn } from '@/apps/hub/pages/SignIn'

export function IdeaDetail() {
  const { id = '' } = useParams()
  const ideasText = useHubStore((s) => s.files[IDEAS_PATH]?.text ?? null)
  const session = useAuthStore((s) => s.session)
  const online = useOnline()
  const [noteOpen, setNoteOpen] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const idea = useMemo(() => parseIdeas(ideasText).find((i) => i.id === id) ?? null, [ideasText, id])
  const today = new Date()

  if (!session) return <SignIn />
  if (!idea) {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Idea" backTo="/hub" />
        <EmptyState icon={SearchX} title="Idea not found" description="It may have been renamed on GitHub.">
          <Button asChild variant="outline">
            <Link to="/hub">Back to Hub</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32">
      <PageHeader title="Idea" backTo="/hub" />
      <h2 className="mb-2 text-xl font-bold text-pretty break-words">{idea.title}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={idea.stage} />
        {idea.added && <span className="text-sm text-muted-foreground">Added {formatDay(idea.added, today)}</span>}
      </div>
      {idea.note && <p className="mt-3 text-pretty break-words">{idea.note}</p>}

      <h2 className="mb-3 mt-6 text-base font-semibold">Progress</h2>
      {idea.progress.length === 0 ? (
        <p className="text-sm text-muted-foreground">No progress notes yet.</p>
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {idea.progress.map((p, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" aria-hidden />
              <p className="text-xs text-muted-foreground">{formatDay(p.date, today)}</p>
              <p className="text-pretty break-words text-sm">{p.text}</p>
            </li>
          ))}
        </ol>
      )}

      <a href={githubIdeaUrl(idea.title)} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        Edit on GitHub <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
          <Button className="flex-1" disabled={!online} aria-describedby={online ? undefined : 'idea-offline-note'} onClick={() => setNoteOpen(true)}>
            <Plus />
            Add note
          </Button>
          <Button className="flex-1" variant="outline" disabled={!online} aria-describedby={online ? undefined : 'idea-offline-note'} onClick={() => setStageOpen(true)}>
            Move stage
          </Button>
        </div>
        {!online && (
          <p id="idea-offline-note" className="pb-2 text-center text-xs text-muted-foreground">
            Needs connection
          </p>
        )}
      </div>

      <AddNoteDialog ideaId={idea.id} open={noteOpen} onOpenChange={setNoteOpen} />
      <MoveStageDialog idea={idea} open={stageOpen} onOpenChange={setStageOpen} />
    </div>
  )
}
