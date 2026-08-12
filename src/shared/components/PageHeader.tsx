import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actions?: React.ReactNode
}

/** Sticky top bar used across pages. */
export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {backTo && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
            <Link to={backTo} aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}
