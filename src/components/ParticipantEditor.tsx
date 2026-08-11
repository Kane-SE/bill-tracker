import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ParticipantEditorProps {
  participants: string[]
  knownNames: string[]
  onChange: (names: string[]) => void
}

/**
 * Edit the list of people for a night: type a name (with autocomplete from the
 * common-names list) and add it, or remove existing chips. Names are matched
 * case-insensitively to avoid accidental duplicates that would split balances.
 */
export function ParticipantEditor({ participants, knownNames, onChange }: ParticipantEditorProps) {
  const [draft, setDraft] = React.useState('')
  const listId = React.useId()

  const suggestions = knownNames.filter(
    (n) => !participants.some((p) => p.toLowerCase() === n.toLowerCase()),
  )

  function add() {
    const name = draft.trim()
    if (!name) return
    if (participants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...participants, name])
    setDraft('')
  }

  function remove(name: string) {
    onChange(participants.filter((p) => p !== name))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          list={listId}
          placeholder="Add a name…"
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <datalist id={listId}>
          {suggestions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Button type="button" size="icon" variant="secondary" onClick={add} aria-label="Add name">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {participants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {participants.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className={cn('gap-1 py-1 pl-3 pr-1.5 text-sm font-medium')}
            >
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
