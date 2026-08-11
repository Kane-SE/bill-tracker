import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Plus, Receipt, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { ParticipantEditor } from '@/components/ParticipantEditor'
import { ItemRow } from '@/components/ItemRow'
import { ItemDialog, type ItemDraft } from '@/components/ItemDialog'
import { BalanceList } from '@/components/BalanceList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore, useNight } from '@/store/useAppStore'
import { computeNightBalances, totalFronted } from '@/lib/calc'
import { formatDate, formatMoney } from '@/lib/format'
import type { Item } from '@/types'
import { toast } from 'sonner'

export function NightDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const night = useNight(id)

  const updateNight = useAppStore((s) => s.updateNight)
  const setParticipants = useAppStore((s) => s.setParticipants)
  const knownNames = useAppStore((s) => s.knownNames)
  const addItem = useAppStore((s) => s.addItem)
  const updateItem = useAppStore((s) => s.updateItem)
  const deleteItem = useAppStore((s) => s.deleteItem)
  const markDone = useAppStore((s) => s.markDone)
  const restoreNight = useAppStore((s) => s.restoreNight)
  const deleteNight = useAppStore((s) => s.deleteNight)

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const balances = useMemo(() => (night ? computeNightBalances(night) : []), [night])

  if (!night) {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Night not found" backTo="/" />
        <EmptyState
          icon={Receipt}
          title="This night doesn't exist"
          description="It may have been deleted."
        />
      </div>
    )
  }

  const isActive = night.status === 'active'
  const total = totalFronted([night])

  function openAdd() {
    setEditingItem(undefined)
    setItemDialogOpen(true)
  }

  function openEdit(item: Item) {
    setEditingItem(item)
    setItemDialogOpen(true)
  }

  function handleSubmitItem(draft: ItemDraft) {
    if (!night) return
    if (editingItem) {
      updateItem(night.id, editingItem.id, draft)
      toast.success('Item updated')
    } else {
      addItem(night.id, draft)
      toast.success('Item added')
    }
  }

  function confirmDeleteItem() {
    if (night && deletingItemId) {
      deleteItem(night.id, deletingItemId)
      toast.success('Item removed')
    }
    setDeletingItemId(null)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <PageHeader
        title={night.title || formatDate(night.date)}
        subtitle={formatDate(night.date)}
        backTo="/"
        actions={
          night.status === 'settled' ? <Badge variant="success">Done</Badge> : undefined
        }
      />

      {isActive && (
        <div className="mb-5 space-y-1.5">
          <Label htmlFor="night-title">Night name (optional)</Label>
          <Input
            id="night-title"
            value={night.title ?? ''}
            placeholder={formatDate(night.date)}
            onChange={(e) => updateNight(night.id, { title: e.target.value || undefined })}
          />
        </div>
      )}

      {isActive && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">People</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantEditor
              participants={night.participants}
              knownNames={knownNames}
              onChange={(names) => setParticipants(night.id, names)}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mb-5">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Items <span className="text-muted-foreground">· {formatMoney(total)}</span>
          </CardTitle>
          {isActive && (
            <Button size="sm" variant="secondary" onClick={openAdd} disabled={night.participants.length === 0}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {night.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {night.participants.length === 0
                ? 'Add people above, then add what was paid.'
                : 'No items yet. Tap “Add” to record a payment.'}
            </p>
          ) : (
            night.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                readOnly={!isActive}
                onEdit={() => openEdit(item)}
                onDelete={() => setDeletingItemId(item.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">This night's balances</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceList debts={balances} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isActive ? (
          <Button
            size="lg"
            variant="success"
            className="w-full"
            onClick={() => setConfirmDone(true)}
            disabled={night.items.length === 0}
          >
            <CheckCircle2 className="h-5 w-5" />
            Mark night as done
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="w-full" onClick={() => restoreNight(night.id)}>
            <RotateCcw className="h-5 w-5" />
            Restore to active
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete night
        </Button>
      </div>

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        participants={night.participants}
        initial={editingItem}
        onSubmit={handleSubmitItem}
      />

      <ConfirmDialog
        open={confirmDone}
        onOpenChange={setConfirmDone}
        title="Mark this night as done?"
        description="Its debts will be settled and it moves to the archive. You can restore it later."
        confirmLabel="Mark done"
        variant="success"
        onConfirm={() => {
          markDone(night.id)
          toast.success('Night settled')
          navigate('/')
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this night?"
        description="This permanently removes the night and its items. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteNight(night.id)
          toast.success('Night deleted')
          navigate('/')
        }}
      />

      <ConfirmDialog
        open={deletingItemId !== null}
        onOpenChange={(o) => !o && setDeletingItemId(null)}
        title="Remove this item?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmDeleteItem}
      />
    </div>
  )
}
