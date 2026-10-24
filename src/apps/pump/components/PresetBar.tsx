import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Preset } from '@/apps/pump/store/usePumpStore'
import { Chip } from '@/apps/pump/components/Chip'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface PresetBarProps {
  presets: Preset[]
  /** serializeFilters() of what is applied now (no search text) */
  activeQuery: string
  defaultName: string
  full: boolean
  onApply(p: Preset): void
  onSave(name: string): void
  onDelete(id: string): void
}

/** Saved filters: tap to apply; "Save current" names the current filters; Edit shows ✕ to delete. */
export function PresetBar({ presets, activeQuery, defaultName, full, onApply, onSave, onDelete }: PresetBarProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState<string | null>(null)

  if (name !== null) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(name.trim() || defaultName)
          setName(null)
        }}
      >
        <Input autoFocus aria-label="Preset name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={() => setName(null)}>
          Cancel
        </Button>
      </form>
    )
  }

  return (
    <section aria-label="Presets" className="space-y-1">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
        {presets.map((p) =>
          editing ? (
            <Chip key={p.id} active label={`Delete preset ${p.name}`} onClick={() => onDelete(p.id)}>
              {p.name}
              <X className="h-3.5 w-3.5" aria-hidden />
            </Chip>
          ) : (
            <Chip key={p.id} pressed={p.query === activeQuery} onClick={() => onApply(p)}>
              {p.name}
            </Chip>
          ),
        )}
        {!editing && (
          <Chip onClick={() => setName(full ? null : defaultName)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Save current
          </Chip>
        )}
        {presets.length > 0 && <Chip onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</Chip>}
      </div>
      {full && !editing && <p className="text-xs text-muted-foreground">12 presets is the limit. Edit to delete one first.</p>}
    </section>
  )
}
