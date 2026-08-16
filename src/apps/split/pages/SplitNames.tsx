import { useState } from 'react'
import { Plus, UserRound, X } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { useSplitStore } from '@/apps/split/store/useSplitStore'

export function SplitNames() {
  const knownNames = useSplitStore((s) => s.knownNames)
  const addKnownName = useSplitStore((s) => s.addKnownName)
  const removeKnownName = useSplitStore((s) => s.removeKnownName)

  const [draft, setDraft] = useState('')

  function addName() {
    const name = draft.trim()
    if (!name) return
    addKnownName(name)
    setDraft('')
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title="Common names" backTo="/split" />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">Common names</CardTitle>
          <CardDescription>
            Suggested when adding people to a night. Add the friends you hang out with often.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={draft}
              placeholder="Add a name…"
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addName()
                }
              }}
            />
            <Button type="button" size="icon" variant="secondary" onClick={addName} aria-label="Add name">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {knownNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {knownNames.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1 py-1 pl-3 pr-1.5 text-sm">
                  {name}
                  <button
                    type="button"
                    onClick={() => removeKnownName(name)}
                    className="rounded-full p-0.5 hover:bg-background/60"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4" />
              No common names yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
