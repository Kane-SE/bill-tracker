import { useLayoutEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import type { PumpTab } from '@/apps/pump/hooks/usePumpFilters'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface PumpHeaderProps {
  tab: PumpTab
  onTab(t: PumpTab): void
  subtitle: React.ReactNode
  onInfo(): void
}

/** Sticky header with Charts | Titles tabs. Publishes its height as --pump-head for the sticky level headers. */
export function PumpHeader({ tab, onTab, subtitle, onInfo }: PumpHeaderProps) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--pump-head', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <PageHeader
      ref={ref}
      title="Pump"
      subtitle={subtitle}
      backTo="/"
      actions={
        <Button variant="ghost" size="icon" aria-label="About this data" onClick={onInfo}>
          <Info className="h-5 w-5" />
        </Button>
      }
    >
      <div role="group" aria-label="View" className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5">
        {(['charts', 'titles'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => onTab(t)}
            className={cn('h-10 rounded-md text-sm font-semibold transition-colors', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            {t === 'charts' ? 'Charts' : 'Titles'}
          </button>
        ))}
      </div>
    </PageHeader>
  )
}
