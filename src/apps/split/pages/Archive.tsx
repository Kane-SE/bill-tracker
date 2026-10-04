import { useMemo } from 'react'
import { Archive as ArchiveIcon } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { NightCard } from '@/apps/split/components/NightCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { PersonFilter, useActivePerson } from '@/apps/split/components/PersonFilter'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { computeBalances, summarizePeople } from '@/apps/split/lib/calc'

export function Archive() {
  const nights = useSplitStore((s) => s.nights)
  const settled = useMemo(
    () =>
      nights
        .filter((n) => n.status === 'settled')
        .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? '')),
    [nights],
  )
  // Same people and totals as Home, so the picker reads identically on both screens.
  const people = useMemo(
    () => summarizePeople(nights, computeBalances(nights.filter((n) => n.status === 'active'))),
    [nights],
  )
  const person = useActivePerson(people)
  const shown = person ? settled.filter((n) => n.participants.includes(person)) : settled
  const archiveSummary = (name: string) => {
    const n = settled.filter((x) => x.participants.includes(name)).length
    return `${n} archived ${n === 1 ? 'Nomnom' : 'Nomnoms'}`
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title="Archive" subtitle="Settled Nomnoms" backTo="/split" />

      {settled.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing archived yet"
          description="Nomnoms you mark as done will appear here. You can still open them to review or restore."
        />
      ) : (
        <>
          <PersonFilter people={people} summary={archiveSummary} />
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived Nomnoms with {person}.</p>
          ) : (
            <div className="space-y-3">
              {shown.map((night) => (
                <NightCard key={night.id} night={night} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
