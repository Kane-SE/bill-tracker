import { useEffect, useRef } from 'react'
import { SERIES, SKILLS, SONG_TYPES, type Mode } from '@/apps/pump/data/types'
import { defaultFilters, toggleValue, withSteamLink, type FacetCounts, type Filters } from '@/apps/pump/lib/filters'
import { MODE_LABEL, SONG_TYPE_LABEL } from '@/apps/pump/lib/labels'
import type { Preset } from '@/apps/pump/store/usePumpStore'
import { AnyAllSwitch } from '@/apps/pump/components/AnyAllSwitch'
import { FacetGroup } from '@/apps/pump/components/FacetGroup'
import { LevelGrid } from '@/apps/pump/components/LevelGrid'
import { PresetBar } from '@/apps/pump/components/PresetBar'
import { SheetGrabber } from '@/apps/pump/components/SheetGrabber'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

type Flag = 'tc' | 'sl' | 'np'

interface FilterSheetProps {
  open: boolean
  /** the sheet param: '1', or 'level' to scroll to the level grid */
  focus: string | null
  onClose(): void
  filters: Filters
  onChange(f: Filters): void
  counts: FacetCounts
  resultCount: number
  levels: number[]
  presets: Preset[]
  activeQuery: string
  defaultPresetName: string
  presetsFull: boolean
  onApplyPreset(p: Preset): void
  onSavePreset(name: string): void
  onDeletePreset(id: string): void
}

/** Every facet, applied live; the footer button shows the live count and closes. */
export function FilterSheet(props: FilterSheetProps) {
  const { open, focus, onClose, filters: f, onChange, counts } = props
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (open && focus === 'level') {
      requestAnimationFrame(() => document.getElementById('facet-level')?.scrollIntoView({ block: 'start' }))
    }
  }, [open, focus])

  const modes: Mode[] = f.steamLink ? ['S', 'D', 'HDB'] : ['S', 'D']
  const flags: Flag[] = [...(f.titleOnly ? ['tc' as const] : []), ...(f.steamLink ? ['sl' as const] : []), ...(f.hidePremium ? ['np' as const] : [])]
  const toggleFlag = (flag: Flag) =>
    onChange(flag === 'sl' ? withSteamLink(f, !f.steamLink) : flag === 'tc' ? { ...f, titleOnly: !f.titleOnly } : { ...f, hidePremium: !f.hidePremium })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="gap-5 pb-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <SheetGrabber onDismiss={onClose} />
        <div className="-mt-3 flex items-center gap-2 pr-10">
          <DialogTitle ref={titleRef} tabIndex={-1} className="flex-1 outline-none">
            Filters
          </DialogTitle>
          <Button variant="ghost" onClick={() => onChange({ ...defaultFilters, q: f.q })}>
            Reset
          </Button>
        </div>

        <PresetBar
          presets={props.presets}
          activeQuery={props.activeQuery}
          defaultName={props.defaultPresetName}
          full={props.presetsFull}
          onApply={props.onApplyPreset}
          onSave={props.onSavePreset}
          onDelete={props.onDeletePreset}
        />

        <FacetGroup
          id="mode"
          label="Mode · any of"
          options={modes.map((m) => ({ value: m, label: MODE_LABEL[m], count: counts.modes[m] }))}
          selected={f.modes}
          onToggle={(m) => onChange({ ...f, modes: toggleValue(f.modes, m) })}
        />

        <LevelGrid levels={props.levels} value={f.level} onChange={(level) => onChange({ ...f, level })} />

        <FacetGroup
          id="skills"
          label={`Skills · ${f.skillsAll ? 'all of' : 'any of'}`}
          options={SKILLS.map((s) => ({ value: s, label: s, count: counts.skills[s] }))}
          selected={f.skills}
          onToggle={(s) => onChange({ ...f, skills: toggleValue(f.skills, s) })}
        >
          <AnyAllSwitch all={f.skillsAll} onChange={(skillsAll) => onChange({ ...f, skillsAll })} />
        </FacetGroup>

        <FacetGroup
          id="type"
          label="Song type · any of"
          options={SONG_TYPES.map((t) => ({ value: t, label: SONG_TYPE_LABEL[t], count: counts.types[t] }))}
          selected={f.types}
          onToggle={(t) => onChange({ ...f, types: toggleValue(f.types, t) })}
        />

        <FacetGroup
          id="version"
          label="Version · any of"
          scroll
          options={SERIES.map((s) => ({ value: s, label: s, count: counts.series[s] }))}
          selected={f.series}
          onToggle={(s) => onChange({ ...f, series: toggleValue(f.series, s) })}
        />

        <FacetGroup
          id="more"
          label="More"
          options={[
            { value: 'tc', label: 'Title charts only' },
            { value: 'sl', label: 'Show Steam Link charts' },
            { value: 'np', label: 'Hide Premium-mode charts' },
          ]}
          selected={flags}
          onToggle={toggleFlag}
        />

        <div className="sticky bottom-0 -mx-5 border-t border-border bg-card px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <Button className="w-full" onClick={onClose}>
            Show {props.resultCount.toLocaleString()} charts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
