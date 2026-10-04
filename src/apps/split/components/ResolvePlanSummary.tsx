import { Archive, Check } from 'lucide-react'
import type { PairChange, PairResolvePlan } from '@/apps/split/lib/calc'
import { formatMoney } from '@/apps/split/lib/format'

function describe(c: PairChange): string {
  switch (c.kind) {
    case 'tick':
      return `${c.title}: ${c.from} → ${c.to} ${formatMoney(c.after)} paid`
    case 'adjust':
      return `${c.title}: ${c.from}'s ${formatMoney(c.before)} payment adjusted to ${formatMoney(c.after)}`
    case 'remove':
      return `${c.title}: old ${formatMoney(c.before)} payment ${c.from} → ${c.to} removed`
  }
}

/** Everything a resolve will change, shown before the user confirms. */
export function ResolvePlanSummary({ plan }: { plan: PairResolvePlan }) {
  return (
    <>
      <p>This marks every line between them as paid.</p>
      <ul className="space-y-2 rounded-md bg-secondary/60 p-3 text-foreground">
        {plan.changes.map((c) => (
          <li key={`${c.nightId}:${c.from}>${c.to}`} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{describe(c)}</span>
          </li>
        ))}
      </ul>
      {plan.toArchive.length > 0 && (
        <p className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-foreground">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>
            <b>{plan.toArchive.map((t) => t.title).join(', ')}</b> will be fully paid and move to
            the archive.
          </span>
        </p>
      )}
    </>
  )
}
