import { Link } from 'react-router-dom'
import { StageBadge } from '@/apps/hub/components/StageBadge'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, quietDays } from '@/apps/hub/lib/needs-you'
import type { Idea } from '@/apps/hub/lib/types'

export function IdeaRow({ idea, today }: { idea: Idea; today: Date }) {
  const last = idea.progress[idea.progress.length - 1]
  const quiet = quietDays(idea, today)
  return (
    <li>
      <Link to={`/hub/ideas/${idea.id}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-foreground/5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{idea.title}</p>
          {(last || idea.added) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {last ? `${formatDay(last.date, today)} · ${last.text}` : `Added ${formatDay(idea.added!, today)}`}
            </p>
          )}
          {quiet !== null && <p className="mt-0.5 text-xs text-warning">{`Quiet for ${ageLabel(quiet)}`}</p>}
        </div>
        <StageBadge stage={idea.stage} className="mt-0.5" />
      </Link>
    </li>
  )
}
