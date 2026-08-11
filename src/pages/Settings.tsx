import { useRef, useState } from 'react'
import { Download, Moon, Plus, Sun, Upload, UserRound, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { downloadBackup, parseBackup, readFileAsText } from '@/lib/storage'
import { applyTheme, getStoredTheme, PALETTES, type Palette, type ThemeChoice } from '@/lib/theme'
import { toast } from 'sonner'

export function Settings() {
  const knownNames = useAppStore((s) => s.knownNames)
  const addKnownName = useAppStore((s) => s.addKnownName)
  const removeKnownName = useAppStore((s) => s.removeKnownName)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)

  const [draft, setDraft] = useState('')
  const [theme, setTheme] = useState<ThemeChoice>(getStoredTheme)
  const fileRef = useRef<HTMLInputElement>(null)

  function addName() {
    const name = draft.trim()
    if (!name) return
    addKnownName(name)
    setDraft('')
  }

  function updateTheme(next: ThemeChoice) {
    applyTheme(next)
    setTheme(next)
  }

  function toggleMode() {
    updateTheme({ ...theme, mode: theme.mode === 'dark' ? 'light' : 'dark' })
  }

  function selectPalette(palette: Palette) {
    updateTheme({ ...theme, palette })
  }

  function handleExport() {
    downloadBackup(exportData())
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
      importData(result.data)
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
        </CardContent>
      </Card>

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
