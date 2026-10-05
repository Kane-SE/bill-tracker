import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'
import { STAGE_LABEL } from '@/apps/hub/components/StageBadge'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

interface Props {
  idea: Idea
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MoveStageDialog({ idea, open, onOpenChange }: Props) {
  const [stage, setStage] = useState<Stage>(idea.stage)
  const [why, setWhy] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStage(idea.stage)
    setWhy('')
  }, [open, idea.stage])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (stage === idea.stage) return
    setSaving(true)
    try {
      await useHubStore.getState().moveStage(getHubClient(), idea.id, stage, localDate(new Date()), why)
      toast.success(`Moved to ${STAGE_LABEL[stage].toLowerCase()}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(describeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Move stage</DialogTitle>
            <DialogDescription>Dropped ideas stay in ideas.md; nothing is deleted.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Stage" className="overflow-hidden rounded-lg border border-border">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stage === s}
                onClick={() => setStage(s)}
                className={cn('flex h-11 w-full items-center justify-between border-b border-border px-3 text-left text-sm last:border-b-0 hover:bg-foreground/5', stage === s && 'font-medium')}
              >
                {STAGE_LABEL[s]}
                {s === idea.stage && <span className="ml-2 text-xs text-muted-foreground">current</span>}
                {stage === s && <Check className="ml-auto h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-why">
              Why <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="stage-why" value={why} onChange={(e) => setWhy(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || stage === idea.stage}>
              {saving ? 'Saving…' : 'Move'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
