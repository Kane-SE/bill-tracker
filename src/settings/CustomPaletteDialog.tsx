import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import type { CustomColors } from '@/shared/lib/palette'

const FIELDS: { key: keyof CustomColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'The main screen color behind everything' },
  { key: 'foreground', label: 'Text', hint: 'The main text color' },
  { key: 'primary', label: 'Buttons & highlights', hint: 'Primary buttons and active accents' },
  { key: 'accent', label: 'Accents', hint: 'Selected rows and soft highlights' },
  { key: 'destructive', label: 'Owed / Delete', hint: 'Money owed, delete, warnings (usually red)' },
  { key: 'success', label: 'Settled / Paid', hint: 'Settled and positive actions (usually green)' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: CustomColors
  onSave: (colors: CustomColors) => void
}

export function CustomPaletteDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [colors, setColors] = useState<CustomColors>(initial)

  function set(key: keyof CustomColors, value: string) {
    setColors((c) => ({ ...c, [key]: value }))
  }

  function exportPalette() {
    const blob = new Blob([JSON.stringify({ name: 'Custom', colors }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'palette.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importPalette(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const c = parsed?.colors ?? parsed
      const next: CustomColors = {
        background: c.background, foreground: c.foreground, primary: c.primary,
        accent: c.accent, destructive: c.destructive, success: c.success,
      }
      if (Object.values(next).every((v) => /^#?[0-9a-fA-F]{6}$/.test(String(v)))) {
        setColors(next)
      }
    } catch { /* ignore malformed palette files */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize colors</DialogTitle>
          <DialogDescription>Pick a color for each part of the app.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="block">{f.label}</Label>
                <p className="truncate text-xs text-muted-foreground">{f.hint}</p>
              </div>
              <input
                type="color"
                value={colors[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                aria-label={f.label}
                className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              />
            </div>
          ))}
        </div>

        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Advanced: import / export palette file</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exportPalette}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
              <Upload className="h-4 w-4" /> Import
              <input
                type="file" accept="application/json,.json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importPalette(f); e.target.value = '' }}
              />
            </label>
          </div>
        </details>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(colors); onOpenChange(false) }}>Apply colors</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
