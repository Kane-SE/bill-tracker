import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, CheckCircle2, Plus, Receipt, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { ParticipantEditor } from '@/apps/split/components/ParticipantEditor'
import { ItemRow } from '@/apps/split/components/ItemRow'
import { ItemDialog, type ItemDraft } from '@/apps/split/components/ItemDialog'
import { BillPhotosCard } from '@/apps/split/components/BillPhotosCard'
import { DebtLineList } from '@/apps/split/components/DebtLineList'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { EmptyState } from '@/shared/components/EmptyState'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { useSplitStore, useNight } from '@/apps/split/store/useSplitStore'
import { useBillPhotos } from '@/apps/split/store/useBillPhotos'
import { deletePhoto, deletePhotosForNight, requestPersistentStorage, savePhoto } from '@/apps/split/lib/photoStore'
import { downscaleToJpeg } from '@/shared/lib/image'
import { computeNightLines, totalFronted, type DebtLine } from '@/apps/split/lib/calc'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import type { Item } from '@/apps/split/types'
import { toast } from 'sonner'

export function NightDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const night = useNight(id)

  const updateNight = useSplitStore((s) => s.updateNight)
  const setParticipants = useSplitStore((s) => s.setParticipants)
  const knownNames = useSplitStore((s) => s.knownNames)
  const addItem = useSplitStore((s) => s.addItem)
  const updateItem = useSplitStore((s) => s.updateItem)
  const deleteItem = useSplitStore((s) => s.deleteItem)
  const markDone = useSplitStore((s) => s.markDone)
  const restoreNight = useSplitStore((s) => s.restoreNight)
  const deleteNight = useSplitStore((s) => s.deleteNight)
  const markLinePaid = useSplitStore((s) => s.markLinePaid)
  const unmarkLinePaid = useSplitStore((s) => s.unmarkLinePaid)
  const deleteItemsByPhoto = useSplitStore((s) => s.deleteItemsByPhoto)
  const { photos, reload } = useBillPhotos(id)
  const fileInput = useRef<HTMLInputElement>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [confirmAllPaid, setConfirmAllPaid] = useState(false)

  const lines = useMemo(() => (night ? computeNightLines(night) : []), [night])
  const paidCount = lines.filter((l) => l.remaining === 0).length

  if (!night) {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Nomnom not found" backTo="/split" />
        <EmptyState
          icon={Receipt}
          title="This Nomnom doesn't exist"
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

  function toggleLine(line: DebtLine) {
    if (!night) return
    const label = `${line.from} → ${line.to}`
    if (line.remaining === 0) {
      unmarkLinePaid(night.id, line.from, line.to)
      toast.success(`${label} unmarked`)
      return
    }
    markLinePaid(night.id, line.from, line.to, line.owed)
    toast.success(`${label} marked paid`)
    // Prompt to archive when this tick closes the last open line.
    if (lines.every((l) => l === line || l.remaining === 0)) setConfirmAllPaid(true)
  }

  function confirmDeleteItem() {
    if (night && deletingItemId) {
      deleteItem(night.id, deletingItemId)
      toast.success('Item removed')
    }
    setDeletingItemId(null)
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !night) return
    setSavingPhoto(true)
    try {
      let scaled
      try {
        scaled = await downscaleToJpeg(file)
      } catch {
        toast.error("Couldn't read that image")
        return
      }
      let photo
      try {
        photo = await savePhoto({ nightId: night.id, ...scaled })
      } catch (err) {
        console.error(err)
        toast.error("Couldn't save the photo")
        return
      }
      requestPersistentStorage()
      navigate(`/split/night/${night.id}/photo/${photo.id}`)
    } finally {
      setSavingPhoto(false)
    }
  }

  const deletingPhotoItems = deletingPhotoId
    ? night.items.filter((i) => i.photoId === deletingPhotoId)
    : []

  async function confirmDeletePhoto() {
    if (!night || !deletingPhotoId) return
    const photoId = deletingPhotoId
    setDeletingPhotoId(null)
    deleteItemsByPhoto(night.id, photoId)
    try {
      await deletePhoto(photoId)
      toast.success('Bill photo deleted')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't delete the photo")
    }
    reload()
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <PageHeader
        title={night.title || formatDate(night.date)}
        subtitle={formatDate(night.date)}
        backTo="/split"
        actions={
          night.status === 'settled' ? <Badge variant="success">Done</Badge> : undefined
        }
      />

      {isActive && (
        <div className="mb-5 space-y-1.5">
          <Label htmlFor="night-title">Nomnom name (optional)</Label>
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

      {photos.length > 0 && (
        <BillPhotosCard
          photos={photos}
          items={night.items}
          readOnly={!isActive}
          onOpen={(photoId) => navigate(`/split/night/${night.id}/photo/${photoId}`)}
          onDelete={setDeletingPhotoId}
        />
      )}

      <Card className="mb-5">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Items <span className="text-muted-foreground">· {formatMoney(total)}</span>
          </CardTitle>
          {isActive && (
            <div className="flex gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoPick}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                disabled={night.participants.length === 0 || savingPhoto}
                aria-label={savingPhoto ? 'Saving…' : 'From photo'}
              >
                <Camera className="h-4 w-4" />
                <span className="hidden min-[400px]:inline">{savingPhoto ? 'Saving…' : 'From photo'}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={openAdd}
                disabled={night.participants.length === 0 || savingPhoto}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">This Nomnom's balances</CardTitle>
          {lines.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {paidCount} of {lines.length} paid
            </span>
          )}
        </CardHeader>
        <CardContent>
          <DebtLineList lines={lines} readOnly={!isActive} onToggle={toggleLine} />
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
            Mark done
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
          Delete Nomnom
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
        title="Mark this Nomnom as done?"
        description="Its debts will be settled and it moves to the archive. You can restore it later."
        confirmLabel="Mark done"
        variant="success"
        onConfirm={() => {
          markDone(night.id)
          toast.success('Nomnom settled')
          navigate('/split')
        }}
      />

      <ConfirmDialog
        open={confirmAllPaid}
        onOpenChange={setConfirmAllPaid}
        title="Everyone's paid"
        description="Move this Nomnom to the archive? You can restore it later."
        confirmLabel="Archive"
        variant="success"
        onConfirm={() => {
          markDone(night.id)
          toast.success('Nomnom settled')
          navigate('/split')
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Nomnom?"
        description="This permanently removes the Nomnom, its items and its bill photos. This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          deleteNight(night.id)
          deletePhotosForNight(night.id).catch(console.error)
          toast.success('Nomnom deleted')
          navigate('/split')
        }}
      />

      <ConfirmDialog
        open={deletingPhotoId !== null}
        onOpenChange={(o) => !o && setDeletingPhotoId(null)}
        title="Delete this bill photo?"
        description={
          deletingPhotoItems.length > 0
            ? `Its ${deletingPhotoItems.length === 1 ? '1 line' : `${deletingPhotoItems.length} lines`} (${formatMoney(
                deletingPhotoItems.reduce((s, i) => s + i.amount, 0),
              )}) ${deletingPhotoItems.length === 1 ? 'is' : 'are'} removed too.`
            : 'It has no lines yet.'
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeletePhoto}
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
