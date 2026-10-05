import { CloudOff } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatStamp } from '@/apps/hub/lib/dates'

export function SyncBanner({ fetchedAt, onRetry }: { fetchedAt: number | null; onRetry: () => void }) {
  return (
    <div role="status" className="mt-4 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
      <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-warning">Can't reach GitHub</p>
        <p className="mt-0.5 text-pretty text-sm text-foreground/80">
          {fetchedAt ? `Showing your copy from ${formatStamp(fetchedAt)}. ` : ''}New ideas stay on this phone until you're back online.
        </p>
      </div>
      <div className="flex shrink-0 items-center self-center">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
