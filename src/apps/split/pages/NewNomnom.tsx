import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { ParticipantEditor } from '@/apps/split/components/ParticipantEditor'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { toast } from 'sonner'

export function NewNomnom() {
  const navigate = useNavigate()
  const addNight = useSplitStore((s) => s.addNight)
  const knownNames = useSplitStore((s) => s.knownNames)

  const [title, setTitle] = useState('')
  const [participants, setParticipants] = useState<string[]>([])

  const canCreate = title.trim().length > 0 || participants.length > 0

  function create() {
    if (!canCreate) return
    const id = addNight({ title: title.trim() || undefined, participants })
    toast.success('Nomnom created')
    navigate(`/split/night/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <PageHeader title="New Nomnom" backTo="/split" />

      <div className="mb-5 space-y-1.5">
        <Label htmlFor="new-title">Nomnom name (optional)</Label>
        <Input
          id="new-title"
          value={title}
          placeholder="e.g. Sat night out — or leave blank for today's date"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">People</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantEditor participants={participants} knownNames={knownNames} onChange={setParticipants} />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button size="lg" className="w-full" onClick={create} disabled={!canCreate}>
            <Check className="h-5 w-5" />
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
