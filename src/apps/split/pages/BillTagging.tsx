import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, ImageOff, X } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { PanZoom } from '@/shared/components/PanZoom'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { EmptyState } from '@/shared/components/EmptyState'
import { BillLineCard } from '@/apps/split/components/BillLineCard'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useSplitStore, useNight } from '@/apps/split/store/useSplitStore'
import { useMe } from '@/apps/split/store/useMe'
import { getPhoto, type BillPhoto } from '@/apps/split/lib/photoStore'
import {
  addBillPerson,
  assignedTotal,
  initialPayer,
  lineStatus,
  newLine,
  reconcile,
  type DraftLine,
} from '@/apps/split/lib/billDraft'
import { formatDate, formatMoney } from '@/apps/split/lib/format'
import { cn, uid } from '@/shared/lib/utils'

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

export function BillTagging() {
  const { id, photoId } = useParams()
  const night = useNight(id)
  const leave = useLeaveToNomnom(id)
  const knownNames = useSplitStore((s) => s.knownNames)
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
      .catch(() => {
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
      photo={photo}
      photoUrl={photoUrl}
      nightTitle={night.title || formatDate(night.date)}
      participants={night.participants}
      existingPayers={night.items.filter((i) => i.photoId === photo.id).map((i) => i.payer)}
      me={me}
      knownNames={knownNames}
      onClose={leave}
    />
  )
}

interface TaggingProps {
  photo: BillPhoto
  photoUrl: string
  nightTitle: string
  participants: string[]
  existingPayers: string[]
  me: string | null
  knownNames: string[]
  onClose: () => void
}

function Tagging({ photo, photoUrl, nightTitle, participants, existingPayers, me, knownNames, onClose }: TaggingProps) {
  const counter = useRef(0)
  const nextKey = () => `${uid()}-${counter.current++}`

  const [lines, setLines] = useState<DraftLine[]>(() => [newLine(nextKey())])
  const [extraPeople, setExtraPeople] = useState<string[]>([])
  const [payer, setPayer] = useState(() => initialPayer({ saved: photo.payer, existingPayers, me, participants }))
  const [total, setTotal] = useState(photo.total ?? 0)
  const [thousands, setThousands] = useState(photo.thousands ?? false)
  const [collapsed, setCollapsed] = useState(false)

  const unit = thousands ? 1000 : 1
  const billPeople = useMemo(() => [...participants, ...extraPeople], [participants, extraPeople])

  const alreadyAdded = 0 // Task 7: resume adds the amount of lines already made from this photo
  const assigned = assignedTotal(lines, alreadyAdded)
  const check = reconcile(assigned, total || undefined)
  const readyCount = lines.filter((l) => lineStatus(l) === 'ready').length
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

  // Seam for Task 7: opens the Adjust dialog for this line.
  function adjustLine(key: string) {
    void key
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">Tag the bill</h1>
          <p className="truncate text-xs text-muted-foreground">{nightTitle}</p>
        </div>
        {/* Seam for Task 7: Done writes the lines and leaves. */}
        <Button size="sm" disabled={!payer || readyCount === 0}>
          Done
        </Button>
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bill-payer">Paid by</Label>
          <Select value={payer} onValueChange={setPayer}>
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
          <MoneyInput id="bill-total" value={total} unit={unit} onChange={setTotal} />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
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

      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <BillLineCard
            key={line.key}
            line={line}
            billPeople={billPeople}
            knownNames={knownNames}
            unit={unit}
            onChange={(next) => updateLine(line.key, next)}
            onAddPerson={addPerson}
            onAdjust={() => adjustLine(line.key)}
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
    </div>
  )
}
