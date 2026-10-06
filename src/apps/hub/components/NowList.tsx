import { Link } from 'react-router-dom'
import { ChevronRight, Folder, Hand } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, staleDays, waitingDays } from '@/apps/hub/lib/needs-you'
import type { WipCard } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

interface Props {
  /** Already in display order (see nowOrder). */
  cards: WipCard[]
  today: Date
  error: string | null
}

export const projectPath = (project: string) => `/hub/projects/${encodeURIComponent(project)}`

export function NowList({ cards, today, error }: Props) {
  const needYou = cards.filter((card) => card.waitingOnMe).length
  return (
    <section>
      <SectionHead title="Now" meta={`${cards.length} ${cards.length === 1 ? 'project' : 'projects'}${needYou ? ` · ${needYou} need you` : ''}`} />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load NOW notes. {error}</p>}
      {cards.length === 0 ? (
        !error && <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No NOW notes in personal-hub yet.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {cards.map((card) => (
            <NowRow key={card.file} card={card} today={today} />
          ))}
        </ul>
      )}
    </section>
  )
}

function NowRow({ card, today }: { card: WipCard; today: Date }) {
  const stale = staleDays(card, today)
  const waiting = card.waitingOnMe ? (waitingDays(card, today) ?? 0) : null
  const worked = [card.machine, card.lastWorked && formatDay(card.lastWorked, today)].filter(Boolean).join(' · ')
  return (
    <li>
      <Link to={projectPath(card.project)} className="flex items-start gap-3 px-4 py-3 hover:bg-foreground/5">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', waiting !== null ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground')}>
          {waiting !== null ? <Hand className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-xs text-muted-foreground">{card.project}</span>
          <span className={cn('line-clamp-2 text-pretty text-sm font-medium', !card.waitingOnMe && !card.nextAction && 'font-normal italic text-muted-foreground')}>
            {card.waitingOnMe ?? card.nextAction ?? 'No next action yet'}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {waiting !== null && (
              <>
                <span className="text-warning">{`waiting ${ageLabel(waiting)}`}</span>
                {worked && ' · '}
              </>
            )}
            {worked}
            {stale !== null && (
              <>
                {worked && ' · '}
                <span className="text-warning">{`${ageLabel(stale)} ago`}</span>
              </>
            )}
          </span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}
