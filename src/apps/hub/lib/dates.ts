/** Local-calendar date helpers. Dates in notes are YYYY-MM-DD in the user's own time zone. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86_400_000

export function isIsoDate(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function localDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Whole calendar days from `fromIso` to `to` (negative if `fromIso` is in the future). */
export function daysBetween(fromIso: string, to: Date): number {
  const start = parseIso(fromIso)
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

export function formatDay(iso: string, today: Date): string {
  const days = daysBetween(iso, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const d = parseIso(iso)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

export function formatStamp(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mi}`
}

export function relativeTime(ms: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - ms)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h ago`
  return formatStamp(ms)
}
