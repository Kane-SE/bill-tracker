import type { ForYou, WipCard } from '@/apps/hub/lib/types'
import { splitLines } from '@/apps/hub/lib/text'
import { isIsoDate } from '@/apps/hub/lib/dates'

const TITLE = /^#\s+NOW\s+[—–-]\s+(.+)$/
const SECTION = /^##\s+(.+?)\s*$/
const FIELD = /^([A-Za-z][A-Za-z &]*?):\s*(.*)$/
const FOR_YOU = 'for you'

const isEmpty = (v: string | undefined): v is undefined => !v || v === '—' || v === '-'
const items = (v: string | undefined): string[] => (isEmpty(v) ? [] : v.split(' · ').map((s) => s.trim()).filter(Boolean))

/**
 * Parse one `now/<project>.md` note written by the wrap skill. Unknown keys are ignored.
 * Lines under `## For you` fill `forYou`; every other field line (under `## For Claude`, or in a note
 * with no sections) fills the rest.
 */
export function parseNowNote(file: string, text: string): WipCard {
  const fields = new Map<string, string>()
  const forYouFields = new Map<string, string>()
  let project: string | null = null
  let section: string | null = null
  let hasForYou = false

  for (const raw of splitLines(text).lines) {
    const line = raw.trim()
    const title = line.match(TITLE)
    if (title) {
      project ??= title[1].trim()
      continue
    }
    const heading = line.match(SECTION)
    if (heading) {
      section = heading[1].toLowerCase()
      if (section === FOR_YOU) hasForYou = true
      continue
    }
    const field = line.match(FIELD)
    if (!field) continue
    const target = section === FOR_YOU ? forYouFields : fields
    const key = field[1].toLowerCase()
    if (!target.has(key)) target.set(key, field[2].trim())
  }

  const value = (key: string): string | null => {
    const v = fields.get(key)
    return isEmpty(v) ? null : v
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

  let forYou: ForYou | null = null
  if (hasForYou) {
    const next = forYouFields.get('next')
    const blocked = forYouFields.get('blocked')
    forYou = {
      next: isEmpty(next) ? null : next,
      then: items(forYouFields.get('then')),
      blocked: isEmpty(blocked) ? null : blocked,
    }
  }

  return {
    file,
    project: project ?? file.split('/').pop()!.replace(/\.md$/, ''),
    lastWorked,
    machine,
    nextAction: value('next action'),
    waitingOnMe,
    waitingSince,
    waitingOnOthers: value('waiting on others'),
    inFlight: items(fields.get('in flight')),
    plans: value('plans & decisions'),
    forYou,
  }
}
