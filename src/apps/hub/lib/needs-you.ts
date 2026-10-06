import { ACTIVE_STAGES, type Idea, type WipCard } from '@/apps/hub/lib/types'
import { THRESHOLDS, type Thresholds } from '@/apps/hub/config'
import { daysBetween } from '@/apps/hub/lib/dates'

/** Latest progress date, or the Added date when there is no progress yet. */
export function lastActivity(idea: Idea): string | null {
  if (idea.progress.length === 0) return idea.added
  return idea.progress.reduce((latest, p) => (p.date > latest ? p.date : latest), idea.progress[0].date)
}

export function quietDays(idea: Idea, today: Date, t: Thresholds = THRESHOLDS): number | null {
  if (!ACTIVE_STAGES.includes(idea.stage)) return null
  const last = lastActivity(idea)
  if (!last) return null
  const days = daysBetween(last, today)
  return days >= t.quietDays ? days : null
}

export function staleDays(card: WipCard, today: Date, t: Thresholds = THRESHOLDS): number | null {
  if (!card.lastWorked) return null
  const days = daysBetween(card.lastWorked, today)
  return days >= t.staleDays ? days : null
}

export function waitingDays(card: WipCard, today: Date): number | null {
  return card.waitingSince ? Math.max(0, daysBetween(card.waitingSince, today)) : null
}

/** NOW list order: projects waiting on the user first (longest wait first), then the most recently worked. */
export function nowOrder(wip: WipCard[], today: Date): WipCard[] {
  const waited = (card: WipCard) => (card.waitingOnMe ? (waitingDays(card, today) ?? 0) : -1)
  return [...wip].sort(
    (a, b) =>
      waited(b) - waited(a) ||
      (b.lastWorked ?? '').localeCompare(a.lastWorked ?? '') ||
      a.project.localeCompare(b.project),
  )
}

export function ageLabel(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  if (days < 14) return `${days} days`
  return `${Math.floor(days / 7)} weeks`
}
