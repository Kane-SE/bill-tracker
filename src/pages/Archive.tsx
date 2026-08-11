import { useMemo } from 'react'
import { Archive as ArchiveIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { NightCard } from '@/components/NightCard'
import { EmptyState } from '@/components/EmptyState'
import { useAppStore } from '@/store/useAppStore'

export function Archive() {
  const nights = useAppStore((s) => s.nights)
  const settled = useMemo(
    () =>
      nights
        .filter((n) => n.status === 'settled')
        .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? '')),
    [nights],
  )

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title="Archive" subtitle="Settled nights" backTo="/" />

      {settled.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing archived yet"
          description="Nights you mark as done will appear here. You can still open them to review or restore."
        />
      ) : (
        <div className="space-y-3">
          {settled.map((night) => (
            <NightCard key={night.id} night={night} />
          ))}
        </div>
      )}
    </div>
  )
}
