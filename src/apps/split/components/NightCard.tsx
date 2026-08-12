import { Link } from 'react-router-dom'
import { ChevronRight, Receipt, Users } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import { totalFronted } from '@/apps/split/lib/calc'
import type { Night } from '@/apps/split/types'

interface NightCardProps {
  night: Night
}

export function NightCard({ night }: NightCardProps) {
  const total = totalFronted([night])
  const people = night.participants.length
  const title = night.title || formatDate(night.date)

  return (
    <Link to={`/night/${night.id}`} className="block">
      <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary/50">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{title}</p>
            {night.status === 'settled' && <Badge variant="success">Done</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(night.date)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {people} {people === 1 ? 'person' : 'people'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" />
              {night.items.length} {night.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-right">
          <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>
    </Link>
  )
}
