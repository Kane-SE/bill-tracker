import { useState } from 'react'
import { ChevronDown, Hand } from 'lucide-react'
import { SectionHead } from '@/apps/hub/components/SectionHead'
import { Linkified } from '@/apps/hub/components/Linkified'
import { THRESHOLDS } from '@/apps/hub/config'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, staleDays, waitingDays } from '@/apps/hub/lib/needs-you'
import type { WipCard } from '@/apps/hub/lib/types'
import { cn } from '@/shared/lib/utils'

interface Props {
  cards: WipCard[]
  today: Date
  repoLinks: Map<string, string>
  error: string | null
}

export function WipList({ cards, today, repoLinks, error }: Props) {
  return (
    <section>
      <SectionHead title="Now" meta={`${cards.length} ${cards.length === 1 ? 'project' : 'projects'}`} />
      {error && <p className="mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Couldn't load NOW notes. {error}</p>}
      {cards.length === 0 ? (
        !error && <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">No NOW notes in personal-hub yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {cards.map((card) => (
            <WipRow key={card.file} card={card} today={today} repoLink={repoLinks.get(card.project) ?? null} />
          ))}
        </ul>
      )}
    </section>
  )
}

function WipRow({ card, today, repoLink }: { card: WipCard; today: Date; repoLink: string | null }) {
  const [open, setOpen] = useState(false)
  const stale = staleDays(card, today)
  const waiting = waitingDays(card, today)
  const meta = [card.machine, card.lastWorked && formatDay(card.lastWorked, today)].filter(Boolean).join(' · ')
  return (
    <li id={`wip-${card.project}`} className="scroll-mt-20 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold">{card.project}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {stale !== null ? `${meta} · ` : meta}
          {stale !== null && <span className="text-warning">{`${ageLabel(stale)} ago`}</span>}
        </span>
      </div>
      {card.nextAction && (
        <p className="mt-1 text-pretty text-sm">
          <Linkified text={card.nextAction} repoLink={repoLink} />
        </p>
      )}
      {card.waitingOnMe && (
        <p className={cn('mt-2 flex items-start gap-1.5 text-pretty text-sm', waiting !== null && waiting >= THRESHOLDS.waitingAmberDays ? 'text-warning' : 'text-muted-foreground')}>
          <Hand className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">{`Waiting on you${waiting ? ` ${ageLabel(waiting)}` : ''}`}</span>{' '}
            <span className="text-foreground/80">{`· ${card.waitingOnMe}`}</span>
          </span>
        </p>
      )}
      {card.inFlight.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-ml-1 mt-1 inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            {`In flight (${card.inFlight.length})`}
          </button>
          {open && (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {card.inFlight.map((item, i) => (
                <li key={i}>
                  <Linkified text={item} repoLink={repoLink} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}
