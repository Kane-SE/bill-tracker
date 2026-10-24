import type { CatalogMeta } from '@/apps/pump/data/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

const shortRef = (ref: string) => (/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref)
const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Data version, sources and credits (spec §Licensing). */
export function AboutDialog({ open, meta, onClose }: { open: boolean; meta: CatalogMeta; onClose(): void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>About this data</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          {meta.game} v{meta.patch} · built {formatDay(meta.builtAt)}
        </p>
        <ul className="space-y-1 text-sm">
          {meta.sources.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                {s.name}
              </a>{' '}
              <span className="text-muted-foreground">· {shortRef(s.ref)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Chart data: Pump Out (Haru-kaze, AnyhowStep) and pumpout-db-updates (aaaaaa2493). Skill tags are computed from
          piucenter.com&apos;s step analysis (maxwshen), via PIU Scores (DrMurloc). Gimmick tags come from official title lists.
        </p>
        <p className="text-sm text-muted-foreground">Not affiliated with Andamiro.</p>
      </DialogContent>
    </Dialog>
  )
}
