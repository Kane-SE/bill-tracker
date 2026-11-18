import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { formatMoney } from '@/apps/split/lib/format'
import type { Item } from '@/apps/split/types'

interface BillPhotosCardProps {
  photos: { id: string; url: string }[]
  items: Item[]
  readOnly?: boolean
  onOpen: (photoId: string) => void
  onDelete: (photoId: string) => void
}

export function BillPhotosCard({ photos, items, readOnly, onOpen, onDelete }: BillPhotosCardProps) {
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-base">
          Bill photos <span className="text-muted-foreground">· {photos.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {photos.map((photo) => {
          const lines = items.filter((i) => i.photoId === photo.id)
          const sum = lines.reduce((s, i) => s + i.amount, 0)
          return (
            <div key={photo.id} className="flex items-center gap-1 rounded-lg border border-border bg-card p-2">
              <button
                type="button"
                onClick={() => onOpen(photo.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded text-left"
              >
                <img src={photo.url} alt="Bill photo" className="h-16 w-12 shrink-0 rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {lines.length === 0 ? 'Not tagged yet' : `${lines[0].payer} paid ${formatMoney(sum)}`}
                  </span>
                  {lines.length > 0 && (
                    <span className="block text-sm text-muted-foreground">
                      {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                    </span>
                  )}
                </span>
              </button>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => onDelete(photo.id)}
                  aria-label="Delete bill photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
