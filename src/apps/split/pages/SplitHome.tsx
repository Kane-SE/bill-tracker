import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Moon, Plus, Settings, UsersRound, Wallet } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { BottomBar } from '@/shared/components/BottomBar'
import { BalanceList } from '@/apps/split/components/BalanceList'
import { NightCard } from '@/apps/split/components/NightCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { HeaderIconLink } from '@/shared/components/HeaderIconLink'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { PairSheet } from '@/apps/split/components/PairSheet'
import { computeBalances, computePairBreakdown, planPairResolve, summarizePeople } from '@/apps/split/lib/calc'
import { PersonFilter, useActivePerson } from '@/apps/split/components/PersonFilter'
import { formatMoney } from '@/apps/split/lib/format'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ResolvePlanSummary } from '@/apps/split/components/ResolvePlanSummary'
import type { Debt } from '@/apps/split/types'

export function SplitHome() {
  const navigate = useNavigate()
  const nights = useSplitStore((s) => s.nights)

  const activeNights = useMemo(
    () => nights.filter((n) => n.status === 'active'),
    [nights],
  )
  const settledCount = nights.length - activeNights.length
  const balances = useMemo(() => computeBalances(activeNights), [activeNights])
  const people = useMemo(() => summarizePeople(nights, balances), [nights, balances])
  const person = useActivePerson(people)
  const [showAll, setShowAll] = useState(false)
  const rows = person ? balances.filter((d) => d.from === person || d.to === person) : balances
  const visibleRows = person || showAll ? rows : rows.slice(0, 5)
  const shownNights = person ? activeNights.filter((n) => n.participants.includes(person)) : activeNights
  const homeSummary = (name: string) => {
    const p = people.find((x) => x.name === name)!
    if (p.owes === 0 && p.owed === 0) return 'all settled'
    return (
      <>
        owes <b className="text-destructive">{formatMoney(p.owes)}</b> · is owed{' '}
        <b className="text-success">{formatMoney(p.owed)}</b>
      </>
    )
  }
  const [selected, setSelected] = useState<Debt | null>(null)
  const resolvePair = useSplitStore((s) => s.resolvePair)
  const restoreNightsSnapshot = useSplitStore((s) => s.restoreNightsSnapshot)
  const [confirming, setConfirming] = useState<Debt | null>(null)
  const plan = useMemo(
    () => (confirming ? planPairResolve(activeNights, confirming.from, confirming.to) : null),
    [confirming, activeNights],
  )

  // Undo lives only while you stay on Home: leaving could let you edit a touched
  // Nomnom, and restoring the snapshot would then wipe that edit.
  const undoToast = useRef<string | number | null>(null)
  useEffect(() => () => {
    if (undoToast.current != null) toast.dismiss(undoToast.current)
  }, [])

  function confirmResolve() {
    if (!confirming || !plan) return
    const { from, to } = confirming
    // Only one Undo may live: a stale one would restore an older whole-night snapshot.
    if (undoToast.current != null) toast.dismiss(undoToast.current)
    const snapshot = resolvePair(from, to)
    setSelected(null)
    const n = plan.toArchive.length
    const msg = `${from} → ${to} resolved${n ? ` · ${n} Nomnom${n === 1 ? '' : 's'} archived` : ''}`
    undoToast.current = toast.success(msg, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          restoreNightsSnapshot(snapshot)
          toast.success('Resolve undone')
        },
      },
    })
  }
  const sourceCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of balances) {
      const ids = new Set(computePairBreakdown(activeNights, d.from, d.to).entries.map((e) => e.nightId))
      m.set(`${d.from}->${d.to}`, ids.size)
    }
    return m
  }, [balances, activeNights])
  const subtitle = (d: Debt) => {
    const n = sourceCount.get(`${d.from}->${d.to}`) ?? 0
    return `from ${n} ${n === 1 ? 'Nomnom' : 'Nomnoms'}`
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <PageHeader
        title="Split"
        subtitle="Who owes whom"
        backTo="/"
        actions={
          <>
            <HeaderIconLink to="/split/archive" label="Archive">
              <Archive className="h-5 w-5" />
            </HeaderIconLink>
            <HeaderIconLink to="/split/names" label="Common names">
              <UsersRound className="h-5 w-5" />
            </HeaderIconLink>
            <HeaderIconLink to="/settings" label="Settings">
              <Settings className="h-5 w-5" />
            </HeaderIconLink>
          </>
        }
      />

      <PersonFilter people={people} summary={homeSummary} />

      <Card className="mb-5 overflow-hidden">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle>Current balances</CardTitle>
        </CardHeader>
        <CardContent>
          {activeNights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active Nomnoms yet. Start one below to begin tracking.
            </p>
          ) : person && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{person} is all settled.</p>
          ) : (
            <>
              <BalanceList debts={visibleRows} onSelect={setSelected} subtitle={subtitle} />
              {!person && rows.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-2.5 h-10 w-full rounded-md border border-dashed border-border text-sm font-semibold"
                >
                  {showAll ? 'Show less' : `Show all (${rows.length})`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Nomnoms{person ? ` · with ${person}` : ''}
        </h2>
        {settledCount > 0 && (
          <span className="text-xs text-muted-foreground">{settledCount} archived</span>
        )}
      </div>

      {activeNights.length === 0 ? (
        <EmptyState
          icon={Moon}
          title="No active Nomnoms"
          description="Create a Nomnom, add who came and what was paid, and balances appear here."
        />
      ) : shownNights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active Nomnoms with {person}.</p>
      ) : (
        <div className="space-y-3">
          {shownNights.map((night) => (
            <NightCard key={night.id} night={night} />
          ))}
        </div>
      )}

      <PairSheet
        debt={selected}
        nights={activeNights}
        onOpenChange={(open) => !open && setSelected(null)}
        onResolve={setConfirming}
      />
      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `Resolve ${confirming.from} → ${confirming.to}?` : ''}
        description={plan ? <ResolvePlanSummary plan={plan} /> : undefined}
        confirmLabel="Resolve"
        variant="success"
        onConfirm={confirmResolve}
      />

      <BottomBar>
        <Button size="lg" className="w-full" onClick={() => navigate('/split/new')}>
          <Plus className="h-5 w-5" />
          New Nomnom
        </Button>
      </BottomBar>
    </div>
  )
}
