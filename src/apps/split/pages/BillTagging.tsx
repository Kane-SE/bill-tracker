import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, ImageOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/shared/components/PageHeader'
import { PanZoom } from '@/shared/components/PanZoom'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { EmptyState } from '@/shared/components/EmptyState'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { BillLineCard } from '@/apps/split/components/BillLineCard'
import { ItemDialog, type ItemDraft } from '@/apps/split/components/ItemDialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useSplitStore, useNight } from '@/apps/split/store/useSplitStore'
import { useMe } from '@/apps/split/store/useMe'
import { getPhoto, updatePhoto, type BillPhoto } from '@/apps/split/lib/photoStore'
import {
  addBillPerson,
  assignedTotal,
  draftToItems,
  initialPayer,
  lineShares,
  lineStatus,
  newLine,
  reconcile,
  type DraftLine,
} from '@/apps/split/lib/billDraft'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import { cn, uid } from '@/shared/lib/utils'
import type { Item } from '@/apps/split/types'

/**
 * Leaves the tagging screen for the Nomnom: back one step when there is
 * history to go back to, else straight to the Nomnom (a reload or a deep link).
 */
function useLeaveToNomnom(nightId: string | undefined) {
  const navigate = useNavigate()
  return () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(`/split/night/${nightId}`, { replace: true })
  }
}

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; photo: BillPhoto }

const linesLabel = (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`

export function BillTagging() {
  const { id, photoId } = useParams()
  const night = useNight(id)
  const leave = useLeaveToNomnom(id)
  const knownNames = useSplitStore((s) => s.knownNames)
  const addItemsFromPhoto = useSplitStore((s) => s.addItemsFromPhoto)
  const me = useMe((s) => s.me)

  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  useEffect(() => {
    let cancelled = false
    setLoaded({ state: 'loading' })
    getPhoto(photoId ?? '')
      .then((photo) => {
        if (cancelled) return
        setLoaded(photo && photo.nightId === id ? { state: 'ready', photo } : { state: 'missing' })
      })
      .catch((err) => {
        console.error('Could not load bill photo', err)
        if (!cancelled) setLoaded({ state: 'missing' })
      })
    return () => {
      cancelled = true
    }
  }, [photoId, id])

  const photo = loaded.state === 'ready' ? loaded.photo : undefined
  const [photoUrl, setPhotoUrl] = useState<string>()
  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo.blob)
    setPhotoUrl(url)
    return () => {
      URL.revokeObjectURL(url)
      setPhotoUrl(undefined)
    }
  }, [photo])

  const backTo = night ? `/split/night/${night.id}` : '/split'
  if (!night || loaded.state === 'missing') {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Tag the bill" backTo={backTo} />
        <EmptyState icon={ImageOff} title="This bill photo isn't on this device">
          <Button asChild variant="secondary">
            <Link to={backTo}>{night ? 'Back to the Nomnom' : 'Back to Split'}</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }
  if (!photo || !photoUrl) {
    return (
      <div className="mx-auto max-w-lg px-4">
        <PageHeader title="Tag the bill" subtitle={night.title || formatDate(night.date)} backTo={backTo} />
      </div>
    )
  }

  return (
    <Tagging
      key={photo.id}
      nightId={night.id}
      readOnly={night.status === 'settled'}
      addedItems={night.items.filter((i) => i.photoId === photo.id)}
      addItems={addItemsFromPhoto}
      photo={photo}
      photoUrl={photoUrl}
      nightTitle={night.title || formatDate(night.date)}
      participants={night.participants}
      me={me}
      knownNames={knownNames}
      onClose={leave}
    />
  )
}

interface TaggingProps {
  nightId: string
  readOnly: boolean
  /** Items this photo already added to the Nomnom. */
  addedItems: Item[]
  addItems: (nightId: string, items: Omit<Item, 'id'>[], newNames: string[]) => void
  photo: BillPhoto
  photoUrl: string
  nightTitle: string
  participants: string[]
  me: string | null
  knownNames: string[]
  onClose: () => void
}

function Tagging({
  nightId,
  readOnly,
  addedItems,
  addItems,
  photo,
  photoUrl,
  nightTitle,
  participants,
  me,
  knownNames,
  onClose,
}: TaggingProps) {
  const counter = useRef(0)
  const nextKey = () => `${uid()}-${counter.current++}`

  const existingPayers = addedItems.map((i) => i.payer)
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine(nextKey())])
  const [extraPeople, setExtraPeople] = useState<string[]>([])
  const [payer, setPayer] = useState(() => initialPayer({ saved: photo.payer, existingPayers, me, participants }))
  const [total, setTotal] = useState(photo.total ?? 0)
  const [thousands, setThousands] = useState(photo.thousands ?? false)
  const [collapsed, setCollapsed] = useState(false)
  const [adjustKey, setAdjustKey] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [showInvalid, setShowInvalid] = useState(false)
  const [committing, setCommitting] = useState(false)
  // Set synchronously so a fast double tap on Done can't add the lines twice.
  const committingRef = useRef(false)
  // Already-added total at the moment Done was tapped (see done()).
  const committedBase = useRef(0)

  const unit = thousands ? 1000 : 1
  const billPeople = useMemo(() => [...participants, ...extraPeople], [participants, extraPeople])

  const alreadyAdded = addedItems.reduce((sum, i) => sum + i.amount, 0)
  // While committing, the drafts are also in addedItems; use the pre-commit base so nothing is counted twice.
  const assigned = assignedTotal(lines, committing ? committedBase.current : alreadyAdded)
  const check = reconcile(assigned, total || undefined)
  const readyCount = lines.filter((l) => lineStatus(l) === 'ready').length
  const nonEmptyCount = lines.filter((l) => lineStatus(l) !== 'empty').length
  const progress = total ? Math.min(assigned / total, 1) : 0

  function addPerson(raw: string): string {
    const { people, name } = addBillPerson(billPeople, raw)
    if (name && people.length > billPeople.length) setExtraPeople(people.slice(participants.length))
    return name ?? ''
  }

  function updateLine(key: string, next: DraftLine) {
    setLines((ls) => ls.map((l) => (l.key === key ? next : l)))
  }

  function addLine(preset?: { label: string; people: string[] }) {
    setLines((ls) => [...ls, newLine(nextKey(), preset)])
  }

  const adjusting = lines.find((l) => l.key === adjustKey)

  function submitAdjust(draft: ItemDraft) {
    if (!adjusting) return
    const names = new Set(draft.shares.map((s) => s.name))
    updateLine(adjusting.key, {
      ...adjusting,
      label: draft.label,
      amount: draft.amount,
      people: billPeople.filter((p) => names.has(p)),
      shares: draft.shares,
    })
  }

  function tryLeave() {
    if (committingRef.current) return
    if (!readOnly && nonEmptyCount > 0) setConfirmLeave(true)
    else onClose()
  }

  async function done() {
    if (committingRef.current) return
    const incomplete = lines.filter((l) => lineStatus(l) === 'incomplete').length
    if (incomplete > 0) {
      setShowInvalid(true)
      toast.error(`Fill in or remove ${linesLabel(incomplete)}`)
      return
    }
    committingRef.current = true
    // Captured before the write: once addItems runs, night.items already holds these lines.
    committedBase.current = alreadyAdded
    setCommitting(true)
    let items: Omit<Item, 'id'>[]
    try {
      items = draftToItems(lines, payer, photo.id)
      // A name added and then left unused doesn't join the Nomnom.
      const used = new Set(lines.filter((l) => lineStatus(l) === 'ready').flatMap((l) => l.people))
      addItems(nightId, items, extraPeople.filter((n) => used.has(n)))
    } catch (err) {
      console.error('Could not add the bill lines', err)
      committingRef.current = false
      setCommitting(false)
      toast.error("Couldn't add the lines")
      return
    }
    try {
      await updatePhoto(photo.id, { payer, total: total || undefined, thousands })
    } catch (err) {
      // The lines are the important part; the photo just won't remember payer/total/thousands.
      console.error('Could not save the bill photo details', err)
    }
    toast.success(`${linesLabel(items.length)} added`)
    onClose()
  }

  const addedList = addedItems.length > 0 && !(committing && !readOnly) && (
    <div className="mt-4">
      <h2 className="text-sm font-semibold">
        {readOnly ? 'Lines from this bill' : 'Already added · edit them in the Nomnom'}
      </h2>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card text-sm">
        {addedItems.map((i) => (
          <li key={i.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">
              {i.label} · <span className="text-muted-foreground">{i.shares.map((s) => s.name).join(', ')}</span>
            </span>
            <span className="shrink-0 font-medium">{formatMoney(i.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="mx-auto max-w-lg px-4 pb-24">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={tryLeave} disabled={committing} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{readOnly ? 'Bill photo' : 'Tag the bill'}</h1>
          <p className="truncate text-xs text-muted-foreground">{nightTitle}</p>
        </div>
        {!readOnly && (
          <Button size="sm" disabled={!payer || nonEmptyCount === 0 || committing} onClick={() => void done()}>
            Done
          </Button>
        )}
      </header>

      <div className="sticky top-[65px] z-10 -mx-4 border-b border-border bg-muted">
        <div className={cn('relative w-full overflow-hidden', collapsed ? 'h-14' : 'h-[38vh]')}>
          <PanZoom src={photoUrl} alt="Bill photo" className="h-full w-full" />
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand photo' : 'Collapse photo'}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {readOnly ? (
        addedList
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-payer">Paid by</Label>
              <Select value={payer} onValueChange={setPayer} disabled={addedItems.length > 0}>
                <SelectTrigger id="bill-payer">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-total">Bill total (optional)</Label>
              <MoneyInput id="bill-total" aria-label="Bill total" value={total} unit={unit} onChange={setTotal} />
            </div>
          </div>

          <label htmlFor="bill-thousands" className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="bill-thousands"
              checked={thousands}
              onChange={(e) => setThousands(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
            />
            Bill shows thousands (×1.000)
          </label>

          <div className="mt-4 rounded-lg border border-border bg-card p-3">
            <p
              className={cn(
                'text-sm font-medium',
                check.kind === 'over' && 'text-destructive',
                check.kind === 'exact' && 'text-success',
              )}
            >
              {check.kind === 'none' && `Assigned ${formatMoney(assigned)} · ${readyCount} ${readyCount === 1 ? 'line' : 'lines'}`}
              {check.kind === 'left' && `Assigned ${formatMoney(assigned)} · ${formatMoney(check.amount)} left`}
              {check.kind === 'over' && `Over by ${formatMoney(check.amount)}`}
              {check.kind === 'exact' && 'All assigned ✓'}
            </p>
            {check.kind !== 'none' && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full rounded-full',
                    check.kind === 'over' ? 'bg-destructive' : check.kind === 'exact' ? 'bg-success' : 'bg-primary',
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
          </div>

          {addedList}

          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <BillLineCard
                key={line.key}
                line={line}
                billPeople={billPeople}
                knownNames={knownNames}
                unit={unit}
                invalid={showInvalid && lineStatus(line) === 'incomplete'}
                adjustDisabledHint={payer ? undefined : 'Pick who paid first'}
                onChange={(next) => updateLine(line.key, next)}
                onAddPerson={addPerson}
                onAdjust={() => setAdjustKey(line.key)}
                onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => addLine()}>
              + Add line
            </Button>
            <Button variant="secondary" size="sm" onClick={() => addLine({ label: 'Tax / service', people: billPeople })}>
              + Tax / service
            </Button>
            <Button variant="secondary" size="sm" onClick={() => addLine({ label: 'Tip', people: billPeople })}>
              + Tip
            </Button>
          </div>

          <ConfirmDialog
            open={confirmLeave}
            onOpenChange={setConfirmLeave}
            title={`Discard ${linesLabel(nonEmptyCount)}?`}
            description="The photo stays on the Nomnom. Tap it to tag again."
            confirmLabel="Discard"
            variant="destructive"
            onConfirm={onClose}
          />

          {adjusting && (
            <ItemDialog
              open
              onOpenChange={(o) => !o && setAdjustKey(null)}
              participants={billPeople}
              payerLocked
              unlockShares={!adjusting.shares}
              initial={{
                id: adjusting.key,
                label: adjusting.label,
                payer,
                amount: adjusting.amount,
                shares: lineShares(adjusting),
              }}
              onSubmit={submitAdjust}
            />
          )}
        </>
      )}
    </div>
  )
}
