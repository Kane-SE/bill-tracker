import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Combobox } from '@/shared/components/Combobox'
import { cn } from '@/shared/lib/utils'

interface ParticipantEditorProps {
  participants: string[]
  knownNames: string[]
  onChange: (names: string[]) => void
}

export function ParticipantEditor({ participants, knownNames, onChange }: ParticipantEditorProps) {
  const [draft, setDraft] = React.useState('')

  const suggestions = knownNames.filter(
    (n) => !participants.some((p) => p.toLowerCase() === n.toLowerCase()),
  )

  function add(raw: string) {
    const name = raw.trim()
    if (!name) return
    if (!participants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      onChange([...participants, name])
    }
    setDraft('')
  }

  function remove(name: string) {
    onChange(participants.filter((p) => p !== name))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Combobox
          value={draft}
          onValueChange={setDraft}
          onSelect={add}
          suggestions={suggestions}
          placeholder="Add a name…"
          aria-label="Add a name"
        />
        <Button type="button" size="icon" variant="secondary" onClick={() => add(draft)} aria-label="Add name">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {participants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {participants.map((name) => (
            <Badge key={name} variant="secondary" className={cn('gap-1 py-1 pl-3 pr-1.5 text-sm font-medium')}>
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="rounded-full p-0.5 hover:bg-background/60"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No one added yet.</p>
      )}
    </div>
  )
}
