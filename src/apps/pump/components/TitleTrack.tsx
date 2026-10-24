import type { TrackView } from '@/apps/pump/lib/titles'
import { EarnedToggle } from '@/apps/pump/components/EarnedToggle'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'

interface TitleTrackProps {
  view: TrackView
  earned: ReadonlySet<string>
  onToggle(id: string): void
  onOpen(chartId: number): void
}

/** One skill-title track: Lv.1 → 10, a tick per title, "next" on the first unearned one. */
export function TitleTrack({ view, earned, onToggle, onOpen }: TitleTrackProps) {
  const headingId = `track-${view.track.replace(/ /g, '-')}`
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
        <span>{view.track}</span>
        <span className="tabular-nums text-muted-foreground">
          {view.earned} / {view.titles.length}
        </span>
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {view.titles.map((t) => (
          <li key={t.id} className="flex items-center pr-3">
            <EarnedToggle title={t} earned={earned.has(t.id)} onToggle={onToggle} />
            <button type="button" onClick={() => onOpen(t.chart.id)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
              <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">Lv.{t.lv}</span>
              <LevelBadge mode={t.chart.mode} level={t.chart.level} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.chart.song.title}</span>
              {view.next?.id === t.id && (
                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-foreground">next</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
