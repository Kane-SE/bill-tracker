import type { WipCard } from '@/apps/hub/lib/types'
import { splitLines } from '@/apps/hub/lib/text'
import { isIsoDate } from '@/apps/hub/lib/dates'

const TITLE = /^#\s+NOW\s+[—–-]\s+(.+)$/
const FIELD = /^([A-Za-z][A-Za-z &]*?):\s*(.*)$/

/** Parse one `now/<project>.md` note written by the wrap skill. Unknown keys are ignored. */
export function parseNowNote(file: string, text: string): WipCard {
  const fields = new Map<string, string>()
  let project: string | null = null

  for (const raw of splitLines(text).lines) {
    const line = raw.trim()
    const title = line.match(TITLE)
    if (title) {
      project ??= title[1].trim()
      continue
    }
    const field = line.match(FIELD)
    if (field && !fields.has(field[1].toLowerCase())) fields.set(field[1].toLowerCase(), field[2].trim())
  }

  const value = (key: string): string | null => {
    const v = fields.get(key)
    return v && v !== '—' && v !== '-' ? v : null
  }

  let lastWorked: string | null = null
  let machine: string | null = null
  const lastWorkedRaw = value('last worked')
  if (lastWorkedRaw) {
    const [date, ...rest] = lastWorkedRaw.split('·').map((s) => s.trim())
    lastWorked = isIsoDate(date) ? date : null
    machine = rest.join(' · ') || null
  }

  const waitingOnMe = value('waiting on me')
  const waitingSince = waitingOnMe
    ? (waitingOnMe.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? lastWorked)
    : null
  const inFlightRaw = value('in flight')

  return {
    file,
    project: project ?? file.split('/').pop()!.replace(/\.md$/, ''),
    lastWorked,
    machine,
    nextAction: value('next action'),
    waitingOnMe,
    waitingSince,
    waitingOnOthers: value('waiting on others'),
    inFlight: inFlightRaw ? inFlightRaw.split(' · ').map((s) => s.trim()).filter(Boolean) : [],
  }
}
