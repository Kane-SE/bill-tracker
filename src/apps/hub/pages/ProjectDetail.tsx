import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Hand, SearchX } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { githubRepoUrl } from '@/apps/hub/config'
import { formatDay } from '@/apps/hub/lib/dates'
import { ageLabel, staleDays, waitingDays } from '@/apps/hub/lib/needs-you'
import { parseHubData, useHubStore } from '@/apps/hub/store/useHubStore'
import { Linkified } from '@/apps/hub/components/Linkified'
import { SignIn } from '@/apps/hub/pages/SignIn'

function Section({ title, tone, children }: { title: string; tone?: 'warning'; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className={tone === 'warning' ? 'mb-2 px-1 text-base font-semibold text-warning' : 'mb-2 px-1 text-base font-semibold'}>{title}</h2>
      {children}
    </section>
  )
}

const CARD = 'rounded-2xl border border-border bg-card p-4 text-pretty text-sm'

/** One project's NOW note in full. The dashboard row only shows the headline. */
export function ProjectDetail() {
  const { name = '' } = useParams()
  const session = useAuthStore((s) => s.session)
  const files = useHubStore((s) => s.files)
  const nowFiles = useHubStore((s) => s.nowFiles)
  const fetchedAt = useHubStore((s) => s.fetchedAt)
  const data = useMemo(() => parseHubData(files, nowFiles), [files, nowFiles])
  const card = data.wip.find((c) => c.project === name) ?? null
  const repoLink = data.projects.find((p) => p.name === name)?.link ?? null
  const today = new Date()

  if (!session) return <SignIn />
  if (!card) {
    // A deep link opened before the first sync has no cache yet; show the same loading shape instead of "not found".
    if (!fetchedAt) {
      return (
        <div className="mx-auto max-w-lg px-4 lg:max-w-2xl">
          <PageHeader title="Project" subtitle="Loading…" backTo="/hub" />
          <div aria-busy="true" className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded-lg bg-foreground/5 motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-2xl bg-foreground/5 motion-reduce:animate-none" />
            <div className="h-16 animate-pulse rounded-2xl bg-foreground/5 motion-reduce:animate-none" />
            <span className="sr-only" role="status">
              Loading project
            </span>
          </div>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-lg px-4 lg:max-w-2xl">
        <PageHeader title="Project" backTo="/hub" />
        <EmptyState icon={SearchX} title="Project not found" description="Its NOW note may have been renamed on GitHub.">
          <Button asChild variant="outline">
            <Link to="/hub">Back to Hub</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  const stale = staleDays(card, today)
  const waiting = card.waitingOnMe ? waitingDays(card, today) : null
  const worked = [card.lastWorked && `Last worked ${formatDay(card.lastWorked, today)}`, card.machine].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-lg px-4 pb-12 lg:max-w-2xl">
      <PageHeader title="Project" subtitle="Hub" backTo="/hub" />
      <h2 className="break-words text-xl font-bold text-pretty">{card.project}</h2>
      {(worked || stale !== null) && (
        <p className="mt-1 text-sm text-muted-foreground">
          {worked}
          {stale !== null && (
            <>
              {worked && ' · '}
              <span className="text-warning">{`${ageLabel(stale)} ago`}</span>
            </>
          )}
        </p>
      )}

      <Section title="Next action">
        <div className={CARD}>
          {card.nextAction ? <Linkified text={card.nextAction} repoLink={repoLink} /> : <span className="italic text-muted-foreground">No next action yet</span>}
        </div>
      </Section>

      {card.waitingOnMe && (
        <Section title={`Waiting on you${waiting ? ` · ${ageLabel(waiting)}` : ''}`} tone="warning">
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-pretty text-sm">
            <Hand className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{card.waitingOnMe}</span>
          </div>
        </Section>
      )}

      {card.waitingOnOthers && (
        <Section title="Waiting on others">
          <div className={CARD}>{card.waitingOnOthers}</div>
        </Section>
      )}

      {card.inFlight.length > 0 && (
        <Section title={`In flight (${card.inFlight.length})`}>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {card.inFlight.map((item, i) => (
              <li key={i} className="px-4 py-3 text-pretty text-sm">
                <Linkified text={item} repoLink={repoLink} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {card.plans && (
        <Section title="Plans & decisions">
          <div className={`${CARD} break-words text-muted-foreground`}>{card.plans}</div>
        </Section>
      )}

      <a href={`${githubRepoUrl()}/blob/main/${card.file}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        Edit on GitHub <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
