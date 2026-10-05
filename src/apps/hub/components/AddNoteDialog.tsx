import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

interface Props {
  ideaId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddNoteDialog({ ideaId, open, onOpenChange }: Props) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNote('')
    setError(null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!note.trim()) {
      setError('Write what happened')
      return
    }
    setSaving(true)
    try {
      await useHubStore.getState().addNote(getHubClient(), ideaId, note, localDate(new Date()))
      toast.success('Note added')
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
            <DialogTitle>Add note</DialogTitle>
            <DialogDescription>Added to this idea's progress with today's date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="idea-note-text">Note</Label>
            <Input
              id="idea-note-text"
              autoFocus
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'idea-note-error' : undefined}
            />
            {error && (
              <p id="idea-note-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
