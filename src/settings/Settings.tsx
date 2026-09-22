import { useRef, useState } from 'react'
import { Download, Moon, Sun, Upload } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { downloadJson, readFileAsText } from '@/shared/lib/file'
import { applyBackup, buildBackup, parseBackup } from '@/settings/backup'
import { applyTheme, DEFAULT_CUSTOM, getStoredTheme, PALETTES, type Palette, type ThemeChoice } from '@/shared/lib/theme'
import { CustomPaletteDialog } from '@/settings/CustomPaletteDialog'
import type { CustomColors } from '@/shared/lib/palette'
import { toast } from 'sonner'

export function Settings() {
  const [theme, setTheme] = useState<ThemeChoice>(getStoredTheme)
  const [customOpen, setCustomOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function updateTheme(next: ThemeChoice) {
    applyTheme(next)
    setTheme(next)
  }

  function toggleMode() {
    updateTheme({ ...theme, mode: theme.mode === 'dark' ? 'light' : 'dark' })
  }

  function selectPalette(palette: Palette) {
    if (palette === 'custom' && !theme.custom) {
      updateTheme({ ...theme, palette, custom: DEFAULT_CUSTOM })
      return
    }
    updateTheme({ ...theme, palette })
  }

  function handleExport() {
    downloadJson(`split-backup-${new Date().toISOString().slice(0, 10)}.json`, buildBackup())
    toast.success('Backup downloaded')
  }

  async function handleImportFile(file: File) {
    try {
      const text = await readFileAsText(file)
      const result = parseBackup(text)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      applyBackup(result.data)
      if (result.data.appearance) setTheme(result.data.appearance)
      toast.success('Backup restored')
    } catch {
      toast.error('Could not read that file.')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title="Settings" backTo="/" />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Pick a color palette and light/dark mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="palette">Palette</Label>
            <Select value={theme.palette} onValueChange={(v) => selectPalette(v as Palette)}>
              <SelectTrigger id="palette">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PALETTES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {theme.palette === 'custom' ? (
            <div className="space-y-1.5">
              <Label>Colors</Label>
              <Button variant="outline" className="w-full" onClick={() => setCustomOpen(true)}>
                Customize colors
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Button variant="outline" className="w-full justify-between" onClick={toggleMode}>
                <span className="flex items-center gap-2">
                  {theme.mode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme.mode === 'dark' ? 'Dark' : 'Light'}
                </span>
                <span className="text-xs text-muted-foreground">Tap to switch</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomPaletteDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        initial={theme.custom ?? DEFAULT_CUSTOM}
        onSave={(custom: CustomColors) => updateTheme({ ...theme, palette: 'custom', custom })}
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">Backup</CardTitle>
          <CardDescription>
            Your data lives only in this browser. Export a file to back it up or move to another
            device.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
        </CardContent>
      </Card>

      <p className="px-1 text-center text-xs text-muted-foreground">Split · offline-first PWA</p>
    </div>
  )
}
