import { LayoutGrid, Rows3 } from 'lucide-react'
import type { ChartView } from '@/apps/pump/store/usePumpStore'
import { Button } from '@/shared/ui/button'

/** Header button that flips the chart list between grid and list; shows the view you would switch to. */
export function ViewToggle({ view, onChange }: { view: ChartView; onChange(v: ChartView): void }) {
  const next: ChartView = view === 'grid' ? 'list' : 'grid'
  const Icon = view === 'grid' ? Rows3 : LayoutGrid
  return (
    <Button variant="ghost" size="icon" aria-label={view === 'grid' ? 'Show as list' : 'Show as grid'} onClick={() => onChange(next)}>
      <Icon className="h-5 w-5" />
    </Button>
  )
}
