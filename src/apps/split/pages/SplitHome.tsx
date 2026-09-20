import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Moon, Plus, Settings, UsersRound, Wallet } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { BalanceList } from '@/apps/split/components/BalanceList'
import { NightCard } from '@/apps/split/components/NightCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { HeaderIconLink } from '@/shared/components/HeaderIconLink'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { computeBalances } from '@/apps/split/lib/calc'

export function SplitHome() {
  const navigate = useNavigate()
  const nights = useSplitStore((s) => s.nights)

  const activeNights = useMemo(
    () => nights.filter((n) => n.status === 'active'),
    [nights],
  )
  const settledCount = nights.length - activeNights.length
  const balances = useMemo(() => computeBalances(activeNights), [activeNights])

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
          ) : (
            <BalanceList debts={balances} />
          )}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Nomnoms
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
      ) : (
        <div className="space-y-3">
          {activeNights.map((night) => (
            <NightCard key={night.id} night={night} />
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="w-full" onClick={() => navigate('/split/new')}>
            <Plus className="h-5 w-5" />
            New Nomnom
          </Button>
        </div>
      </div>
    </div>
  )
}
