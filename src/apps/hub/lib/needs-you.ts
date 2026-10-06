import { ACTIVE_STAGES, type Idea, type NeedsYouItem, type WipCard } from '@/apps/hub/lib/types'
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

/** Everything that needs the user, most urgent first. The UI shows the first three. */
export function needsYou(wip: WipCard[], ideas: Idea[], today: Date, t: Thresholds = THRESHOLDS): NeedsYouItem[] {
  const waiting: NeedsYouItem[] = wip
    .filter((card) => card.waitingOnMe)
    .map((card) => ({
      kind: 'waiting' as const,
      title: card.waitingOnMe!,
      context: card.project,
      days: waitingDays(card, today) ?? 0,
      target: { type: 'project' as const, project: card.project },
    }))
    .sort((a, b) => b.days - a.days)

  const quiet: NeedsYouItem[] = ideas
    .map((idea) => ({ idea, days: quietDays(idea, today, t) }))
    .filter((x): x is { idea: Idea; days: number } => x.days !== null)
    .map(({ idea, days }) => ({
      kind: 'quiet' as const,
      title: idea.title,
      context: 'Idea',
      days,
      target: { type: 'idea' as const, id: idea.id },
    }))
    .sort((a, b) => b.days - a.days)

  return [...waiting, ...quiet]
}

export function ageLabel(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day'
  if (days < 14) return `${days} days`
  return `${Math.floor(days / 7)} weeks`
}
