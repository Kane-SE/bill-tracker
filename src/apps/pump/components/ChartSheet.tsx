import { useRef } from 'react'
import { Trophy } from 'lucide-react'
import { COMPUTED_SKILLS, type Chart, type ComputedSkill, type Title } from '@/apps/pump/data/types'
import { chartFacts, MODE_SHORT, titleName } from '@/apps/pump/lib/labels'
import { EarnedToggle } from '@/apps/pump/components/EarnedToggle'
import { LevelBadge } from '@/apps/pump/components/LevelBadge'
import { SheetGrabber } from '@/apps/pump/components/SheetGrabber'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

function SkillBar({ skill, pct, tagged }: { skill: ComputedSkill; pct: number; tagged: boolean }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm" aria-label={`${skill} ${pct}%${tagged ? ', tagged' : ''}`}>
      <span className={cn(tagged ? 'font-semibold' : 'text-muted-foreground')}>{skill}</span>
      <span className="h-2 rounded-full bg-secondary">
        <span className={cn('block h-2 rounded-full', tagged ? 'bg-primary' : 'bg-muted-foreground/50')} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

interface ChartSheetProps {
  chart: Chart | null
  /** every chart of the same song, this one included (songCharts) */
  siblings: Chart[]
  titles: Title[]
  earned: ReadonlySet<string>
  onToggleTitle(id: string): void
  /** show another chart of the same song in this sheet */
  onPick(id: number): void
  onClose(): void
}

/** One chart's details, over the list (which keeps its scroll position). */
export function ChartSheet({ chart, siblings, titles, earned, onToggleTitle, onPick, onClose }: ChartSheetProps) {
  // Keep the last chart on screen while the sheet animates closed.
  const last = useRef<Chart | null>(null)
  if (chart) last.current = chart
  const c = chart ?? last.current
  const titleRef = useRef<HTMLHeadingElement>(null)
  const unlocks = c ? titles.filter((t) => c.titleIds.includes(t.id)) : []

  return (
    <Dialog open={chart !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <SheetGrabber onDismiss={onClose} />
        {c && (
          <>
            <div className="-mt-3 flex items-center gap-3 pr-10">
              <LevelBadge mode={c.mode} level={c.level} />
              <div className="min-w-0">
                <DialogTitle ref={titleRef} tabIndex={-1} className="leading-snug outline-none">
                  {c.song.title}
                </DialogTitle>
                {c.song.titleKo && <p className="text-sm text-muted-foreground">{c.song.titleKo}</p>}
                <p className="text-sm text-muted-foreground">{c.song.artist}</p>
              </div>
            </div>
            <p className="text-sm">{chartFacts(c)}</p>
            {c.stepArtist && <p className="text-sm text-muted-foreground">Step artist: {c.stepArtist}</p>}
            {c.prevLevel !== undefined && (
              <p className="text-sm text-muted-foreground">
                Was {MODE_SHORT[c.mode]}
                {c.prevLevel} in PHOENIX
              </p>
            )}
            {(c.premium || c.steamLink) && (
              <p className="text-sm text-muted-foreground">
                {[c.premium && 'Premium mode only', c.steamLink && 'Needs Steam Link'].filter(Boolean).join(' · ')}
              </p>
            )}
            {c.coverage ? (
              <section aria-label="How much of this chart is each skill" className="space-y-1.5">
                {COMPUTED_SKILLS.map((s) => (
                  <SkillBar key={s} skill={s} pct={c.coverage![s]} tagged={c.skills.includes(s)} />
                ))}
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">No skill data for this chart{c.steamLink ? ' (Steam Link)' : ''}.</p>
            )}
            {c.gimmickFrom.length > 0 && (
              <p className="text-sm">
                <span className="font-semibold">Gimmick</span> · {c.gimmickFrom.join(' · ')}
              </p>
            )}
            {c.badges.length > 0 && <p className="text-xs text-muted-foreground">piucenter: {c.badges.join(', ')}</p>}
            {siblings.length > 1 && (
              <section aria-label="Other charts of this song" className="space-y-1.5 border-t border-border pt-3">
                <h3 className="text-xs font-semibold text-muted-foreground">Other charts of this song</h3>
                <div className="flex flex-wrap gap-1">
                  {siblings.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-current={s.id === c.id ? 'true' : undefined}
                      aria-label={`${MODE_SHORT[s.mode]}${s.level}${s.id === c.id ? ', showing' : ''}`}
                      onClick={() => s.id !== c.id && onPick(s.id)}
                      className={cn('grid h-11 w-11 place-items-center rounded-lg', s.id === c.id && 'ring-2 ring-ring ring-offset-2 ring-offset-card')}
                    >
                      <LevelBadge mode={s.mode} level={s.level} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {unlocks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 border-t border-border pt-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden />
                <span className="flex-1 text-sm">{titleName(t)} · needs SSS</span>
                <EarnedToggle title={t} earned={earned.has(t.id)} onToggle={onToggleTitle} />
              </div>
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
