import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { getHubClient } from '@/apps/hub/github/instance'
import { localDate } from '@/apps/hub/lib/dates'
import { describeError, useHubStore } from '@/apps/hub/store/useHubStore'

export function NewIdeaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setNote('')
    setError(null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the idea a title')
      return
    }
    setSaving(true)
    try {
      const result = await useHubStore.getState().addIdea(getHubClient(), { title, note }, localDate(new Date()))
      toast.success(result === 'saved' ? 'Idea saved' : "Saved on this phone — it syncs when you're back online")
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
            <DialogTitle>New idea</DialogTitle>
            <DialogDescription>Saved to ideas.md in personal-hub.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="idea-title">Title</Label>
            <Input
              id="idea-title"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'idea-title-error' : undefined}
            />
            {error && (
              <p id="idea-title-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="idea-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="idea-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save idea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
