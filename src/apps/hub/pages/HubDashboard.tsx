import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/apps/hub/auth/useAuthStore'
import { verifyAccess } from '@/apps/hub/auth/verify-access'
import { getHubClient } from '@/apps/hub/github/instance'
import { relativeTime } from '@/apps/hub/lib/dates'
import { needsYou } from '@/apps/hub/lib/needs-you'
import { dashboardView } from '@/apps/hub/lib/view-state'
import type { NeedsYouItem } from '@/apps/hub/lib/types'
import { describeError, parseHubData, useHubStore } from '@/apps/hub/store/useHubStore'
import { NeedsYouList } from '@/apps/hub/components/NeedsYouList'
import { WipList } from '@/apps/hub/components/WipList'
import { IdeasSection } from '@/apps/hub/components/IdeasSection'
import { ProjectList } from '@/apps/hub/components/ProjectList'
import { SyncBanner } from '@/apps/hub/components/SyncBanner'
import { HubSkeleton } from '@/apps/hub/components/HubSkeleton'
import { HubEmpty } from '@/apps/hub/components/HubEmpty'
import { HubAvatar } from '@/apps/hub/components/HubAvatar'
import { NewIdeaDialog } from '@/apps/hub/components/NewIdeaDialog'

const FOREGROUND_REFRESH_MS = 5 * 60 * 1000

export function HubDashboard() {
  const navigate = useNavigate()
  const files = useHubStore((s) => s.files)
  const nowFiles = useHubStore((s) => s.nowFiles)
  const fetchedAt = useHubStore((s) => s.fetchedAt)
  const status = useHubStore((s) => s.status)
  const errors = useHubStore((s) => s.errors)
  const pending = useHubStore((s) => s.pending)
  const user = useAuthStore((s) => s.user)
  const [newOpen, setNewOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const today = useMemo(() => new Date(), [fetchedAt])
  const data = useMemo(() => parseHubData(files, nowFiles), [files, nowFiles])
  const repoLinks = useMemo(() => new Map(data.projects.filter((p) => p.link).map((p) => [p.name, p.link!])), [data.projects])
  const items = useMemo(() => needsYou(data.wip, data.ideas, today), [data, today])

  const sync = useCallback(async () => {
    const client = getHubClient()
    try {
      await useHubStore.getState().syncPending(client)
    } catch (e) {
      // syncPending rethrows what a retry won't fix (conflict after retries, 413, 5xx); the idea stays queued.
      toast.error(describeError(e))
    }
    // refresh records its own errors in state; the catch only keeps `void sync()` from leaking a rejection.
    await useHubStore.getState().refresh(client).catch(() => {})
  }, [])

  useEffect(() => {
    void sync()
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > FOREGROUND_REFRESH_MS) void sync()
    }
    const onOnline = () => void sync()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [sync])

  async function onRefresh() {
    setRefreshing(true)
    try {
      await sync()
    } finally {
      setRefreshing(false)
    }
  }

  function openItem(item: NeedsYouItem) {
    if (item.target.type === 'idea') navigate(`/hub/ideas/${item.target.id}`)
    else document.getElementById(`wip-${item.target.project}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const view = dashboardView({ status, fetchedAt, data, errors, pendingCount: pending.length })

  // An empty repo can also mean the App was uninstalled from personal-hub: the token still works, but every file
  // answers 404. Re-check access once each time the view turns empty; HubHome shows NoAccess when it is gone.
  // Keyed on the `view` string, so storing the answer (a new `user` object) does not run it again.
  useEffect(() => {
    if (view !== 'empty') return
    let active = true
    verifyAccess(undefined, () => active).catch(() => {})
    return () => {
      active = false
    }
  }, [view])

  const firstLoad = view === 'loading'
  const subtitle = firstLoad ? 'Loading…' : fetchedAt ? `Updated ${relativeTime(fetchedAt, Date.now())}` : 'Not synced yet'

  return (
    <div className="mx-auto -mt-2 max-w-lg px-4 pb-28 lg:max-w-6xl lg:px-8 lg:pb-12">
      <PageHeader
        title="Hub"
        subtitle={subtitle}
        backTo="/"
        className="mb-2 lg:-mx-8 lg:px-8"
        actions={
          <>
            <Button variant="ghost" size="icon" aria-label="Refresh" title="Refresh" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && 'animate-spin motion-reduce:animate-none')} />
            </Button>
            <HubAvatar user={user} />
          </>
        }
      />
      {status === 'offline' && <SyncBanner fetchedAt={fetchedAt} onRetry={onRefresh} />}
      {firstLoad ? (
        <HubSkeleton />
      ) : view === 'empty' ? (
        <HubEmpty onNew={() => setNewOpen(true)} />
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
          <div className="lg:col-span-7">
            <NeedsYouList items={items} onOpen={openItem} />
            <WipList cards={data.wip} today={today} repoLinks={repoLinks} error={errors.now} />
          </div>
          <div className="lg:col-span-5">
            <IdeasSection ideas={data.ideas} pending={pending} today={today} error={errors.ideas} onNew={() => setNewOpen(true)} />
            <ProjectList projects={data.projects} error={errors.projects} />
          </div>
        </div>
      )}
      {!firstLoad && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto max-w-lg px-4 py-3">
            <Button className="w-full" onClick={() => setNewOpen(true)}>
              <Plus />
              New idea
            </Button>
          </div>
        </div>
      )}
      <NewIdeaDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}
