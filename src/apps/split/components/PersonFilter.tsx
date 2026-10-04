import { useEffect, useState } from 'react'
import { ChevronDown, Users, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { PersonSummary } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'
import { usePersonFilter } from '@/apps/split/store/usePersonFilter'
import { cn } from '@/shared/lib/utils'

const MIN_PEOPLE = 3

/**
 * The chosen person, or null when filtering doesn't apply (fewer than 3
 * people, or the chosen name no longer appears). Clears a stale choice.
 */
export function useActivePerson(people: PersonSummary[]): string | null {
  const person = usePersonFilter((s) => s.person)
  const setPerson = usePersonFilter((s) => s.setPerson)
  const valid = person != null && people.length >= MIN_PEOPLE && people.some((p) => p.name === person)
  useEffect(() => {
    if (person != null && !valid) setPerson(null)
  }, [person, valid, setPerson])
  return valid ? person : null
}

function Initial({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={cn(
        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function totals(p: PersonSummary): string {
  if (p.owes === 0 && p.owed === 0) return 'all settled'
  return `owes ${formatMoney(p.owes)} · owed ${formatMoney(p.owed)}`
}

interface PersonFilterProps {
  people: PersonSummary[]
  /** What to say about the chosen person on this screen. */
  summary: (person: string) => React.ReactNode
}

/** "Showing everyone ▾" button + picker sheet. Shared by Home and Archive. */
export function PersonFilter({ people, summary }: PersonFilterProps) {
  const setPerson = usePersonFilter((s) => s.setPerson)
  const person = useActivePerson(people)
  const [open, setOpen] = useState(false)
  if (people.length < MIN_PEOPLE) return null

  function pick(name: string | null) {
    setPerson(name)
    setOpen(false)
  }

  return (
    <div className="mb-4">
      {person ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/50 bg-accent/50 px-3 py-2.5">
          <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Initial name={person} active />
            <span className="min-w-0 text-sm leading-snug">
              <b className="block">{person}</b>
              <span className="text-muted-foreground">{summary(person)}</span>
            </span>
          </button>
          <button type="button" onClick={() => pick(null)} aria-label="Show everyone" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left"
        >
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm leading-snug">
            Showing <b>everyone</b>
            <span className="block text-xs text-muted-foreground">Tap to see one person</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show balances for</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1">
            <li>
              <button type="button" onClick={() => pick(null)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', !person && 'bg-accent/50')}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Users className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold">Everyone</span>
              </button>
            </li>
            {people.map((p) => (
              <li key={p.name}>
                <button type="button" onClick={() => pick(p.name)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', person === p.name && 'bg-accent/50')}>
                  <Initial name={p.name} active={person === p.name} />
                  <span className="flex-1 text-sm font-semibold">{p.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{totals(p)}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
