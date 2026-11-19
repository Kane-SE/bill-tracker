import { useMemo } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Initial } from '@/apps/split/components/PersonFilter'
import { buildOwedToMe, owedToMeTsv } from '@/apps/split/lib/excel'
import { formatMoney } from '@/apps/split/lib/format'
import { useMe } from '@/apps/split/store/useMe'
import { copyText } from '@/shared/lib/clipboard'
import { cn } from '@/shared/lib/utils'
import type { Night } from '@/apps/split/types'

interface ExcelCopySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nights: Night[] // all Nomnoms; only active ones count
  names: string[] // everyone who took part in any Nomnom, alphabetical
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Bottom sheet: pick who you are, then copy who owes you as a paste-ready Excel table. */
export function ExcelCopySheet({ open, onOpenChange, nights, names }: ExcelCopySheetProps) {
  const saved = useMe((s) => s.me)
  const setMe = useMe((s) => s.setMe)
  const me = saved != null && names.includes(saved) ? saved : null
  const sheet = useMemo(() => (me ? buildOwedToMe(nights, me) : null), [nights, me])

  async function copy() {
    if (!sheet) return
    if (await copyText(owedToMeTsv(sheet))) {
      toast.success('Copied. Paste it into Excel.')
      onOpenChange(false)
    } else {
      toast.error("Couldn't copy. Try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy for Excel</DialogTitle>
          <DialogDescription>Who are you? Your pick is remembered on this device.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-1">
          {names.map((name) => (
            <li key={name}>
              <button
                type="button"
                aria-pressed={me === name}
                onClick={() => setMe(name)}
                className={cn('flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', me === name && 'bg-accent/50')}
              >
                <Initial name={name} active={me === name} />
                <span className="flex-1 text-sm font-semibold">{name}</span>
                {me === name && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>

        <p className="text-sm text-muted-foreground">
          {!sheet ? (
            'Pick your name to see who owes you.'
          ) : sheet.people.length === 0 ? (
            'Nobody owes you right now.'
          ) : (
            <>
              {plural(sheet.people.length, 'person owes', 'people owe')} you{' '}
              <b className="text-foreground">{formatMoney(sheet.total)}</b> across{' '}
              {plural(sheet.nomnomCount, 'Nomnom', 'Nomnoms')}
            </>
          )}
        </p>

        <Button size="lg" className="w-full" disabled={!sheet || sheet.people.length === 0} onClick={copy}>
          <Copy className="h-5 w-5" />
          Copy
        </Button>
      </DialogContent>
    </Dialog>
  )
}
